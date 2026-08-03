// POST /api/orders — Place COD order
// GET  /api/orders — Get user's orders
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { success, error, validationError, serverError } from '@/lib/apiResponse'
import { validateOrder } from '@/lib/validate'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { randomUUID } from 'crypto'

class InsufficientStockError extends Error {
  constructor(productName) {
    super(`"${productName}" no longer has enough stock`)
    this.name = 'InsufficientStockError'
  }
}

class CouponLimitExceededError extends Error {
  constructor() {
    super('Coupon usage limit reached')
    this.name = 'CouponLimitExceededError'
  }
}

export async function GET(req) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: {
        address: true,
        store: { select: { id: true, name: true, username: true, logo: true } },
        orderItems: {
          include: { product: { select: { id: true, name: true, images: true, category: true } } }
        },
        transaction: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' }
    })
    return success({ orders })
  } catch (err) {
    return serverError(err.message)
  }
}

export async function POST(req) {
  try {
    const { error: authError, user } = await requireAuth(req)
    if (authError) return authError

    const body = await req.json()
    const validationErrors = validateOrder(body)
    if (validationErrors) return validationError(validationErrors)

    const { addressId, paymentMethod, items, couponCode } = body

    if (paymentMethod !== 'COD') {
      return error('Use /api/payment/stripe/checkout for Stripe payments', 400)
    }

    const address = await prisma.address.findFirst({ where: { id: addressId, userId: user.id } })
    if (!address) return error('Invalid delivery address', 400)

    const productIds = items.map(i => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { store: { select: { id: true, isActive: true, commission: true, shippingFee: true, freeShippingThreshold: true, userId: true } } }
    })

    if (products.length !== productIds.length) return error('One or more products not found or unavailable')

    for (const item of items) {
      const product = products.find(p => p.id === item.productId)
      if (!product.inStock) return error(`"${product.name}" is out of stock`)
      if (product.stockCount < item.quantity) return error(`Only ${product.stockCount} units of "${product.name}" available`)
      if (!product.store.isActive) return error(`Store for "${product.name}" is not active`)
      if (product.store.userId === user.id) return error(`You can't purchase your own store's product: "${product.name}"`)
    }

    // ── Group by store (item 1) ─────────────────────────────────────────
    const groups = new Map()
    for (const item of items) {
      const product = products.find(p => p.id === item.productId)
      const storeId = product.store.id
      if (!groups.has(storeId)) groups.set(storeId, { store: product.store, entries: [], subtotal: 0 })
      const group = groups.get(storeId)
      group.entries.push({ item, product })
      group.subtotal += product.price * item.quantity
    }
    const cartSubtotal = [...groups.values()].reduce((sum, g) => sum + g.subtotal, 0)

    const fullUser = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true } })
    const userPlan = fullUser?.plan || 'FREE'

    let couponData = null
    let cartDiscount = 0
    let discountBase = 0
    if (couponCode) {
      couponData = await prisma.coupon.findFirst({ where: { code: couponCode.toUpperCase(), expiresAt: { gte: new Date() } } })
      if (!couponData) return error('Invalid or expired coupon code')
      if (couponData.usageCount >= couponData.usageLimit) return error('Coupon usage limit reached')

      if (couponData.newUsersOnly) {
        const priorOrders = await prisma.order.count({ where: { userId: user.id, isPaid: true } })
        if (priorOrders > 0) return error('This coupon is only valid for new users')
      }
      if (couponData.allowedPlans.length > 0 && !couponData.allowedPlans.includes(userPlan)) {
        return error('This coupon is not valid for your plan')
      }

      // Category-restricted discount (item 4): compute against only the
      // matching-category subtotal, not the whole cart.
      discountBase = couponData.category
        ? [...groups.values()].reduce((sum, g) =>
            sum + g.entries.filter(({ product }) => product.category === couponData.category)
                          .reduce((s, { item, product }) => s + product.price * item.quantity, 0), 0)
        : cartSubtotal
      cartDiscount = (couponData.discount / 100) * discountBase
    }

    const estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    const orderGroupId = randomUUID()

    let createdOrders
    try {
      createdOrders = await prisma.$transaction(async (tx) => {
        const orders = []

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

          const orderItemsData = group.entries.map(({ item, product }) => {
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
              image: product.images[0] || '',
              discountShare: itemDiscountShare,
            }
          })

          for (const { item, product } of group.entries) {
            const result = await tx.product.updateMany({
              where: { id: item.productId, stockCount: { gte: item.quantity } },
              data: { stockCount: { decrement: item.quantity }, soldCount: { increment: item.quantity } },
            })
            if (result.count === 0) throw new InsufficientStockError(product.name)
            const updated = await tx.product.findUnique({ where: { id: item.productId }, select: { stockCount: true } })
            if (updated.stockCount <= 0) await tx.product.update({ where: { id: item.productId }, data: { inStock: false } })
          }

          const newOrder = await tx.order.create({
            data: {
              total: storeTotal,
              subtotal: group.subtotal,
              discount: storeDiscount,
              shippingCost,
              userId: user.id,
              storeId,
              orderGroupId,
              addressId,
              paymentMethod: 'COD',
              paymentStatus: 'PENDING',
              isCouponUsed: !!couponData,
              couponCode: couponData?.code || null,
              couponDiscount: storeDiscount,
              estimatedDelivery,
              orderItems: { create: orderItemsData },
            },
            include: {
              orderItems: { include: { product: { select: { name: true, images: true } } } },
              address: true,
            },
          })

          await tx.orderStatusHistory.create({ data: { orderId: newOrder.id, status: 'PENDING', note: 'Order placed' } })
          await tx.transaction.create({ data: { orderId: newOrder.id, amount: storeTotal, method: 'COD', status: 'PENDING' } })

          orders.push(newOrder)
        }

        // Once per checkout group, not once per store-split order (item 11),
        // and atomically re-verified against usageLimit (item 7b) to close
        // the over-redemption race under concurrent checkouts.
        if (couponData) {
          // Re-verify targeting conditions haven't changed since validate-time
          if (couponData.newUsersOnly) {
            const priorOrders = await tx.order.count({ where: { userId: user.id, isPaid: true } })
            if (priorOrders > 0) throw new CouponLimitExceededError()
          }
          if (couponData.allowedPlans.length > 0 && !couponData.allowedPlans.includes(userPlan)) {
            throw new CouponLimitExceededError()
          }
          const result = await tx.coupon.updateMany({
            where: { code: couponData.code, usageCount: { lt: couponData.usageLimit } },
            data: { usageCount: { increment: 1 } },
          })
          if (result.count === 0) throw new CouponLimitExceededError()
        }

        return orders
      })
    } catch (err) {
      if (err instanceof InsufficientStockError) return null
      if (err instanceof CouponLimitExceededError) return error('Coupon usage limit reached')
      throw err
    }

    if (createdOrders === null) {
      return error('One or more items sold out while you were checking out. Please review your cart.')
    }

    const userData = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true, name: true } })
    const combinedTotal = createdOrders.reduce((sum, o) => sum + o.total, 0)
    sendOrderConfirmationEmail({
      to: userData.email,
      name: userData.name,
      orderId: createdOrders[0].id,
      total: combinedTotal,
      items: createdOrders.flatMap(o => o.orderItems),
      estimatedDelivery,
    }).catch(() => {})

    return success({ orders: createdOrders, orderGroupId, message: 'Order placed successfully!' }, 201)
  } catch (err) {
    return serverError(err.message)
  }
}