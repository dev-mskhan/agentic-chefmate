/**
 * Tests: PATCH /api/v1/media/:mediaId/status
 */
import { test } from '@playwright/test'
import { assertStatus } from '../../helpers/assertions'

const ADMIN_HEADERS = {
  'x-user-id': 'admin-user-123',
  'x-user-role': 'ADMIN',
  'x-user-email': 'admin@test.com',
}

const CHEF_HEADERS = {
  'x-user-id': 'chef-user-123',
  'x-user-role': 'CHEF',
  'x-user-email': 'chef@test.com',
}

test.describe('PATCH /api/v1/media/:mediaId/status', () => {
  test('returns 403 for non-ADMIN role', async ({ request }) => {
    const res = await request.patch('/api/v1/media/some-id/status', {
      data: { status: 'READY' },
      headers: CHEF_HEADERS,
    })
    await assertStatus(res, 403)
  })

  test('returns 404 for unknown mediaId as admin', async ({ request }) => {
    const res = await request.patch('/api/v1/media/nonexistent-id/status', {
      data: { status: 'READY' },
      headers: ADMIN_HEADERS,
    })
    await assertStatus(res, 404)
  })

  test('returns 401 without auth headers', async ({ request }) => {
    const res = await request.patch('/api/v1/media/some-id/status', {
      data: { status: 'READY' },
    })
    await assertStatus(res, 401)
  })
})
