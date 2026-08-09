/**
 * Tests: preferences and allergies procedures
 *
 * getPreferences    → GET  /trpc/getPreferences
 * updatePreferences → POST /trpc/updatePreferences
 * getAllergies       → GET  /trpc/getAllergies
 * setAllergies      → POST /trpc/setAllergies
 *
 * Auth: requires X-User-* headers
 */
import { test, expect } from '@playwright/test'
import { userTrpcQuery, userTrpcMutation, fakeAuthHeaders, createProfileViaUpdateMe } from '../../fixtures/user'
import { parseTRPC } from '../../helpers/trpc'
import { assertTRPCSuccess, assertTRPCError } from '../../helpers/assertions'

test.describe('tRPC preferences procedures', () => {
  test('returns 401 without auth headers', async ({ request }) => {
    const res = await userTrpcQuery(request, 'getPreferences')
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('getPreferences returns default values', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Pref', lastName: 'Test' })

    const res = await userTrpcQuery(request, 'getPreferences', undefined, headers)
    const body = await parseTRPC<{
      spiceLevel: string
      dietaryPreferences: string[]
      allergies: string[]
    }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.spiceLevel).toBe('MEDIUM')
    expect(body.data!.dietaryPreferences).toContain('HALAL')
    expect(Array.isArray(body.data!.allergies)).toBe(true)
  })

  test('updatePreferences updates dietaryPreferences', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Veg', lastName: 'Test' })

    const res = await userTrpcMutation(
      request,
      'updatePreferences',
      { dietaryPreferences: ['VEGETARIAN', 'GLUTEN_FREE'] },
      headers,
    )
    const body = await parseTRPC<{ dietaryPreferences: string[] }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.dietaryPreferences).toContain('VEGETARIAN')
    expect(body.data!.dietaryPreferences).toContain('GLUTEN_FREE')
  })

  test('updatePreferences updates spiceLevel', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Spice', lastName: 'Test' })

    const res = await userTrpcMutation(
      request,
      'updatePreferences',
      { spiceLevel: 'EXTRA_SPICY' },
      headers,
    )
    const body = await parseTRPC<{ spiceLevel: string }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.spiceLevel).toBe('EXTRA_SPICY')
  })

  test('updatePreferences returns 400 for invalid spiceLevel', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Inv', lastName: 'Test' })

    const res = await userTrpcMutation(
      request,
      'updatePreferences',
      { spiceLevel: 'NUCLEAR' },
      headers,
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })
})

test.describe('tRPC allergy procedures', () => {
  test('setAllergies replaces the full allergies array', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Allergy', lastName: 'Test' })

    const res = await userTrpcMutation(
      request,
      'setAllergies',
      { allergies: ['PEANUTS', 'MILK_DAIRY'] },
      headers,
    )
    const body = await parseTRPC<string[]>(res)

    assertTRPCSuccess(body)
    expect(body.data).toContain('PEANUTS')
    expect(body.data).toContain('MILK_DAIRY')
    expect(body.data).toHaveLength(2)
  })

  test('setAllergies accepts empty array', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'NoAllergy', lastName: 'Test' })

    const res = await userTrpcMutation(request, 'setAllergies', { allergies: [] }, headers)
    const body = await parseTRPC<string[]>(res)

    assertTRPCSuccess(body)
    expect(body.data).toHaveLength(0)
  })

  test('getAllergies returns current allergies', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Get', lastName: 'Allergy' })
    await userTrpcMutation(request, 'setAllergies', { allergies: ['SOY', 'EGGS'] }, headers)

    const res = await userTrpcQuery(request, 'getAllergies', undefined, headers)
    const body = await parseTRPC<string[]>(res)

    assertTRPCSuccess(body)
    expect(body.data).toContain('SOY')
    expect(body.data).toContain('EGGS')
  })
})
