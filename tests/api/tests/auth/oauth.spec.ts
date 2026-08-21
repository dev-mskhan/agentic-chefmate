import { test, expect } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'

/**
 * Google OAuth — basic configuration check.
 *
 * A full Google login requires real Google credentials + browser interaction
 * and is not feasible in pure API tests. We verify the strategy is wired up:
 * GET /api/v1/auth/google should 302-redirect to accounts.google.com with the
 * configured client_id in the query string.
 *
 * Routed through the gateway (auth: false on /api/v1/auth).
 */

// Load the auth-service .env so we can assert the redirect carries the
// configured client_id (validates the strategy uses the right credentials).
// __dirname is tests/api/tests/auth → 4 levels up to repo root.
dotenv.config({ path: path.resolve(__dirname, '../../../../services/auth-service/.env') })
const GOOGLE_CLIENT_ID = process.env['GOOGLE_CLIENT_ID']

test.describe('Phase 1 — Google OAuth (redirect check)', () => {
  test('GET /api/v1/auth/google → 302 to accounts.google.com with correct client_id', async ({ request }) => {
    // Don't follow the redirect — we just want to inspect the Location header.
    const res = await request.get('/api/v1/auth/google', {
      maxRedirects: 0,
    })

    expect(res.status()).toBe(302)
    const location = res.headers()['location']
    expect(location).toBeTruthy()
    expect(location!).toContain('accounts.google.com')
    expect(location!).toContain('client_id=')
    expect(GOOGLE_CLIENT_ID).toBeTruthy()
    expect(location!).toContain(encodeURIComponent(GOOGLE_CLIENT_ID!))
  })
})
