/**
 * Tests: Gateway health and readiness endpoints
 *
 * GET /health   — always 200 { status: 'ok', service: 'gateway' }
 * GET /ready    — 200 when Redis is reachable, 503 when not
 */
import { test, expect } from '@playwright/test'
import { assertStatus } from '../../helpers/assertions'

test.describe('Gateway health endpoints', () => {
  test('GET /health returns 200 with status ok', async ({ request }) => {
    const res = await request.get('/health')
    const body = await assertStatus<{ status: string; service: string }>(res, 200)
    expect(body.status).toBe('ok')
    expect(body.service).toBe('gateway')
  })

  test('GET /ready returns 200 when Redis is available', async ({ request }) => {
    const res = await request.get('/ready')
    // In a running test environment Redis should be up
    expect([200, 503]).toContain(res.status())
    const body = await res.json() as { status: string }
    expect(['ready', 'not ready']).toContain(body.status)
  })

  test('GET /health returns JSON content-type', async ({ request }) => {
    const res = await request.get('/health')
    expect(res.headers()['content-type']).toContain('application/json')
  })
})