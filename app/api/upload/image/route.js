// POST /api/upload/image — upload image to Cloudinary
import { requireAuth } from '@/lib/middleware'
import { success, error, serverError } from '@/lib/apiResponse'

export async function POST(req) {
  try {
    const { error: authError } = await requireAuth(req)
    if (authError) return authError

    const formData = await req.formData()
    const file = formData.get('file')

    if (!file) return error('No file provided')

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) return error('Invalid file type. Only JPEG, PNG, WebP, GIF allowed.')

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) return error('File too large. Maximum size is 5MB.')

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      // Fallback: return a placeholder URL in dev mode
      if (process.env.NODE_ENV === 'development') {
        return success({ url: `https://placehold.co/400x400?text=Product`, publicId: 'dev-placeholder' })
      }
      return error('Image upload not configured. Add Cloudinary credentials to .env.local')
    }

    // Upload to Cloudinary
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const dataURI = `data:${file.type};base64,${base64}`

    const timestamp = Math.floor(Date.now() / 1000)
    const folder = 'intellimart'

    // Generate signature
    const crypto = await import('crypto')
    const signStr = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
    const signature = crypto.createHash('sha1').update(signStr).digest('hex')

    const formBody = new FormData()
    formBody.append('file', dataURI)
    formBody.append('api_key', apiKey)
    formBody.append('timestamp', timestamp.toString())
    formBody.append('signature', signature)
    formBody.append('folder', folder)

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formBody,
    })

    if (!response.ok) {
      const errData = await response.json()
      throw new Error(errData.error?.message || 'Cloudinary upload failed')
    }

    const data = await response.json()
    return success({ url: data.secure_url, publicId: data.public_id }, 201)
  } catch (err) {
    return serverError(err.message)
  }
}
