// POST /api/ai/recommendations
// "You might also need" — complementary/cross-sell suggestions via Gemini.
// (Same-category "More like this" now lives in /api/products/related — pure DB, no LLM.)
// Auth guard prevents unauthenticated callers from burning API credits
export const maxDuration = 30
import { requireAuth } from '@/lib/middleware'
import { prisma } from '@/lib/prisma'

export async function POST(req) {
  const { error: authError } = await requireAuth(req)
  if (authError) return authError

  let currentProduct
  try {
    const body = await req.json()
    currentProduct = body.currentProduct

    if (!currentProduct) {
      return Response.json({ success: false, error: 'Missing product data' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      // Graceful fallback — same category products (same-category db query,
      // consistent with the other fallback branches below)
      const fallback = await sameCategoryFallback(currentProduct)
      return Response.json({
        success: true,
        data: { productIds: fallback, reasoning: 'Similar products from this category' }
      })
    }

    // Curated, bounded candidate pool — top sellers from OTHER categories,
    // not the whole catalog. This is what the LLM is actually good at:
    // reasoning about complementary/accessory pairing, not similarity search.
    const candidates = await prisma.product.findMany({
      where: {
        isActive: true,
        id: { not: currentProduct.id },
        category: { not: currentProduct.category },
      },
      orderBy: { soldCount: 'desc' },
      take: 30,
      select: { id: true, name: true, category: true, price: true, soldCount: true },
    })

    if (candidates.length === 0) {
      const fallback = await sameCategoryFallback(currentProduct)
      return Response.json({
        success: true,
        data: { productIds: fallback, reasoning: 'Similar products from this category' }
      })
    }

    const prompt = `You are a smart e-commerce cross-sell engine for IntelliMart.

A customer is viewing:
- Name: ${currentProduct.name}
- Category: ${currentProduct.category}
- Price: $${currentProduct.price}

Candidate products from OTHER categories (top sellers):
${candidates.map(p => `- ID: ${p.id} | Name: ${p.name} | Category: ${p.category} | Price: $${p.price}`).join('\n')}

Select up to 4 product IDs that would genuinely COMPLEMENT the current product — things a customer would want alongside it (accessories, related-use items), NOT similar substitutes. Only pick items that make real sense as a companion purchase; it's fine to return fewer than 4 if nothing fits well.

Respond ONLY with valid JSON in this exact format, no markdown:
{"productIds": ["id1","id2","id3","id4"], "reasoning": "one short sentence explaining why these pair well"}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    let response
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
          signal: controller.signal,
        }
      )
    } finally {
      clearTimeout(timeoutId)
    }

    const aiData = await response.json()
    console.log('GEMINI STATUS:', response.status, JSON.stringify(aiData))
    const text   = aiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    const clean  = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    const validIds = candidates.map(p => p.id)
    const filtered = (parsed.productIds || []).filter(id => validIds.includes(id)).slice(0, 4)

    return Response.json({
      success: true,
      data: { productIds: filtered, reasoning: parsed.reasoning || 'You might also need' }
    })
  } catch (err) {
    // Fallback on any error — broad "just exclude current product"
    const fallback = await sameCategoryFallback(currentProduct).catch(() => [])
    return Response.json({
      success: true,
      data: { productIds: fallback, reasoning: 'Products you might also like' }
    })
  }
}

async function sameCategoryFallback(currentProduct) {
  if (!currentProduct) return []
  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      id: { not: currentProduct.id },
      category: currentProduct.category,
    },
    orderBy: { soldCount: 'desc' },
    take: 4,
    select: { id: true },
  })
  return rows.map(p => p.id)
}