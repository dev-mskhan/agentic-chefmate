import { test, expect, type APIRequestContext } from '@playwright/test'
import {
  setupReviewChef,
  setupReviewCustomer,
  setupAdminContext,
  signinReviewCustomer,
  reviewGet,
  reviewPost,
  placePayAndDeliverOrder,
  type ReviewChef,
  type ReviewCustomer,
} from '../../helpers/review'

let chefA: ReviewChef
let chefB: ReviewChef
let customerA: ReviewCustomer
let customerB: ReviewCustomer
let adminCtx: APIRequestContext

test.setTimeout(60_000)

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  chefA = await setupReviewChef()
  chefB = await setupReviewChef()
  adminCtx = await setupAdminContext()

  customerA = await setupReviewCustomer(request, 'revcustA')
  customerB = await setupReviewCustomer(request, 'revcustB')
})

test.afterAll(async () => {
  await chefA?.request?.dispose().catch(() => {})
  await chefB?.request?.dispose().catch(() => {})
  await adminCtx?.dispose().catch(() => {})
})

test.beforeEach(async ({ request }) => {
  await signinReviewCustomer(request, customerA.email, customerA.password)
})

// Helper to create a completed order and a published review
async function createDeliveredOrderAndReview(
  request: APIRequestContext,
  date: string,
  rating = 5,
  text = 'Great food!',
) {
  const { orderId } = await placePayAndDeliverOrder(request, chefA, customerA, date)
  await new Promise((r) => setTimeout(r, 3000))

  const res = await reviewPost(request, '', {
    orderId,
    chefId: chefA.chefId,
    rating,
    text,
  })

  if (res.status !== 201) {
    throw new Error(`Helper review creation failed: ${res.status} ${JSON.stringify(res.data)}`)
  }

  const reviewId = String(res.data._id ?? res.data.id)
  return { orderId, reviewId, review: res.data }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8A – Review Eligibility & Creation
// ═══════════════════════════════════════════════════════════════════════════

test('8A-1: customer can create review for completed order (201 + verifiedPurchase)', async ({ request }) => {
  const { orderId, reviewId, review } = await createDeliveredOrderAndReview(request, '2026-12-20', 5, 'Amazing food!')

  expect(reviewId).toBeDefined()
  expect(reviewId.length).toBeGreaterThan(0)
  expect(review.verifiedPurchase).toBe(true)
  expect(review.status).toBe('PUBLISHED')
  expect(review.rating).toBe(5)
})

test('8A-2: cannot review an uncompleted/non-existent order (404)', async ({ request }) => {
  const fakeOrderId = '609e2b17f83b2427a819b111'
  const res = await reviewPost(request, '', {
    orderId: fakeOrderId,
    chefId:  chefA.chefId,
    rating:  4,
    text:    'Should fail because order never existed',
  })

  expect(res.status).toBe(404)
})

test('8A-3: customer cannot review someone else order (403)', async ({ request }) => {
  const { orderId } = await placePayAndDeliverOrder(request, chefA, customerA, '2026-12-21')
  await new Promise((r) => setTimeout(r, 3000))

  // customerB signs in
  await signinReviewCustomer(request, customerB.email, customerB.password)

  // customerB tries to review customerA's order
  const res = await reviewPost(request, '', {
    orderId,
    chefId:  chefA.chefId,
    rating:  1,
    text:    'Trying to review customer A order',
  })

  expect(res.status).toBe(403)
})

test('8A-4: duplicate review for same order & chef returns 409', async ({ request }) => {
  const { orderId } = await createDeliveredOrderAndReview(request, '2026-12-22', 5, 'First review')

  // Second review attempt on same order and chef
  const res = await reviewPost(request, '', {
    orderId,
    chefId: chefA.chefId,
    rating: 4,
    text:   'Second review for same order',
  })

  expect(res.status).toBe(409)
})

test('8A-5: customer can create dish-level review for item in order (201)', async ({ request }) => {
  const { orderId } = await placePayAndDeliverOrder(request, chefA, customerA, '2026-12-23')
  await new Promise((r) => setTimeout(r, 3000))

  const res = await reviewPost(request, '', {
    orderId,
    chefId: chefA.chefId,
    dishId: chefA.dishId,
    rating: 5,
    text:   'Dish was super fresh!',
  })

  expect(res.status).toBe(201)
  expect(res.data.dishId).toBe(chefA.dishId)
})

test('8A-6: dishId not in order items returns 400', async ({ request }) => {
  const { orderId } = await placePayAndDeliverOrder(request, chefA, customerA, '2026-12-24')
  await new Promise((r) => setTimeout(r, 3000))

  const res = await reviewPost(request, '', {
    orderId,
    chefId: chefA.chefId,
    dishId: chefB.dishId, // Dish B belongs to chef B, not in this order
    rating: 4,
  })

  expect(res.status).toBe(400)
})

// ═══════════════════════════════════════════════════════════════════════════
// 8B – Review Retrieval & Public Listings
// ═══════════════════════════════════════════════════════════════════════════

test('8B-1: get single review by ID (200)', async ({ request }) => {
  const { reviewId } = await createDeliveredOrderAndReview(request, '2026-12-25', 5, 'Retrieval test')

  const res = await reviewGet(request, `/public/${reviewId}`)
  expect(res.status).toBe(200)
  expect(res.data._id ?? res.data.id).toBe(reviewId)
  expect(res.data.rating).toBe(5)
})

test('8B-2: list chef reviews returns paginated list (200)', async ({ request }) => {
  await createDeliveredOrderAndReview(request, '2026-12-26', 4, 'Listing test chef')

  const res = await reviewGet(request, `/public/chef/${chefA.chefId}`)
  expect(res.status).toBe(200)
  expect(res.data).toHaveProperty('reviews')
  expect(Array.isArray(res.data.reviews)).toBe(true)
  expect(res.data.total).toBeGreaterThan(0)
  expect(res.data.page).toBe(1)
})

test('8B-3: list dish reviews returns paginated list (200)', async ({ request }) => {
  const { orderId } = await placePayAndDeliverOrder(request, chefA, customerA, '2026-12-27')
  await new Promise((r) => setTimeout(r, 3000))

  await reviewPost(request, '', {
    orderId,
    chefId: chefA.chefId,
    dishId: chefA.dishId,
    rating: 5,
    text:   'Dish review for listing',
  })

  const res = await reviewGet(request, `/public/dish/${chefA.dishId}`)
  expect(res.status).toBe(200)
  expect(res.data).toHaveProperty('reviews')
  expect(Array.isArray(res.data.reviews)).toBe(true)
  expect(res.data.total).toBeGreaterThan(0)
})

// ═══════════════════════════════════════════════════════════════════════════
// 8C – Chef Reply
// ═══════════════════════════════════════════════════════════════════════════

test('8C-1: chef can reply to a review on their profile (200)', async ({ request }) => {
  const { reviewId } = await createDeliveredOrderAndReview(request, '2026-12-10', 5, 'Reply test')

  const res = await reviewPost(chefA.request, `/${reviewId}/reply`, {
    text: 'Thank you for your wonderful review! Hope to serve you again soon.',
  })

  expect(res.status).toBe(200)
  expect(res.data).toHaveProperty('chefReply')
  expect(res.data.chefReply.text).toBe('Thank you for your wonderful review! Hope to serve you again soon.')
})

test('8C-2: duplicate reply returns 409', async ({ request }) => {
  const { reviewId } = await createDeliveredOrderAndReview(request, '2026-12-11', 5, 'Duplicate reply test')

  await reviewPost(chefA.request, `/${reviewId}/reply`, {
    text: 'First reply',
  })

  const res = await reviewPost(chefA.request, `/${reviewId}/reply`, {
    text: 'Second reply attempt',
  })

  expect(res.status).toBe(409)
})

test('8C-3: different chef cannot reply to another chef review (403)', async ({ request }) => {
  const { reviewId } = await createDeliveredOrderAndReview(request, '2026-12-12', 5, 'Wrong chef reply test')

  const res = await reviewPost(chefB.request, `/${reviewId}/reply`, {
    text: 'Chef B trying to reply to Chef A review',
  })

  expect(res.status).toBe(403)
})

test('8C-4: customer cannot call chef reply endpoint (403)', async ({ request }) => {
  const { reviewId } = await createDeliveredOrderAndReview(request, '2026-12-13', 5, 'Customer reply test')

  const res = await reviewPost(request, `/${reviewId}/reply`, {
    text: 'Customer trying to call reply endpoint',
  })

  expect(res.status).toBe(403)
})

// ═══════════════════════════════════════════════════════════════════════════
// 8D – Admin Moderation
// ═══════════════════════════════════════════════════════════════════════════

test('8D-1: admin can hide a review (200)', async ({ request }) => {
  const { reviewId } = await createDeliveredOrderAndReview(request, '2026-12-14', 5, 'Admin hide test')

  const res = await reviewPost(adminCtx, `/${reviewId}/moderate`, {
    status: 'HIDDEN',
  })

  expect(res.status).toBe(200)
  expect(res.data.status).toBe('HIDDEN')
})

test('8D-2: hidden review is excluded from public listing', async ({ request }) => {
  const { reviewId } = await createDeliveredOrderAndReview(request, '2026-12-15', 5, 'Hidden listing test')

  // Hide it
  await reviewPost(adminCtx, `/${reviewId}/moderate`, { status: 'HIDDEN' })

  // Public single review fetch should return 404 for HIDDEN review
  const singleRes = await reviewGet(request, `/public/${reviewId}`)
  expect(singleRes.status).toBe(404)

  // Public chef review listing should not include hidden review
  const listRes = await reviewGet(request, `/public/chef/${chefA.chefId}`)
  const found = (listRes.data.reviews as any[]).some((r) => (r._id ?? r.id) === reviewId)
  expect(found).toBe(false)
})

test('8D-3: admin can unhide (publish) a review back (200)', async ({ request }) => {
  const { reviewId } = await createDeliveredOrderAndReview(request, '2026-12-16', 5, 'Unhide test')

  await reviewPost(adminCtx, `/${reviewId}/moderate`, { status: 'HIDDEN' })

  const res = await reviewPost(adminCtx, `/${reviewId}/moderate`, {
    status: 'PUBLISHED',
  })

  expect(res.status).toBe(200)
  expect(res.data.status).toBe('PUBLISHED')
})

test('8D-4: non-admin cannot call moderate endpoint (403)', async ({ request }) => {
  const { reviewId } = await createDeliveredOrderAndReview(request, '2026-12-17', 5, 'Non-admin moderate test')

  const res = await reviewPost(request, `/${reviewId}/moderate`, {
    status: 'HIDDEN',
  })

  expect(res.status).toBe(403)
})

// ═══════════════════════════════════════════════════════════════════════════
// 8E – Rating Aggregations (CQRS Event Propagation to Chef Service)
// ═══════════════════════════════════════════════════════════════════════════

test('8E-1: published reviews update averageRating and totalReviews on chef profile', async ({ request }) => {
  await createDeliveredOrderAndReview(request, '2026-12-18', 5, 'Rating aggregate test')

  // Wait 3s for review.published event propagation to chef-service consumer
  await new Promise((r) => setTimeout(r, 3000))

  const chefRes = await chefA.request.get('/api/v1/chefs/me')
  expect(chefRes.status()).toBe(200)
  const data = await chefRes.json()

  const profile = data.data ?? data
  expect(profile.totalReviews).toBeGreaterThan(0)
  expect(profile.averageRating).toBeGreaterThan(0)
})

// ═══════════════════════════════════════════════════════════════════════════
// 8F – Role & Auth Guards
// ═══════════════════════════════════════════════════════════════════════════

test('8F-1: unauthenticated user cannot create review (401)', async ({ request }) => {
  const { request: pw } = await import('@playwright/test')
  const anonReq = await pw.newContext({ baseURL: 'http://localhost:3000' })

  const res = await reviewPost(anonReq, '', {
    orderId: '609e2b17f83b2427a819b999',
    chefId:  chefA.chefId,
    rating:  5,
  })

  expect(res.status).toBe(401)
  await anonReq.dispose()
})
