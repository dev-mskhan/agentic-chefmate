import type { APIRequestContext } from '@playwright/test'

/**
 * Shared helpers for media-service tests (Phase 4).
 *
 * Every request goes through the gateway (baseURL = GATEWAY_URL in the
 * media-via-gateway Playwright project). The signed access cookie set by
 * signup is sent automatically by Playwright's cookie jar.
 */

const AUTH_TRPC = '/api/v1/auth/trpc'
const MEDIA_BASE = '/api/v1/media'
const ADMIN_EMAIL = 'admin@chefmate.test'
const ADMIN_PASSWORD = 'AdminPass123!'

export const STRONG_PASSWORD = 'MediaTest123!'

export function uniqueEmail(prefix = 'media'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
}

export interface MediaSession {
  email: string
  userId: string
}

/** POST a tRPC auth mutation (signup/signin) via the gateway. */
async function authPost(
  request: APIRequestContext,
  procedure: string,
  input: unknown,
): Promise<{ status: number; data: any; error: any }> {
  const res = await request.post(`${AUTH_TRPC}/${procedure}`, { data: input as Record<string, unknown> })
  const body = await res.json().catch(() => null)
  return { status: res.status(), data: body?.result?.data, error: body?.error }
}

/** POST JSON to a media REST route via the gateway. */
export async function mediaPost(
  request: APIRequestContext,
  path: string,
  body: unknown,
): Promise<{ status: number; data: any }> {
  const res = await request.post(`${MEDIA_BASE}${path}`, { data: body as Record<string, unknown> })
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

/** GET a media REST route via the gateway. */
export async function mediaGet(
  request: APIRequestContext,
  path: string,
): Promise<{ status: number; data: any }> {
  const res = await request.get(`${MEDIA_BASE}${path}`)
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

/** PATCH JSON to a media REST route via the gateway. */
export async function mediaPatch(
  request: APIRequestContext,
  path: string,
  body: unknown,
): Promise<{ status: number; data: any }> {
  const res = await request.patch(`${MEDIA_BASE}${path}`, { data: body as Record<string, unknown> })
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

/** DELETE a media REST route via the gateway. */
export async function mediaDelete(
  request: APIRequestContext,
  path: string,
): Promise<{ status: number; data: any }> {
  const res = await request.delete(`${MEDIA_BASE}${path}`)
  const json = await res.json().catch(() => null)
  return { status: res.status(), data: json }
}

/**
 * Sign up a fresh USER via the gateway. The request context ends up
 * authenticated (access cookie set). Returns session info.
 */
export async function setupUser(
  request: APIRequestContext,
  email?: string,
): Promise<MediaSession> {
  const userEmail = email ?? uniqueEmail()
  const signup = await authPost(request, 'signup', { email: userEmail, password: STRONG_PASSWORD })
  if (signup.status !== 200 || !signup.data) {
    throw new Error(`signup failed: ${signup.status} ${JSON.stringify(signup)}`)
  }
  return { email: userEmail, userId: signup.data.userId }
}

/**
 * Sign in as the pre-seeded ADMIN via the gateway using a separate context.
 * Returns the admin APIRequestContext (already cookied).
 */
export async function setupAdminContext(): Promise<APIRequestContext> {
  const { request: pw } = await import('@playwright/test')
  const ctx = await pw.newContext({ baseURL: 'http://localhost:3000' })
  const signin = await authPost(ctx, 'signin', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  if (signin.status !== 200) {
    await ctx.dispose()
    throw new Error(`admin signin failed: ${signin.status}`)
  }
  return ctx
}

/**
 * Request an upload URL, then PUT a real image buffer to MinIO via the
 * signed URL. Returns the mediaId from the upload-url response.
 */
export async function uploadImage(
  request: APIRequestContext,
  ownerId: string,
  ownerType: 'chef' | 'dish' | 'plan' = 'chef',
  mimeType: string = 'image/png',
  sizeBytes: number = 100,
): Promise<{ mediaId: string; uploadUrl: string; expiresAt: string }> {
  const res = await mediaPost(request, '/upload-url', {
    ownerId,
    ownerType,
    mimeType,
    sizeBytes,
    originalName: 'test.png',
  })
  if (res.status !== 201) {
    throw new Error(`upload-url failed: ${res.status} ${JSON.stringify(res.data)}`)
  }
  // Upload a real buffer to MinIO via the signed PUT URL.
  // Create a minimal valid PNG (1x1 pixel) for image types, or a dummy buffer for others.
  const buffer = mimeType.startsWith('image/')
    ? Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64')
    : Buffer.alloc(sizeBytes, 0)
  await request.put(res.data.uploadUrl, {
    data: buffer,
    headers: { 'Content-Type': mimeType },
  })
  return res.data
}
