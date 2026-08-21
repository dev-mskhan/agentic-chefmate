import { test, expect } from '@playwright/test'
import {
  setupActiveChef, chefPost, chefPut, chefGet,
} from '../../helpers/chef'
import {
  setupUser, setupAdminContext, uploadImage, mediaPost, mediaPatch, mediaDelete, mediaGet,
} from '../../helpers/media'

test.describe('Phase 4 — Chef-Media Sync (via Gateway)', () => {

  // ─── Media ownership validation ────────────────────────────────────────────

  test('1. Attach valid own mediaId to dish — 200', async ({ request }) => {
    const session = await setupActiveChef(request)
    // Upload + confirm READY
    const { mediaId } = await uploadImage(request, session.userId, 'chef', 'image/png', 100)
    const adminCtx = await setupAdminContext()
    try {
      await mediaPatch(adminCtx, `/${mediaId}/status`, { status: 'READY', width: 1, height: 1 })
    } finally { await adminCtx.dispose() }
    // Create dish and attach media
    const dish = await chefPost(request, '/me/dishes', { name: 'Media Dish', price: 300, currency: 'PKR', cuisine: 'PAKISTANI' })
    const res = await chefPut(request, `/me/dishes/${dish.data._id}/media`, { mediaIds: [mediaId] })
    expect(res.status).toBe(200)
    expect(res.data.mediaIds).toContain(mediaId)
  })

  test('2. Attach another chef\'s mediaId to dish — 400 (not owned)', async ({ request }) => {
    // Chef A uploads media
    const { request: pw } = await import('@playwright/test')
    const ctxA = await pw.newContext({ baseURL: 'http://localhost:3000' })
    let aMediaId: string
    try {
      const sessionA = await setupActiveChef(ctxA)
      const { mediaId } = await uploadImage(ctxA, sessionA.userId, 'chef', 'image/png', 100)
      const adminCtx = await setupAdminContext()
      try {
        await mediaPatch(adminCtx, `/${mediaId}/status`, { status: 'READY', width: 1, height: 1 })
      } finally { await adminCtx.dispose() }
      aMediaId = mediaId
    } finally { await ctxA.dispose() }
    // Chef B tries to attach chef A's mediaId
    await setupActiveChef(request)
    const dish = await chefPost(request, '/me/dishes', { name: 'Stolen Media', price: 300, currency: 'PKR', cuisine: 'PAKISTANI' })
    const res = await chefPut(request, `/me/dishes/${dish.data._id}/media`, { mediaIds: [aMediaId] })
    expect(res.status).toBe(400)
  })

  test('3. Attach non-existent mediaId to dish — 400 (not found)', async ({ request }) => {
    await setupActiveChef(request)
    const dish = await chefPost(request, '/me/dishes', { name: 'Fake Media', price: 300, currency: 'PKR', cuisine: 'PAKISTANI' })
    const res = await chefPut(request, `/me/dishes/${dish.data._id}/media`, { mediaIds: ['nonexistent-uuid-12345'] })
    expect(res.status).toBe(400)
  })

  test('4. Attach mediaId that is not READY (still UPLOADING) — 400', async ({ request }) => {
    const session = await setupActiveChef(request)
    // Upload but do NOT confirm READY — status remains UPLOADING
    const { mediaId } = await uploadImage(request, session.userId, 'chef', 'image/png', 100)
    const dish = await chefPost(request, '/me/dishes', { name: 'Pending Media', price: 300, currency: 'PKR', cuisine: 'PAKISTANI' })
    const res = await chefPut(request, `/me/dishes/${dish.data._id}/media`, { mediaIds: [mediaId] })
    expect(res.status).toBe(400)
  })

  // ─── Event sync: media.deleted cleanup ─────────────────────────────────────

  test('5. Delete media removes it from dish mediaIds via event sync', async ({ request }) => {
    const session = await setupActiveChef(request)
    // Upload + confirm READY
    const { mediaId } = await uploadImage(request, session.userId, 'chef', 'image/png', 100)
    const adminCtx = await setupAdminContext()
    try {
      await mediaPatch(adminCtx, `/${mediaId}/status`, { status: 'READY', width: 1, height: 1 })
    } finally { await adminCtx.dispose() }
    // Attach to dish
    const dish = await chefPost(request, '/me/dishes', { name: 'Sync Dish', price: 300, currency: 'PKR', cuisine: 'PAKISTANI' })
    await chefPut(request, `/me/dishes/${dish.data._id}/media`, { mediaIds: [mediaId] })
    // Delete the media asset
    await mediaDelete(request, `/${mediaId}`)
    // Wait for the media.deleted event to propagate and be consumed
    await new Promise((resolve) => setTimeout(resolve, 3000))
    // Re-fetch the dish via the chef's dish listing and find the dish by ID
    const dishListRes = await chefGet(request, `/${session.chefId}/dishes?limit=100`)
    expect(dishListRes.status).toBe(200)
    const dishes = Array.isArray(dishListRes.data) ? dishListRes.data : (dishListRes.data?.items ?? dishListRes.data?.dishes ?? [])
    const updatedDish = dishes.find((d: any) => d._id === dish.data._id)
    expect(updatedDish).toBeTruthy()
    expect(updatedDish.mediaIds).not.toContain(mediaId)
  })
})
