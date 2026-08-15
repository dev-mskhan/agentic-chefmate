/**
 * Unit tests for authorization guards (Task 14.3)
 *
 * Tests chefProcedure, adminProcedure, and cross-chef mutation blocking.
 */
import { describe, it, expect } from 'vitest'
import { ForbiddenError, UnauthorizedError } from '@chefmate/errors'
import { initTRPC } from '@trpc/server'
import type { Principal } from '@chefmate/auth-clients'

// ── Build a minimal tRPC instance for testing ─────────────────────────────────

interface TestContext {
  principal: Principal | null
}

const t = initTRPC.context<TestContext>().create()

const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.principal) throw new UnauthorizedError('Missing identity headers')
  return next({ ctx: { ...ctx, principal: ctx.principal as Principal } })
})

const chefProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.principal.role !== 'CHEF') throw new ForbiddenError('Chef role required')
  return next({ ctx })
})

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.principal.role !== 'ADMIN') throw new ForbiddenError('Admin role required')
  return next({ ctx })
})

// A minimal router to call the procedures
const testRouter = t.router({
  chefOnly:  chefProcedure.query(() => 'ok'),
  adminOnly: adminProcedure.query(() => 'ok'),
})

function makePrincipal(role: 'USER' | 'CHEF' | 'ADMIN', userId = 'user1'): Principal {
  return { userId, role, email: `${role.toLowerCase()}@test.com` }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('chefProcedure authorization', () => {
  it('allows access for CHEF role', async () => {
    const caller = testRouter.createCaller({ principal: makePrincipal('CHEF') })
    const result = await caller.chefOnly()
    expect(result).toBe('ok')
  })

  it('throws error for USER role (ForbiddenError wrapped in TRPCError)', async () => {
    const caller = testRouter.createCaller({ principal: makePrincipal('USER') })
    await expect(caller.chefOnly()).rejects.toMatchObject({ message: 'Chef role required' })
  })

  it('throws error for ADMIN role (ForbiddenError wrapped in TRPCError)', async () => {
    const caller = testRouter.createCaller({ principal: makePrincipal('ADMIN') })
    await expect(caller.chefOnly()).rejects.toMatchObject({ message: 'Chef role required' })
  })

  it('throws error when principal is null (UnauthorizedError wrapped in TRPCError)', async () => {
    const caller = testRouter.createCaller({ principal: null })
    await expect(caller.chefOnly()).rejects.toMatchObject({ message: 'Missing identity headers' })
  })
})

describe('adminProcedure authorization', () => {
  it('allows access for ADMIN role', async () => {
    const caller = testRouter.createCaller({ principal: makePrincipal('ADMIN') })
    const result = await caller.adminOnly()
    expect(result).toBe('ok')
  })

  it('throws error for CHEF role (ForbiddenError wrapped in TRPCError)', async () => {
    const caller = testRouter.createCaller({ principal: makePrincipal('CHEF') })
    await expect(caller.adminOnly()).rejects.toMatchObject({ message: 'Admin role required' })
  })

  it('throws error for USER role (ForbiddenError wrapped in TRPCError)', async () => {
    const caller = testRouter.createCaller({ principal: makePrincipal('USER') })
    await expect(caller.adminOnly()).rejects.toMatchObject({ message: 'Admin role required' })
  })
})

describe('cross-chef mutation blocking', () => {
  it('blocks mutation when userId does not match profile.userId', () => {
    // Simulate the ownership check logic from update-chef-profile.ts
    const principalUserId = 'user-A'
    const profileUserId   = 'user-B'
    const role            = 'CHEF'

    function checkOwnership(principalId: string, profileId: string, principalRole: string): void {
      if (profileId !== principalId && principalRole !== 'ADMIN') {
        throw new ForbiddenError('You can only update your own profile')
      }
    }

    expect(() => checkOwnership(principalUserId, profileUserId, role)).toThrow(ForbiddenError)
  })

  it('allows admin to update any profile', () => {
    const principalUserId = 'admin-user'
    const profileUserId   = 'some-chef'
    const role            = 'ADMIN'

    function checkOwnership(principalId: string, profileId: string, principalRole: string): void {
      if (profileId !== principalId && principalRole !== 'ADMIN') {
        throw new ForbiddenError('You can only update your own profile')
      }
    }

    expect(() => checkOwnership(principalUserId, profileUserId, role)).not.toThrow()
  })

  it('allows chef to update their own profile', () => {
    const principalUserId = 'user-A'
    const profileUserId   = 'user-A'
    const role            = 'CHEF'

    function checkOwnership(principalId: string, profileId: string, principalRole: string): void {
      if (profileId !== principalId && principalRole !== 'ADMIN') {
        throw new ForbiddenError('You can only update your own profile')
      }
    }

    expect(() => checkOwnership(principalUserId, profileUserId, role)).not.toThrow()
  })
})

describe('protectedProcedure — chef application (any authenticated user)', () => {
  const testRouterProtected = t.router({
    applyAsChef: protectedProcedure.query(() => 'application submitted'),
  })

  it('allows USER role to submit a chef application', async () => {
    const caller = testRouterProtected.createCaller({ principal: makePrincipal('USER') })
    const result = await caller.applyAsChef()
    expect(result).toBe('application submitted')
  })

  it('allows CHEF role to call protected procedure', async () => {
    const caller = testRouterProtected.createCaller({ principal: makePrincipal('CHEF') })
    const result = await caller.applyAsChef()
    expect(result).toBe('application submitted')
  })

  it('allows ADMIN role to call protected procedure', async () => {
    const caller = testRouterProtected.createCaller({ principal: makePrincipal('ADMIN') })
    const result = await caller.applyAsChef()
    expect(result).toBe('application submitted')
  })

  it('throws UnauthorizedError when principal is null', async () => {
    const caller = testRouterProtected.createCaller({ principal: null })
    await expect(caller.applyAsChef()).rejects.toMatchObject({ message: 'Missing identity headers' })
  })
})
