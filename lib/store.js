// lib/store.js — vendor store resolution for multi-store accounts
import { prisma } from './prisma'

// Resolves which store a vendor-scoped request should operate on.
// If storeId is given, verifies the requesting user actually owns it
// (never trust a client-supplied storeId without this check).
// Otherwise falls back to the user's oldest store, for callers/pages
// that haven't been updated to pass an explicit storeId yet.
export async function resolveOwnedStore(userId, storeId, select) {
  if (storeId) {
    return prisma.store.findFirst({
      where: { id: storeId, userId },
      ...(select && { select }),
    })
  }
  return prisma.store.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    ...(select && { select }),
  })
}