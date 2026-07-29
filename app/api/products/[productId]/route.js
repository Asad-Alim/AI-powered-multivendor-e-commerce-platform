// GET /api/products/[productId]
// PUT /api/products/[productId]
// DELETE /api/products/[productId]
import { prisma } from '@/lib/prisma'
import { requireVendorOrAdmin } from '@/lib/middleware'
import { success, error, notFound, serverError, validationError } from '@/lib/apiResponse'
import { validateProduct, sanitizeString, sanitizePositiveNumber } from '@/lib/validate'

export async function GET(req, { params }) {
    try {
        const { productId } = await params
        const product = await prisma.product.findUnique({
            where: { id: productId, isActive: true },
            include: {
                store: { select: { id: true, name: true, username: true, logo: true, email: true } },
                rating: { include: { user: { select: { name: true, image: true } } }, orderBy: { createdAt: 'desc' } },
            }
        })
        if (!product) return notFound('Product not found')

        // Increment view count
        await prisma.product.update({ where: { id: productId }, data: { viewCount: { increment: 1 } } })

        return success({ product })
    } catch (err) {
        return serverError(err.message)
    }
}

export async function PUT(req, { params }) {
    try {
        const { error: authError, user } = await requireVendorOrAdmin(req)
        if (authError) return authError

        const { productId } = await params
        const body = await req.json()

        const product = await prisma.product.findUnique({ where: { id: productId }, select: { storeId: true, store: { select: { userId: true } } } })
        if (!product) return notFound('Product not found')
        if (product.store.userId !== user.id && user.role !== 'ADMIN') return error('Not authorized to edit this product', 403)

        const validationErrors = validateProduct(body)
        if (validationErrors) return validationError(validationErrors)

        const updated = await prisma.product.update({
            where: { id: productId },
            data: {
                name: sanitizeString(body.name),
                description: sanitizeString(body.description),
                mrp: sanitizePositiveNumber(body.mrp),
                price: sanitizePositiveNumber(body.price),
                category: sanitizeString(body.category),
                inStock: body.inStock !== undefined ? Boolean(body.inStock) : undefined,
                stockCount: body.stockCount ? parseInt(body.stockCount) : undefined,
                images: Array.isArray(body.images) ? body.images.filter(Boolean) : undefined,
            }
        })
        return success({ product: updated })
    } catch (err) {
        return serverError(err.message)
    }
}

export async function DELETE(req, { params }) {
    try {
        const { error: authError, user } = await requireVendorOrAdmin(req)
        if (authError) return authError

        const { productId } = await params
        const product = await prisma.product.findUnique({ where: { id: productId }, select: { store: { select: { userId: true } } } })
        if (!product) return notFound('Product not found')
        if (product.store.userId !== user.id && user.role !== 'ADMIN') return error('Not authorized', 403)

        // Soft delete
        await prisma.product.update({ where: { id: productId }, data: { isActive: false } })
        return success({ message: 'Product deleted successfully' })
    } catch (err) {
        return serverError(err.message)
    }
}
