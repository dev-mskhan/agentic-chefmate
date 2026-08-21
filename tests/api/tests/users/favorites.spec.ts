import { test, expect } from '@playwright/test'
import {
  setupUser,
  utrpcPost,
  utrpcGet,
} from '../../helpers/user'

/**
 * Phase 2 — User Service: Favorites (via Gateway)
 * Covers: add/remove favorite chef, dish, and meal plan; idempotency of
 * add ($addToSet), getFavorites reflects changes, remove of absent id is a
 * no-op (still 200).
 */

const CHEF_ID = 'chef_abc_123'
const DISH_ID = 'dish_def_456'
const PLAN_ID = 'plan_ghi_789'

test.describe('Phase 2 — Favorites (via Gateway)', () => {

  test('1. Add favorite chef → appears in getFavorites', async ({ request }) => {
    await setupUser(request)
    const add = await utrpcPost(request, 'addFavoriteChef', { chefId: CHEF_ID })
    expect(add.status).toBe(200)
    expect(add.data.chefIds).toContain(CHEF_ID)

    const get = await utrpcGet(request, 'getFavorites')
    expect(get.status).toBe(200)
    expect(get.data.chefIds).toContain(CHEF_ID)
  })

  test('2. Adding the same chef twice is idempotent ($addToSet)', async ({ request }) => {
    await setupUser(request)
    await utrpcPost(request, 'addFavoriteChef', { chefId: CHEF_ID })
    const second = await utrpcPost(request, 'addFavoriteChef', { chefId: CHEF_ID })
    expect(second.status).toBe(200)
    // Should appear only once
    expect(second.data.chefIds.filter((id: string) => id === CHEF_ID).length).toBe(1)
  })

  test('3. Remove favorite chef', async ({ request }) => {
    await setupUser(request)
    await utrpcPost(request, 'addFavoriteChef', { chefId: CHEF_ID })
    const rem = await utrpcPost(request, 'removeFavoriteChef', { chefId: CHEF_ID })
    expect(rem.status).toBe(200)
    expect(rem.data.chefIds).not.toContain(CHEF_ID)
  })

  test('4. Removing an absent favorite chef is a no-op (200)', async ({ request }) => {
    await setupUser(request)
    const rem = await utrpcPost(request, 'removeFavoriteChef', { chefId: 'never_added' })
    expect(rem.status).toBe(200)
    expect(rem.data.chefIds).not.toContain('never_added')
  })

  test('5. Add/remove favorite dish', async ({ request }) => {
    await setupUser(request)
    const add = await utrpcPost(request, 'addFavoriteDish', { dishId: DISH_ID })
    expect(add.status).toBe(200)
    expect(add.data.dishIds).toContain(DISH_ID)

    const rem = await utrpcPost(request, 'removeFavoriteDish', { dishId: DISH_ID })
    expect(rem.status).toBe(200)
    expect(rem.data.dishIds).not.toContain(DISH_ID)
  })

  test('6. Add/remove favorite meal plan', async ({ request }) => {
    await setupUser(request)
    const add = await utrpcPost(request, 'addFavoritePlan', { planId: PLAN_ID })
    expect(add.status).toBe(200)
    expect(add.data.planIds).toContain(PLAN_ID)

    const rem = await utrpcPost(request, 'removeFavoritePlan', { planId: PLAN_ID })
    expect(rem.status).toBe(200)
    expect(rem.data.planIds).not.toContain(PLAN_ID)
  })

  test('7. addFavoriteChef rejects an empty chefId → 400', async ({ request }) => {
    await setupUser(request)
    const { status } = await utrpcPost(request, 'addFavoriteChef', { chefId: '' })
    expect(status).toBe(400)
  })

  test('8. Favorites are isolated per user — see isolation.spec.ts for cross-user check', async ({ request }) => {
    // Sanity: a single user's getFavorites only lists their own.
    await setupUser(request)
    await utrpcPost(request, 'addFavoriteDish', { dishId: DISH_ID })
    const get = await utrpcGet(request, 'getFavorites')
    expect(get.data.dishIds).toEqual([DISH_ID])
    expect(get.data.chefIds).toEqual([])
    expect(get.data.planIds).toEqual([])
  })
})
