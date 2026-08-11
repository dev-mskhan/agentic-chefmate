/**
 * Tests: DELETE /api/v1/media/:mediaId
 */
import { test } from '@playwright/test'
import { assertStatus } from '../../helpers/assertions'

const AUTH_HEADERS = {
  'x-user-id': 'user-test-123',
  'x-user-role': 'CHEF',
  'x-user-email': 'chef@test.com',
}

test.describe('DELETE /api/v1/media/:mediaId', () => {
  test('returns 404 for unknown mediaId', async ({ request }) => {
    const res = await request.delete('/api/v1/media/nonexistent-media-id', {
      headers: AUTH_HEADERS,
    })
    await assertStatus(res, 404)
  })

  test('returns 401 without auth headers', async ({ request }) => {
    const res = await request.delete('/api/v1/media/some-id')
    await assertStatus(res, 401)
  })
})
