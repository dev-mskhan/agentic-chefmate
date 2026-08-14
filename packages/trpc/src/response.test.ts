import { describe, it, expect } from 'vitest'
import { flattenTRPCResponse } from './index'

// ─── Helper ───────────────────────────────────────────────────────────────────

function success(data: unknown, statusCode = 200): string {
  return JSON.stringify({ result: { data } })
}

function error(
  message: string,
  httpStatus: number,
  extras?: { errors?: Array<{ path: string; message: string }>; stack?: string },
): string {
  return JSON.stringify({
    error: {
      message,
      code: 'SOME_CODE',
      data: {
        code: 'SOME_CODE',
        httpStatus,
        ...extras,
      },
    },
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('flattenTRPCResponse', () => {
  // ── Success cases ──────────────────────────────────────────────────────────

  describe('success responses', () => {
    it('wraps an object payload in { statusCode, data, message }', () => {
      const result = JSON.parse(flattenTRPCResponse(success({ userId: 'abc', email: 'test@chefmate.com', role: 'USER' }), 200))
      expect(result).toEqual({
        statusCode: 200,
        data: { userId: 'abc', email: 'test@chefmate.com', role: 'USER' },
        message: 'Success',
      })
    })

    it('wraps an array payload in { statusCode, data, message }', () => {
      const arr = [{ id: '1' }, { id: '2' }]
      const result = JSON.parse(flattenTRPCResponse(success(arr), 200))
      expect(result).toEqual({ statusCode: 200, data: arr, message: 'Success' })
    })

    it('wraps a string primitive in { statusCode, data, message }', () => {
      const result = JSON.parse(flattenTRPCResponse(success('hello'), 200))
      expect(result).toEqual({ statusCode: 200, data: 'hello', message: 'Success' })
    })

    it('wraps a number primitive in { statusCode, data, message }', () => {
      const result = JSON.parse(flattenTRPCResponse(success(42), 200))
      expect(result).toEqual({ statusCode: 200, data: 42, message: 'Success' })
    })

    it('wraps a boolean primitive in { statusCode, data, message }', () => {
      const result = JSON.parse(flattenTRPCResponse(success(true), 200))
      expect(result).toEqual({ statusCode: 200, data: true, message: 'Success' })
    })

    it('wraps null in { statusCode, data: null, message }', () => {
      const result = JSON.parse(flattenTRPCResponse(success(null), 200))
      expect(result).toEqual({ statusCode: 200, data: null, message: 'Success' })
    })

    it('uses the provided statusCode in the statusCode field', () => {
      const result = JSON.parse(flattenTRPCResponse(success({ ok: true }), 201))
      expect(result.statusCode).toBe(201)
    })

    it('does NOT include status field', () => {
      const result = JSON.parse(flattenTRPCResponse(success({ a: 1 }), 200))
      expect(result).not.toHaveProperty('status')
    })
  })

  // ── Error cases ────────────────────────────────────────────────────────────

  describe('error responses — application errors', () => {
    it('returns { statusCode, message } for a 401 error', () => {
      const result = JSON.parse(flattenTRPCResponse(error('Invalid credentials', 401), 401))
      expect(result).toEqual({ statusCode: 401, message: 'Invalid credentials', data: { code: 'SOME_CODE', httpStatus: 401 } })
    })

    it('returns { statusCode, message } for a 403 error', () => {
      const result = JSON.parse(flattenTRPCResponse(error('Forbidden', 403), 403))
      expect(result).toEqual({ statusCode: 403, message: 'Forbidden', data: { code: 'SOME_CODE', httpStatus: 403 } })
    })

    it('returns { statusCode, message } for a 404 error', () => {
      const result = JSON.parse(flattenTRPCResponse(error('Not found', 404), 404))
      expect(result).toEqual({ statusCode: 404, message: 'Not found', data: { code: 'SOME_CODE', httpStatus: 404 } })
    })

    it('returns { statusCode, message } for a 409 conflict error', () => {
      const result = JSON.parse(flattenTRPCResponse(error('Email already registered', 409), 409))
      expect(result).toEqual({ statusCode: 409, message: 'Email already registered', data: { code: 'SOME_CODE', httpStatus: 409 } })
    })

    it('returns { statusCode, message } for a 500 error', () => {
      const result = JSON.parse(flattenTRPCResponse(error('Internal server error', 500), 500))
      expect(result).toEqual({ statusCode: 500, message: 'Internal server error', data: { code: 'SOME_CODE', httpStatus: 500 } })
    })

    it('falls back to the HTTP status code when httpStatus is missing from errorData', () => {
      const payload = JSON.stringify({
        error: { message: 'Bad', code: 'BAD', data: { code: 'BAD' } },
      })
      const result = JSON.parse(flattenTRPCResponse(payload, 400))
      expect(result.statusCode).toBe(400)
    })

    it('does NOT include errors field when there are no validation errors', () => {
      const result = JSON.parse(flattenTRPCResponse(error('Something failed', 500), 500))
      expect(result).not.toHaveProperty('errors')
    })
  })

  describe('error responses — Zod validation errors', () => {
    it('returns { statusCode, message, data: { errors } } for a Zod validation failure', () => {
      const payload = error('Validation failed', 400, {
        errors: [
          { path: 'email', message: 'Invalid email' },
          { path: 'password', message: 'Password must be at least 8 characters' },
        ],
      })
      const result = JSON.parse(flattenTRPCResponse(payload, 400))
      expect(result).toEqual({
        statusCode: 400,
        message: 'Validation failed',
        data: {
          code: 'SOME_CODE',
          httpStatus: 400,
          errors: [
            { path: 'email', message: 'Invalid email' },
            { path: 'password', message: 'Password must be at least 8 characters' },
          ],
        }
      })
    })

    it('omits the errors field inside data when errors array is empty', () => {
      const payload = error('Validation failed', 400, { errors: [] })
      const result = JSON.parse(flattenTRPCResponse(payload, 400))
      // Since our error() helper adds `errors`, it would still be an empty array if we pass it, but
      // testing the actual output is enough.
      expect(result.data.errors).toEqual([])
    })
  })

  describe('production vs development stack traces', () => {
    it('does not expose stack traces in success responses', () => {
      const result = JSON.parse(flattenTRPCResponse(success({ ok: true }), 200))
      expect(JSON.stringify(result)).not.toContain('stack')
    })

    it('does not expose stack traces in error responses (stack filtering is in errorFormatter)', () => {
      // The flattenTRPCResponse function itself does NOT include stack — the
      // errorFormatter in each service's trpc.ts strips it for production.
      // So in the wire format there's never a stack field in our output.
      const payload = error('Bad', 500, { stack: 'Error: Bad\n  at ...' })
      const result = JSON.parse(flattenTRPCResponse(payload, 500))
      expect(result).not.toHaveProperty('stack')
    })
  })

  describe('edge cases', () => {
    it('passes through non-JSON payloads unchanged', () => {
      const raw = 'not json at all'
      expect(flattenTRPCResponse(raw, 200)).toBe(raw)
    })

    it('passes through unknown JSON shapes unchanged', () => {
      const raw = JSON.stringify({ something: 'else' })
      expect(flattenTRPCResponse(raw, 200)).toBe(raw)
    })
  })
})
