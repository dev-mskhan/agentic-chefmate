/**
 * Tests: favorites procedures
 *
 * getFavorites       → GET  /trpc/getFavorites
 * addFavoriteChef    → POST /trpc/addFavoriteChef
 * removeFavoriteChef → POST /trpc/removeFavoriteChef
 * addFavoriteDish    → POST /trpc/addFavoriteDish
 * removeFavoriteDish → POST /trpc/removeFavoriteDish
 *
 * Auth: requires X-User-* headers
 */
import { test, expect } from '@playwright/test'
import { userTrpcQuery, userTrpcMutation, fakeAuthHeaders, createProfileViaUpdateMe } from '../../fixtures/user'
import { parseTRPC } from '../../helpers/trpc'
import { assertTRPCSuccess, assertTRPCError } from '../../helpers/assertions'

test.describe('tRPC favorites procedures', () => {
  test('returns 401 without auth headers', async ({ request }) => {
    const res = await userTrpcQuery(request, 'getFavorites')
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('getFavorites returns empty arrays by default', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Fav', lastName: 'Test' })

    const res = await userTrpcQuery(request, 'getFavorites', undefined, headers)
    const body = await parseTRPC<{ chefIds: string[]; dishIds: string[] }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.chefIds).toHaveLength(0)
    expect(body.data!.dishIds).toHaveLength(0)
  })

  test('addFavoriteChef adds a chef', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Chef', lastName: 'Fan' })

    const res = await userTrpcMutation(request, 'addFavoriteChef', { chefId: 'chef-abc' }, headers)
    const body = await parseTRPC<{ chefIds: string[] }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.chefIds).toContain('chef-abc')
  })

  test('addFavoriteChef is idempotent ($addToSet)', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Idem', lastName: 'Test' })

    await userTrpcMutation(request, 'addFavoriteChef', { chefId: 'chef-xyz' }, headers)
    await userTrpcMutation(request, 'addFavoriteChef', { chefId: 'chef-xyz' }, headers)

    const res = await userTrpcQuery(request, 'getFavorites', undefined, headers)
    const body = await parseTRPC<{ chefIds: string[] }>(res)

    assertTRPCSuccess(body)
    const occurrences = body.data!.chefIds.filter((id) => id === 'chef-xyz')
    expect(occurrences).toHaveLength(1)
  })

  test('removeFavoriteChef removes the chef', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Remove', lastName: 'Chef' })
    await userTrpcMutation(request, 'addFavoriteChef', { chefId: 'chef-del' }, headers)

    const res = await userTrpcMutation(request, 'removeFavoriteChef', { chefId: 'chef-del' }, headers)
    const body = await parseTRPC<{ chefIds: string[] }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.chefIds).not.toContain('chef-del')
  })

  test('removeFavoriteChef returns 404 when chef not in favorites', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'NoChef', lastName: 'Test' })

    const res = await userTrpcMutation(
      request,
      'removeFavoriteChef',
      { chefId: 'chef-not-here' },
      headers,
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 404)
  })

  test('addFavoriteDish adds a dish', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Dish', lastName: 'Fan' })

    const res = await userTrpcMutation(request, 'addFavoriteDish', { dishId: 'dish-123' }, headers)
    const body = await parseTRPC<{ dishIds: string[] }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.dishIds).toContain('dish-123')
  })

  test('removeFavoriteDish removes the dish', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Remove', lastName: 'Dish' })
    await userTrpcMutation(request, 'addFavoriteDish', { dishId: 'dish-del' }, headers)

    const res = await userTrpcMutation(request, 'removeFavoriteDish', { dishId: 'dish-del' }, headers)
    const body = await parseTRPC<{ dishIds: string[] }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.dishIds).not.toContain('dish-del')
  })

  test('removeFavoriteDish returns 404 when dish not in favorites', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'NoDish', lastName: 'Test' })

    const res = await userTrpcMutation(
      request,
      'removeFavoriteDish',
      { dishId: 'dish-ghost' },
      headers,
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 404)
  })
})
