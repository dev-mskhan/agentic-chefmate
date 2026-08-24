/**
 * Helpers for Phase 9 Chat tests.
 * All HTTP requests go through Gateway (http://localhost:3000) with cookie auth.
 * Real-time Socket connections go through Gateway socket proxy or directly with JWT auth.
 */
import type { APIRequestContext } from '@playwright/test'
import { io, Socket } from 'socket.io-client'
import { setupChefWithDish, setupCustomer, checkout, ChefFixture, CustomerSession } from './order'

const CHAT_BASE = '/api/v1/chat'

// ── Types ─────────────────────────────────────────────────────────────────

export interface ChatChef extends ChefFixture {
  token: string
}

export interface ChatCustomer extends CustomerSession {
  request: APIRequestContext
  token:   string
}

export interface ChatOrderFixture {
  chef:     ChatChef
  customer: ChatCustomer
  orderId:  string
}

// ── Helper to extract raw JWT token from Playwright request context cookies ──

export async function getJwtTokenFromContext(request: APIRequestContext): Promise<string> {
  const state = await request.storageState()
  const accessCookie = state.cookies.find(
    (c) => c.name === 'access' || c.name === '__Host-access',
  )
  if (!accessCookie) {
    throw new Error('No access cookie found in request context')
  }

  const raw = decodeURIComponent(accessCookie.value)
  // Fastify @fastify/cookie signed cookies: the value is JWT.COOKIE_HMAC_SIG
  // (may optionally have an s: prefix). Strip the last dot-segment to get the raw JWT.
  let val = raw.startsWith('s:') ? raw.slice(2) : raw
  const lastDot = val.lastIndexOf('.')
  // A valid JWT has exactly 2 dots (3 segments). If there are more, strip cookie sig.
  const dotCount = (val.match(/\./g) || []).length
  if (dotCount > 2 && lastDot > 0) {
    val = val.slice(0, lastDot)
  }
  return val
}

// ── Helper to create authenticated Socket.IO client ─────────────────────────

export function connectSocket(url: string, token?: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(url, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
      reconnection: false,
      timeout: 5000,
    })

    socket.on('connect', () => {
      resolve(socket)
    })

    socket.on('connect_error', (err) => {
      reject(err)
    })

    // Fallback error event
    socket.on('error', (err) => {
      reject(typeof err === 'string' ? new Error(err) : err)
    })
  })
}

// ── Setup Chef ─────────────────────────────────────────────────────────────

export async function setupChatChef(): Promise<ChatChef> {
  const chef = await setupChefWithDish()
  const token = await getJwtTokenFromContext(chef.request)
  return { ...chef, token }
}

// ── Setup Customer ─────────────────────────────────────────────────────────

export async function setupChatCustomer(): Promise<ChatCustomer> {
  const { request: pw } = await import('@playwright/test')
  const custReq = await pw.newContext({ baseURL: 'http://localhost:3000' })
  const customer = await setupCustomer(custReq, 'chat-cust')
  const token = await getJwtTokenFromContext(custReq)
  return { ...customer, request: custReq, token }
}

// ── Place Order to create Chat Order Fixture ────────────────────────────────

export async function createChatOrderFixture(): Promise<ChatOrderFixture> {
  const chef     = await setupChatChef()
  const customer = await setupChatCustomer()

  const checkoutRes = await checkout(customer.request, chef, customer, '2026-12-25', 1)
  const orderId = checkoutRes.orderId

  return { chef, customer, orderId }
}

// ── HTTP API Call Helpers ──────────────────────────────────────────────────

export async function getThreadHttp(request: APIRequestContext, orderId: string) {
  const res = await request.get(`${CHAT_BASE}/threads/${orderId}`)
  return { status: res.status(), body: await res.json() }
}

export async function getMyThreadsHttp(request: APIRequestContext, page?: number, limit?: number) {
  const params = new URLSearchParams()
  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))
  const query = params.toString() ? `?${params.toString()}` : ''
  const res = await request.get(`${CHAT_BASE}/threads${query}`)
  return { status: res.status(), body: await res.json() }
}

export async function listMessagesHttp(request: APIRequestContext, threadId: string, cursor?: string, limit?: number) {
  const params = new URLSearchParams({ threadId })
  if (cursor) params.set('cursor', cursor)
  if (limit) params.set('limit', String(limit))
  const res = await request.get(`${CHAT_BASE}/messages?${params.toString()}`)
  return { status: res.status(), body: await res.json() }
}

export async function getUnreadCountHttp(request: APIRequestContext, threadId: string) {
  const res = await request.get(`${CHAT_BASE}/unread?threadId=${threadId}`)
  return { status: res.status(), body: await res.json() }
}
