/**
 * Tests: GET /api/v1/media/:mediaId/download-url
 */
import { test, expect } from '@playwright/test'
import { assertStatus } from '../../helpers/assertions'

const AUTH_HEADERS = {
  'x-user-id': 'user-test-123',
  'x-user-role': 'CHEF',
  'x-user-email': 'chef@test.com',
}

test.describe('GET /api/v1/media/:mediaId/download-url', () => {
  test('returns 404 for unknown mediaId', async ({ request }) => {
    const res = await request.get('/api/v1/media/nonexistent-media-id/download-url', {
      headers: AUTH_HEADERS,
    })
    await assertStatus(res, 404)
  })

  test('returns 401 when auth headers are missing', async ({ request }) => {
    const res = await request.get('/api/v1/media/some-id/download-url')
    await assertStatus(res, 401)
  })
})
