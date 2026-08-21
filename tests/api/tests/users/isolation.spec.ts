import { test, expect, type APIRequestContext } from '@playwright/test'
import {
  setupUser,
  utrpcPost,
  utrpcGet,
  uniqueEmail,
} from '../../helpers/user'

/**
 * Phase 2 — User Service: User Isolation (via Gateway)
 *
 * The user-service scopes every query by ctx.principal.userId, which comes
 * from the x-user-id header the gateway injects after verifying the access
 * cookie. This spec proves two different authenticated users cannot see or
 * mutate each other's data.
 *
 * We use TWO independent APIRequestContexts (one per user) so each has its
 * own cookie jar — user A's access cookie is never sent for user B.
 */

async function freshContext(baseURL?: string): Promise<APIRequestContext> {
  // playwright.request.newContext gives an isolated cookie jar
  const { request } = await import('@playwright/test')
  return request.newContext({ baseURL })
}

test.describe('Phase 2 — User Isolation (via Gateway)', () => {

  test('1. User A cannot see User B\'s profile via getMe', async () => {
    const ctxA = await freshContext('http://localhost:3000')
    const ctxB = await freshContext('http://localhost:3000')
    try {
      const a = await setupUser(ctxA)
      const b = await setupUser(ctxB)

      // A reads their own profile
      const meA = await utrpcGet(ctxA, 'getMe')
      expect(meA.status).toBe(200)
      expect(meA.data.userId).toBe(a.userId)

      // B reads their own profile — must NOT see A's data
      const meB = await utrpcGet(ctxB, 'getMe')
      expect(meB.status).toBe(200)
      expect(meB.data.userId).toBe(b.userId)
      expect(meB.data.userId).not.toBe(a.userId)
    } finally {
      await ctxA.dispose()
      await ctxB.dispose()
    }
  })

  test('2. User A\'s addresses are invisible to User B', async () => {
    const ctxA = await freshContext('http://localhost:3000')
    const ctxB = await freshContext('http://localhost:3000')
    try {
      await setupUser(ctxA)
      await setupUser(ctxB)

      // A creates an address
      const create = await utrpcPost(ctxA, 'createAddress', {
        label: 'HOME',
        addressLine: 'A Secret House 1',
        city: 'Islamabad',
      })
      expect(create.status).toBe(200)
      const aAddrId = create.data._id

      // B lists addresses — must not contain A's address
      const bList = await utrpcGet(ctxB, 'getAddresses')
      expect(bList.status).toBe(200)
      expect(bList.data.some((addr: any) => addr._id === aAddrId)).toBe(false)
      expect(bList.data.some((addr: any) => addr.addressLine === 'A Secret House 1')).toBe(false)

      // A lists addresses — sees their own
      const aList = await utrpcGet(ctxA, 'getAddresses')
      expect(aList.data.some((addr: any) => addr._id === aAddrId)).toBe(true)
    } finally {
      await ctxA.dispose()
      await ctxB.dispose()
    }
  })

  test('3. User A cannot delete User B\'s address (cross-user id → 404)', async () => {
    const ctxA = await freshContext('http://localhost:3000')
    const ctxB = await freshContext('http://localhost:3000')
    try {
      const a = await setupUser(ctxA)
      const b = await setupUser(ctxB)
      // Sanity: the two users must be distinct.
      expect(a.userId).not.toBe(b.userId)

      // B creates an address
      const createB = await utrpcPost(ctxB, 'createAddress', {
        label: 'WORK',
        addressLine: 'B Office 9',
        city: 'Karachi',
      })
      const bAddrId = createB.data._id

      // A attempts to delete B's address by id — must 404 (A has no such address)
      const del = await utrpcPost(ctxA, 'deleteAddress', { id: bAddrId })
      expect(del.status).toBe(404)

      // Confirm B's address still exists
      const bList = await utrpcGet(ctxB, 'getAddresses')
      expect(bList.data.some((addr: any) => addr._id === bAddrId)).toBe(true)
    } finally {
      await ctxA.dispose()
      await ctxB.dispose()
    }
  })

  test('4. User A\'s favorites are invisible to User B', async () => {
    const ctxA = await freshContext('http://localhost:3000')
    const ctxB = await freshContext('http://localhost:3000')
    try {
      await setupUser(ctxA)
      await setupUser(ctxB)

      await utrpcPost(ctxA, 'addFavoriteChef', { chefId: 'chef_isolated_a' })

      const favB = await utrpcGet(ctxB, 'getFavorites')
      expect(favB.status).toBe(200)
      expect(favB.data.chefIds).not.toContain('chef_isolated_a')
      expect(favB.data.chefIds).toEqual([])

      const favA = await utrpcGet(ctxA, 'getFavorites')
      expect(favA.data.chefIds).toContain('chef_isolated_a')
    } finally {
      await ctxA.dispose()
      await ctxB.dispose()
    }
  })
})
