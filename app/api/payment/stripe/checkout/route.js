// POST /api/payment/stripe/checkout
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { error, serverError, validationError, success } from '@/lib/apiResponse'
import { validateOrder } from '@/lib/validate'
import { randomUUID } from 'crypto'
import Stripe from 'stripe'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Custom marker so the outer catch can tell an insufficient-stock abort
// (from inside the transaction) apart from an unexpected server error.
class InsufficientStockError extends Error {
  constructor(productName) {
    super(`"${productName}" no longer has enough stock`)
    this.name = 'InsufficientStockError'
  }
}

export async function POST(req) {
  if (!STRIPE_KEY || STRIPE_KEY === 'sk_test_placeholder') {
    return error('Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local', 503)
  }

  const stripe = new Stripe(STRIPE_KEY)

  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const body             = await req.json()
    const validationErrors = validateOrder(body)
    if (validationErrors) return validationError(validationErrors)

    const { addressId, items, couponCode } = body

    const address = await prisma.address.findFirst({ where: { id: addressId, userId: user.id } })
    if (!address) return error('Invalid delivery address')

    const productIds = items.map(i => i.productId)
    const products    = await prisma.product.findMany({
      where:   { id: { in: productIds }, isActive: true },
      include: {
        store: {
          select: { id: true, isActive: true, name: true, shippingFee: true, freeShippingThreshold: true, commission: true, userId: true },
        },
      },
    })
    if (products.length !== productIds.length) return error('One or more products unavailable')

    // Early friendly check (non-atomic; the real guarantee happens inside the
    // transaction below via a conditional decrement, per item 10).
    for (const item of items) {
      const product = products.find(p => p.id === item.productId)
      if (!product.inStock || product.stockCount < item.quantity) {
        return error(`"${product.name}" has insufficient stock`)
      }
      if (!product.store.isActive) {
        return error(`Store for "${product.name}" is not active`)
      }
      if (product.store.userId === user.id) {
        return error(`You can't purchase your own store's product: "${product.name}"`)
      }
    }

    // ── Group items by store ────────────────────────────────────────────
    const groups = new Map() // storeId -> { store, items: [{item, product}], subtotal }
    for (const item of items) {
      const product = products.find(p => p.id === item.productId)
      const storeId = product.store.id
      if (!groups.has(storeId)) {
        groups.set(storeId, { store: product.store, entries: [], subtotal: 0 })
      }
      const group = groups.get(storeId)
      group.entries.push({ item, product })
      group.subtotal += product.price * item.quantity
    }

    const cartSubtotal = [...groups.values()].reduce((sum, g) => sum + g.subtotal, 0)

    // ── Coupon (checked, not incremented — incremented once on confirmed
    // payment in the webhook, per item 11) ─────────────────────────────
    const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true } })
    const userPlan = fullUser?.plan || 'FREE'

    let couponData = null
    let cartDiscount = 0
    let discountBase = 0
    if (couponCode) {
      couponData = await prisma.coupon.findFirst({
        where: { code: couponCode.toUpperCase(), expiresAt: { gte: new Date() } },
      })
      if (!couponData) return error('Invalid or expired coupon code')
      if (couponData.usageCount >= couponData.usageLimit) {
        return error('Coupon usage limit reached')
      }
      if (couponData.newUsersOnly) {
        const priorOrders = await prisma.order.count({ where: { userId: user.id, isPaid: true } })
        if (priorOrders > 0) return error('This coupon is only valid for new users')
      }
      if (couponData.allowedPlans.length > 0 && !couponData.allowedPlans.includes(userPlan)) {
        return error('This coupon is not valid for your plan')
      }

      discountBase = couponData.category
        ? [...groups.values()].reduce((sum, g) =>
            sum + g.entries.filter(({ product }) => product.category === couponData.category)
                          .reduce((s, { item, product }) => s + product.price * item.quantity, 0), 0)
        : cartSubtotal
      cartDiscount = (couponData.discount / 100) * discountBase
    }

    // ── Per-store shipping + pro-rated discount (items 1, 6) ────────────
    const orderGroupId = randomUUID()
    const lineItems = []
    const storeGroupPlans = []

    for (const [storeId, group] of groups) {
      let storeDiscount = 0
      if (couponData) {
        if (couponData.category) {
          const eligibleSubtotal = group.entries
            .filter(({ product }) => product.category === couponData.category)
            .reduce((s, { item, product }) => s + product.price * item.quantity, 0)
          const storeShareOfEligible = discountBase > 0 ? eligibleSubtotal / discountBase : 0
          storeDiscount = cartDiscount * storeShareOfEligible
        } else {
          const shareOfCart = cartSubtotal > 0 ? group.subtotal / cartSubtotal : 0
          storeDiscount = cartDiscount * shareOfCart
        }
      }

      const shippingCost =
        group.store.freeShippingThreshold != null && group.subtotal >= group.store.freeShippingThreshold
          ? 0
          : group.store.shippingFee || 0

      const storeTotal = Math.max(0, group.subtotal - storeDiscount + shippingCost)

      const eligibleSubtotal = couponData?.category
        ? group.entries.filter(({ product }) => product.category === couponData.category)
            .reduce((s, { item, product }) => s + product.price * item.quantity, 0)
        : group.subtotal

      const orderMeta = group.entries.map(({ item, product }) => {
        const lineTotal = product.price * item.quantity
        const isEligible = !couponData || !couponData.category || product.category === couponData.category
        const itemDiscountShare = (couponData && isEligible && eligibleSubtotal > 0)
          ? Math.round((storeDiscount * (lineTotal / eligibleSubtotal)) * 100) / 100
          : 0
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          name: product.name,
          image: typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.src || '',
          discountShare: itemDiscountShare,
        }
      })

      for (const { item, product } of group.entries) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              images: product.images.slice(0, 1).map(img => typeof img === 'string' ? img : img?.src || '').filter(u => u.startsWith('http')),
            },
            unit_amount: Math.round(product.price * 100),
          },
          quantity: item.quantity,
        })
      }

      if (shippingCost > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: { name: `Shipping — ${group.store.name}` },
            unit_amount: Math.round(shippingCost * 100),
          },
          quantity: 1,
        })
      }

      storeGroupPlans.push({
        storeId,
        subtotal: group.subtotal,
        discount: storeDiscount,
        shippingCost,
        total: storeTotal,
        orderMeta,
        entries: group.entries,
      })
    }

    // ── Reserve stock + create per-store orders, atomically ─────────────
    let createdOrders
    try {
      createdOrders = await prisma.$transaction(async (tx) => {
        const orders = []

        for (const plan of storeGroupPlans) {
          // Conditional atomic decrement per product — only succeeds if
          // enough stock remains right now. This is the actual fix for the
          // overselling race (item 10), replacing the non-atomic pre-check.
          for (const { item, product } of plan.entries) {
            const result = await tx.product.updateMany({
              where: { id: item.productId, stockCount: { gte: item.quantity } },
              data:  { stockCount: { decrement: item.quantity } },
            })
            if (result.count === 0) {
              throw new InsufficientStockError(product.name)
            }
            const updated = await tx.product.findUnique({
              where: { id: item.productId },
              select: { stockCount: true },
            })
            if (updated.stockCount <= 0) {
              await tx.product.update({ where: { id: item.productId }, data: { inStock: false } })
            }
          }

          const order = await tx.order.create({
            data: {
              total: plan.total,
              subtotal: plan.subtotal,
              discount: plan.discount,
              shippingCost: plan.shippingCost,
              userId: user.id,
              storeId: plan.storeId,
              orderGroupId,
              addressId,
              paymentMethod: 'STRIPE',
              paymentStatus: 'PENDING',
              isCouponUsed: !!couponData,
              couponCode: couponData?.code || null,
              couponDiscount: plan.discount,
              estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
              orderItems: { create: plan.orderMeta },
            },
          })

          await tx.orderStatusHistory.create({
            data: { orderId: order.id, status: 'PENDING', note: 'Stripe checkout initiated' },
          })

          await tx.transaction.create({
            data: {
              orderId: order.id,
              amount: plan.total,
              method: 'STRIPE',
              status: 'PENDING',
            },
          })

          orders.push(order)
        }

        return orders
      })
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        return null // handled below
      }
      throw err
    }

    if (!createdOrders) {
      return error('One or more items sold out while you were checking out. Please review your cart.')
    }

    // ── Build ONE Stripe Checkout Session across all stores ─────────────
    const sessionPayload = {
      payment_method_types: ['card'],
      line_items:           lineItems,
      mode:                 'payment',
      metadata:              { orderGroupId, userId: user.id },
      success_url:          `${APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_group=${orderGroupId}`,
      cancel_url:           `${APP_URL}/cart?cancelled=true`,
      customer_email:       user.email,
      // Shorter than Stripe's 24h default so reserved stock isn't locked
      // away from other buyers if the customer abandons checkout (item 10).
      expires_at: Math.floor(Date.now() / 1000) + 45 * 60,
    }

    if (cartDiscount > 0 && couponData) {
      const stripeCoupon = await stripe.coupons.create({
        percent_off: couponData.discount,
        duration:    'once',
        name:        couponData.code,
      })
      sessionPayload.discounts = [{ coupon: stripeCoupon.id }]
    }

    const session = await stripe.checkout.sessions.create(sessionPayload)

    await prisma.order.updateMany({
      where: { orderGroupId },
      data:  { stripeSessionId: session.id },
    })
    await prisma.transaction.updateMany({
      where: { orderId: { in: createdOrders.map(o => o.id) } },
      data:  { stripeSessionId: session.id },
    })

    return success({ sessionId: session.id, url: session.url, orderGroupId })
  } catch (err) {
    return serverError(err.message)
  }
}