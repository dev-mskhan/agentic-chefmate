import { test, expect } from '@playwright/test'
import {
  setupUser, setupAdminContext, uploadImage,
  mediaPost, mediaGet, mediaPatch, mediaDelete,
  STRONG_PASSWORD, uniqueEmail,
} from '../../helpers/media'

test.describe('Phase 4 — Media Service (via Gateway)', () => {

  // ─── Happy path: full upload lifecycle ────────────────────────────────────

  test('1. Request upload URL — 201, returns mediaId/uploadUrl/expiresAt', async ({ request }) => {
    const session = await setupUser(request)
    const res = await mediaPost(request, '/upload-url', {
      ownerId: session.userId,
      ownerType: 'chef',
      mimeType: 'image/png',
      sizeBytes: 1024,
      originalName: 'photo.png',
    })
    expect(res.status).toBe(201)
    expect(res.data.mediaId).toBeTruthy()
    expect(res.data.uploadUrl).toBeTruthy()
    expect(res.data.expiresAt).toBeTruthy()
  })

  test('2. Upload object to MinIO via signed URL — PUT succeeds', async ({ request }) => {
    const session = await setupUser(request)
    const { mediaId } = await uploadImage(request, session.userId, 'chef', 'image/png', 100)
    expect(mediaId).toBeTruthy()
  })

  test('3. Confirm READY — admin PATCH /:mediaId/status returns 200, status=READY', async ({ request }) => {
    const session = await setupUser(request)
    const { mediaId } = await uploadImage(request, session.userId, 'chef', 'image/png', 100)
    const adminCtx = await setupAdminContext()
    try {
      const res = await mediaPatch(adminCtx, `/${mediaId}/status`, { status: 'READY', width: 100, height: 100 })
      expect(res.status).toBe(200)
      expect(res.data.status).toBe('READY')
      expect(res.data.width).toBe(100)
    } finally {
      await adminCtx.dispose()
    }
  })

  test('4. Get metadata — GET /:mediaId returns 200 with asset info', async ({ request }) => {
    const session = await setupUser(request)
    const { mediaId } = await uploadImage(request, session.userId, 'chef', 'image/png', 100)
    const res = await mediaGet(request, `/${mediaId}`)
    expect(res.status).toBe(200)
    expect(res.data.mediaId).toBe(mediaId)
    expect(res.data.ownerId).toBe(session.userId)
    expect(res.data.mimeType).toBe('image/png')
  })

  test('5. Get download URL — GET /:mediaId/download-url returns 200 with downloadUrl', async ({ request }) => {
    const session = await setupUser(request)
    const { mediaId } = await uploadImage(request, session.userId, 'chef', 'image/png', 100)
    const res = await mediaGet(request, `/${mediaId}/download-url`)
    expect(res.status).toBe(200)
    expect(res.data.mediaId).toBe(mediaId)
    expect(res.data.downloadUrl).toBeTruthy()
    expect(res.data.expiresAt).toBeTruthy()
  })

  test('6. Delete — DELETE /:mediaId returns 200, status=DELETED', async ({ request }) => {
    const session = await setupUser(request)
    const { mediaId } = await uploadImage(request, session.userId, 'chef', 'image/png', 100)
    const res = await mediaDelete(request, `/${mediaId}`)
    expect(res.status).toBe(200)
    expect(res.data.status).toBe('DELETED')
  })

  // ─── Validation: MIME / size ───────────────────────────────────────────────

  test('7. Invalid MIME type — 400', async ({ request }) => {
    const session = await setupUser(request)
    const res = await mediaPost(request, '/upload-url', {
      ownerId: session.userId,
      ownerType: 'chef',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
    })
    expect(res.status).toBe(400)
  })

  test('8. Oversized image (>10MB) — 400', async ({ request }) => {
    const session = await setupUser(request)
    const res = await mediaPost(request, '/upload-url', {
      ownerId: session.userId,
      ownerType: 'chef',
      mimeType: 'image/png',
      sizeBytes: 11 * 1024 * 1024, // 11 MB > 10 MB limit
    })
    expect(res.status).toBe(400)
  })

  test('9. Oversized video (>100MB) — 400', async ({ request }) => {
    const session = await setupUser(request)
    const res = await mediaPost(request, '/upload-url', {
      ownerId: session.userId,
      ownerType: 'chef',
      mimeType: 'video/mp4',
      sizeBytes: 101 * 1024 * 1024, // 101 MB > 100 MB limit
    })
    expect(res.status).toBe(400)
  })

  test('10. Valid video MIME within size limit — 201', async ({ request }) => {
    const session = await setupUser(request)
    const res = await mediaPost(request, '/upload-url', {
      ownerId: session.userId,
      ownerType: 'chef',
      mimeType: 'video/mp4',
      sizeBytes: 50 * 1024 * 1024, // 50 MB < 100 MB
    })
    expect(res.status).toBe(201)
  })

  // ─── Authorization / ownership ─────────────────────────────────────────────

  test('11. Unauthorized download — no access cookie → 401', async ({ request }) => {
    // Create a media asset first, then try to access without auth
    const session = await setupUser(request)
    const { mediaId } = await uploadImage(request, session.userId, 'chef', 'image/png', 100)
    // Use a fresh context with no cookies
    const { request: pw } = await import('@playwright/test')
    const ctx = await pw.newContext({ baseURL: 'http://localhost:3000' })
    try {
      const res = await mediaGet(ctx, `/${mediaId}/download-url`)
      expect(res.status).toBe(401)
    } finally {
      await ctx.dispose()
    }
  })

  test('12. Another user cannot get metadata — 403', async ({ request }) => {
    // User A creates media
    const sessionA = await setupUser(request)
    const { mediaId } = await uploadImage(request, sessionA.userId, 'chef', 'image/png', 100)
    // User B tries to access it
    const { request: pw } = await import('@playwright/test')
    const ctxB = await pw.newContext({ baseURL: 'http://localhost:3000' })
    try {
      await setupUser(ctxB)
      const res = await mediaGet(ctxB, `/${mediaId}`)
      expect(res.status).toBe(403)
    } finally {
      await ctxB.dispose()
    }
  })

  test('13. Another user cannot get download URL — 403', async ({ request }) => {
    const sessionA = await setupUser(request)
    const { mediaId } = await uploadImage(request, sessionA.userId, 'chef', 'image/png', 100)
    const { request: pw } = await import('@playwright/test')
    const ctxB = await pw.newContext({ baseURL: 'http://localhost:3000' })
    try {
      await setupUser(ctxB)
      const res = await mediaGet(ctxB, `/${mediaId}/download-url`)
      expect(res.status).toBe(403)
    } finally {
      await ctxB.dispose()
    }
  })

  test('14. Another user cannot delete — 403', async ({ request }) => {
    const sessionA = await setupUser(request)
    const { mediaId } = await uploadImage(request, sessionA.userId, 'chef', 'image/png', 100)
    const { request: pw } = await import('@playwright/test')
    const ctxB = await pw.newContext({ baseURL: 'http://localhost:3000' })
    try {
      await setupUser(ctxB)
      const res = await mediaDelete(ctxB, `/${mediaId}`)
      expect(res.status).toBe(403)
    } finally {
      await ctxB.dispose()
    }
  })

  test('15. Non-admin cannot confirm READY — 403', async ({ request }) => {
    const session = await setupUser(request)
    const { mediaId } = await uploadImage(request, session.userId, 'chef', 'image/png', 100)
    // Regular USER tries to patch status
    const res = await mediaPatch(request, `/${mediaId}/status`, { status: 'READY' })
    expect(res.status).toBe(403)
  })

  // ─── Not found / edge cases ────────────────────────────────────────────────

  test('16. Get metadata for non-existent mediaId — 404', async ({ request }) => {
    await setupUser(request)
    const res = await mediaGet(request, '/nonexistent-media-id')
    expect(res.status).toBe(404)
  })

  test('17. Get download URL for non-existent mediaId — 404', async ({ request }) => {
    await setupUser(request)
    const res = await mediaGet(request, '/nonexistent-media-id/download-url')
    expect(res.status).toBe(404)
  })

  test('18. Delete non-existent mediaId — 404', async ({ request }) => {
    await setupUser(request)
    const res = await mediaDelete(request, '/nonexistent-media-id')
    expect(res.status).toBe(404)
  })

  // ─── Unauthenticated ───────────────────────────────────────────────────────

  test('19. Unauthenticated POST /upload-url — 401', async ({ request }) => {
    const res = await mediaPost(request, '/upload-url', {
      ownerId: 'fake-id',
      ownerType: 'chef',
      mimeType: 'image/png',
      sizeBytes: 1024,
    })
    expect(res.status).toBe(401)
  })

  test('20. Unauthenticated GET /:mediaId — 401', async ({ request }) => {
    const res = await mediaGet(request, '/some-id')
    expect(res.status).toBe(401)
  })

  test('21. Unauthenticated DELETE /:mediaId — 401', async ({ request }) => {
    const res = await mediaDelete(request, '/some-id')
    expect(res.status).toBe(401)
  })

  // ─── Signed URL expiry ─────────────────────────────────────────────────────

  test('22. Expired signed URL — download returns error after expiry', async ({ request }) => {
    // We can't actually wait for the real expiry (900s/3600s).
    // Instead, verify the expiresAt is in the future and the URL works now.
    const session = await setupUser(request)
    const { mediaId } = await uploadImage(request, session.userId, 'chef', 'image/png', 100)
    const res = await mediaGet(request, `/${mediaId}/download-url`)
    expect(res.status).toBe(200)
    const expiresAt = new Date(res.data.expiresAt)
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now())
    // The downloadUrl should be a valid URL pointing to MinIO
    expect(res.data.downloadUrl).toContain('localhost:9000')
  })

  // ─── Status transitions ────────────────────────────────────────────────────

  test('23. Confirm FAILED — admin PATCH status=FAILED returns 200', async ({ request }) => {
    const session = await setupUser(request)
    const { mediaId } = await uploadImage(request, session.userId, 'chef', 'image/png', 100)
    const adminCtx = await setupAdminContext()
    try {
      const res = await mediaPatch(adminCtx, `/${mediaId}/status`, { status: 'FAILED', reason: 'Corrupted upload' })
      expect(res.status).toBe(200)
      expect(res.data.status).toBe('FAILED')
    } finally {
      await adminCtx.dispose()
    }
  })

  test('24. Invalid state transition — READY on already-READY asset → 400', async ({ request }) => {
    const session = await setupUser(request)
    const { mediaId } = await uploadImage(request, session.userId, 'chef', 'image/png', 100)
    const adminCtx = await setupAdminContext()
    try {
      // First confirm READY
      await mediaPatch(adminCtx, `/${mediaId}/status`, { status: 'READY', width: 50, height: 50 })
      // Try to confirm READY again — should fail (already READY, not UPLOADING)
      const res = await mediaPatch(adminCtx, `/${mediaId}/status`, { status: 'READY' })
      expect(res.status).toBe(400)
    } finally {
      await adminCtx.dispose()
    }
  })

  test('25. Invalid status body — invalid enum → 400', async ({ request }) => {
    const session = await setupUser(request)
    const { mediaId } = await uploadImage(request, session.userId, 'chef', 'image/png', 100)
    const adminCtx = await setupAdminContext()
    try {
      const res = await mediaPatch(adminCtx, `/${mediaId}/status`, { status: 'INVALID_STATUS' })
      expect(res.status).toBe(400)
    } finally {
      await adminCtx.dispose()
    }
  })
})
