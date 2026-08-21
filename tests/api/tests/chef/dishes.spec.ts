import { test, expect } from '@playwright/test'
import { setupActiveChef, chefPost, chefPatch, chefGet, chefPut } from '../../helpers/chef'

function validDishInput(overrides: Record<string, unknown> = {}) {
  return { name: `Dish ${Date.now()}`, description: 'Test dish', price: 500, currency: 'PKR', cuisine: 'PAKISTANI', dietaryTags: ['HALAL'], allergens: [], occasionTags: [], ...overrides }
}

test.describe('Phase 3B - Dishes (via Gateway)', () => {
  test('1. Create dish draft - 200, DRAFT', async ({ request }) => {
    await setupActiveChef(request)
    const res = await chefPost(request, '/me/dishes', validDishInput())
    expect(res.status).toBe(200)
    expect(res.data.status).toBe('DRAFT')
  })

  test('2. Update dish', async ({ request }) => {
    await setupActiveChef(request)
    const c = await chefPost(request, '/me/dishes', validDishInput())
    const res = await chefPatch(request, `/me/dishes/${c.data._id}`, { name: 'Updated Dish' })
    expect(res.status).toBe(200)
    expect(res.data.name).toBe('Updated Dish')
  })

  test('3. Activate dish', async ({ request }) => {
    await setupActiveChef(request)
    const c = await chefPost(request, '/me/dishes', validDishInput())
    const res = await chefPost(request, `/me/dishes/${c.data._id}/activate`, {})
    expect(res.status).toBe(200)
    expect(res.data.status).toBe('ACTIVE')
  })

  test('4. Deactivate dish', async ({ request }) => {
    await setupActiveChef(request)
    const c = await chefPost(request, '/me/dishes', validDishInput())
    await chefPost(request, `/me/dishes/${c.data._id}/activate`, {})
    const res = await chefPost(request, `/me/dishes/${c.data._id}/deactivate`, {})
    expect(res.status).toBe(200)
    expect(res.data.status).toBe('INACTIVE')
  })

  test('5. Archive dish', async ({ request }) => {
    await setupActiveChef(request)
    const c = await chefPost(request, '/me/dishes', validDishInput())
    const res = await chefPost(request, `/me/dishes/${c.data._id}/archive`, {})
    expect(res.status).toBe(200)
    expect(res.data.status).toBe('ARCHIVED')
  })

  test('6. Manage ingredients', async ({ request }) => {
    await setupActiveChef(request)
    const c = await chefPost(request, '/me/dishes', validDishInput())
    const res = await chefPut(request, `/me/dishes/${c.data._id}/ingredients`, { ingredients: [{ name: 'Rice', quantity: 2, unit: 'cups' }] })
    expect(res.status).toBe(200)
  })

  test('7. Manage pricing', async ({ request }) => {
    await setupActiveChef(request)
    const c = await chefPost(request, '/me/dishes', validDishInput())
    const res = await chefPatch(request, `/me/dishes/${c.data._id}/pricing`, { price: 750 })
    expect(res.status).toBe(200)
  })

  test('8. Manage media', async ({ request }) => {
    await setupActiveChef(request)
    const c = await chefPost(request, '/me/dishes', validDishInput())
    const res = await chefPut(request, `/me/dishes/${c.data._id}/media`, { mediaIds: ['m1'] })
    expect(res.status).toBe(200)
  })

  test('9. Manage availability', async ({ request }) => {
    await setupActiveChef(request)
    const c = await chefPost(request, '/me/dishes', validDishInput())
    const res = await chefPatch(request, `/me/dishes/${c.data._id}/availability`, { available: true })
    expect(res.status).toBe(200)
  })

  test('10. Customer visibility - only ACTIVE in public listing', async ({ request }) => {
    const s = await setupActiveChef(request)
    const draft = await chefPost(request, '/me/dishes', validDishInput({ name: 'Draft' }))
    const active = await chefPost(request, '/me/dishes', validDishInput({ name: 'Active' }))
    await chefPost(request, `/me/dishes/${active.data._id}/activate`, {})
    const res = await chefGet(request, `/${s.chefId}/dishes?status=ACTIVE`)
    expect(res.status).toBe(200)
    const dishes = res.data.dishes ?? res.data
    expect(dishes.some((d: any) => d._id === draft.data._id)).toBe(false)
  })

  test('11. Chef ownership isolation - chef B cannot update chef A dish', async ({ request }) => {
    const { request: pw } = await import('@playwright/test')
    const ctxA = await pw.newContext({ baseURL: 'http://localhost:3000' })
    let aDishId: string
    try {
      await setupActiveChef(ctxA)
      aDishId = (await chefPost(ctxA, '/me/dishes', validDishInput({ name: 'A Dish' }))).data._id
    } finally { await ctxA.dispose() }
    const ctxB = await pw.newContext({ baseURL: 'http://localhost:3000' })
    try {
      await setupActiveChef(ctxB)
      const res = await chefPatch(ctxB, `/me/dishes/${aDishId}`, { name: 'Stolen' })
      expect(res.status).toBe(403)
    } finally { await ctxB.dispose() }
  })

  test('12. Unauthenticated create -> 401', async ({ request }) => {
    const res = await chefPost(request, '/me/dishes', validDishInput())
    expect(res.status).toBe(401)
  })

  test('13. Invalid price (3 decimals) -> 400', async ({ request }) => {
    await setupActiveChef(request)
    const res = await chefPost(request, '/me/dishes', validDishInput({ price: 5.001 }))
    expect(res.status).toBe(400)
  })
})