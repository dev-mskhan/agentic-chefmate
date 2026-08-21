import { test, expect } from '@playwright/test'
import { setupActiveChef, chefPost, chefPatch, chefPut } from '../../helpers/chef'

function validPlanInput(o: Record<string, unknown> = {}) {
  return { name: `Plan ${Date.now()}`, description: 'Test plan', type: 'ONE_OFF', basePrice: 1000, currency: 'PKR', ...o }
}

test.describe('Phase 3D - Meal Plans (via Gateway)', () => {
  test('1. Create ONE_OFF plan - 200, DRAFT', async ({ request }) => {
    await setupActiveChef(request)
    const res = await chefPost(request, '/me/plans', validPlanInput())
    expect(res.status).toBe(200)
    expect(res.data.status).toBe('DRAFT')
  })

  test('2. SUBSCRIPTION without frequency -> 400', async ({ request }) => {
    await setupActiveChef(request)
    const res = await chefPost(request, '/me/plans', validPlanInput({ type: 'SUBSCRIPTION' }))
    expect(res.status).toBe(400)
  })

  test('3. SUBSCRIPTION with frequency -> 200', async ({ request }) => {
    await setupActiveChef(request)
    const res = await chefPost(request, '/me/plans', validPlanInput({ type: 'SUBSCRIPTION', frequency: 'WEEKLY' }))
    expect(res.status).toBe(200)
    expect(res.data.type).toBe('SUBSCRIPTION')
  })

  test('4. Update plan', async ({ request }) => {
    await setupActiveChef(request)
    const c = await chefPost(request, '/me/plans', validPlanInput())
    const res = await chefPatch(request, `/me/plans/${c.data._id}`, { name: 'Updated Plan' })
    expect(res.status).toBe(200)
    expect(res.data.name).toBe('Updated Plan')
  })

  test('5. Manage plan tiers', async ({ request }) => {
    await setupActiveChef(request)
    // Create a dish first — tiers require at least 1 dishId
    const dish = await chefPost(request, '/me/dishes', { name: 'Tier Dish', price: 300, currency: 'PKR', cuisine: 'PAKISTANI' })
    const c = await chefPost(request, '/me/plans', validPlanInput())
    const res = await chefPut(request, `/me/plans/${c.data._id}/tiers`, { tiers: [{ name: 'Basic', dishIds: [dish.data._id] }] })
    expect(res.status).toBe(200)
  })

  test('6. Manage plan media', async ({ request }) => {
    await setupActiveChef(request)
    const c = await chefPost(request, '/me/plans', validPlanInput())
    const res = await chefPut(request, `/me/plans/${c.data._id}/media`, { mediaIds: ['pm1'] })
    expect(res.status).toBe(200)
  })

  test('7. Activate plan (with tier + verified chef)', async ({ request }) => {
    await setupActiveChef(request)
    // Create + activate a dish first (validatePlanActivation requires ACTIVE dishes)
    const dish = await chefPost(request, '/me/dishes', { name: 'Act Dish', price: 300, currency: 'PKR', cuisine: 'PAKISTANI' })
    await chefPost(request, `/me/dishes/${dish.data._id}/activate`, {})
    const c = await chefPost(request, '/me/plans', validPlanInput())
    await chefPut(request, `/me/plans/${c.data._id}/tiers`, { tiers: [{ name: 'Std', dishIds: [dish.data._id] }] })
    const res = await chefPost(request, `/me/plans/${c.data._id}/activate`, {})
    expect(res.status).toBe(200)
    expect(res.data.status).toBe('ACTIVE')
  })

  test('8. Activate plan without tiers -> 400', async ({ request }) => {
    await setupActiveChef(request)
    const c = await chefPost(request, '/me/plans', validPlanInput())
    const res = await chefPost(request, `/me/plans/${c.data._id}/activate`, {})
    expect(res.status).toBe(400)
  })

  test('9. Pause and resume ACTIVE plan', async ({ request }) => {
    await setupActiveChef(request)
    const dish = await chefPost(request, '/me/dishes', { name: 'Pause Dish', price: 300, currency: 'PKR', cuisine: 'PAKISTANI' })
    await chefPost(request, `/me/dishes/${dish.data._id}/activate`, {})
    const c = await chefPost(request, '/me/plans', validPlanInput())
    await chefPut(request, `/me/plans/${c.data._id}/tiers`, { tiers: [{ name: 'Std', dishIds: [dish.data._id] }] })
    await chefPost(request, `/me/plans/${c.data._id}/activate`, {})
    const pause = await chefPost(request, `/me/plans/${c.data._id}/pause`, {})
    expect(pause.status).toBe(200)
    expect(pause.data.status).toBe('PAUSED')
    const resume = await chefPost(request, `/me/plans/${c.data._id}/activate`, {})
    expect(resume.status).toBe(200)
    expect(resume.data.status).toBe('ACTIVE')
  })

  test('10. Archive plan', async ({ request }) => {
    await setupActiveChef(request)
    const c = await chefPost(request, '/me/plans', validPlanInput())
    const res = await chefPost(request, `/me/plans/${c.data._id}/archive`, {})
    expect(res.status).toBe(200)
    expect(res.data.status).toBe('ARCHIVED')
  })

  test('11. Chef ownership isolation - chef B cannot update chef A plan', async ({ request }) => {
    const { request: pw } = await import('@playwright/test')
    const ctxA = await pw.newContext({ baseURL: 'http://localhost:3000' })
    let aPlanId: string
    try {
      await setupActiveChef(ctxA)
      aPlanId = (await chefPost(ctxA, '/me/plans', validPlanInput({ name: 'A Plan' }))).data._id
    } finally { await ctxA.dispose() }
    const ctxB = await pw.newContext({ baseURL: 'http://localhost:3000' })
    try {
      await setupActiveChef(ctxB)
      const res = await chefPatch(ctxB, `/me/plans/${aPlanId}`, { name: 'Stolen' })
      expect(res.status).toBe(403)
    } finally { await ctxB.dispose() }
  })

  test('12. Dish ownership validation - activate plan with another chef dish -> 400', async ({ request }) => {
    const { request: pw } = await import('@playwright/test')
    const ctxA = await pw.newContext({ baseURL: 'http://localhost:3000' })
    let aDishId: string
    try {
      await setupActiveChef(ctxA)
      aDishId = (await chefPost(ctxA, '/me/dishes', { name: 'A Dish', price: 300, currency: 'PKR', cuisine: 'PAKISTANI' })).data._id
      await chefPost(ctxA, `/me/dishes/${aDishId}/activate`, {})
    } finally { await ctxA.dispose() }
    await setupActiveChef(request)
    const c = await chefPost(request, '/me/plans', validPlanInput())
    await chefPut(request, `/me/plans/${c.data._id}/tiers`, { tiers: [{ name: 'T', price: 500, dishIds: [aDishId] }] })
    const res = await chefPost(request, `/me/plans/${c.data._id}/activate`, {})
    expect(res.status).toBe(400)
  })

  test('13. Unauthenticated create plan -> 401', async ({ request }) => {
    const res = await chefPost(request, '/me/plans', validPlanInput())
    expect(res.status).toBe(401)
  })
})