/**
 * Tests: POST /api/v1/media/upload-url
 */
import { test, expect } from '@playwright/test'
import { assertStatus } from '../../helpers/assertions'

const VALID_BODY = {
  ownerId: 'chef-test-123',
  ownerType: 'chef',
  mimeType: 'image/jpeg',
  sizeBytes: 1024 * 1024, // 1MB
  originalName: 'photo.jpg',
}

const AUTH_HEADERS = {
  'x-user-id': 'user-test-123',
  'x-user-role': 'CHEF',
  'x-user-email': 'chef@test.com',
}

test.describe('POST /api/v1/media/upload-url', () => {
  test('returns 201 with mediaId and uploadUrl for valid request', async ({ request }) => {
    const res = await request.post('/api/v1/media/upload-url', {
      data: VALID_BODY,
      headers: AUTH_HEADERS,
    })
    const body = await assertStatus<{ mediaId: string; uploadUrl: string; expiresAt: string }>(res, 201)
    expect(body.mediaId).toBeTruthy()
    expect(body.uploadUrl).toBeTruthy()
    expect(body.expiresAt).toBeTruthy()
  })

  test('returns 401 when auth headers are missing', async ({ request }) => {
    const res = await request.post('/api/v1/media/upload-url', { data: VALID_BODY })
    await assertStatus(res, 401)
  })

  test('returns 400 for unsupported mimeType', async ({ request }) => {
    const res = await request.post('/api/v1/media/upload-url', {
      data: { ...VALID_BODY, mimeType: 'text/plain' },
      headers: AUTH_HEADERS,
    })
    await assertStatus(res, 400)
  })

  test('returns 400 when image exceeds 10MB', async ({ request }) => {
    const res = await request.post('/api/v1/media/upload-url', {
      data: { ...VALID_BODY, sizeBytes: 10 * 1024 * 1024 + 1 },
      headers: AUTH_HEADERS,
    })
    await assertStatus(res, 400)
  })

  test('returns 400 when ownerType is invalid', async ({ request }) => {
    const res = await request.post('/api/v1/media/upload-url', {
      data: { ...VALID_BODY, ownerType: 'unknown' },
      headers: AUTH_HEADERS,
    })
    await assertStatus(res, 400)
  })
})
