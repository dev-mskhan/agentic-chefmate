/**
 * Tests: address procedures
 *
 * getAddresses      → GET  /trpc/getAddresses
 * createAddress     → POST /trpc/createAddress
 * updateAddress     → POST /trpc/updateAddress
 * deleteAddress     → POST /trpc/deleteAddress
 * setDefaultAddress → POST /trpc/setDefaultAddress
 *
 * Auth: requires X-User-* headers
 */
import { test, expect } from '@playwright/test'
import { userTrpcQuery, userTrpcMutation, fakeAuthHeaders, createProfileViaUpdateMe } from '../../fixtures/user'
import { parseTRPC } from '../../helpers/trpc'
import { assertTRPCSuccess, assertTRPCError } from '../../helpers/assertions'

const TEST_ADDRESS = {
  label: 'HOME' as const,
  addressLine: '12 Main Street',
  city: 'Karachi',
  postalCode: '74000',
}

test.describe('tRPC address procedures', () => {
  test('returns 401 without auth headers', async ({ request }) => {
    const res = await userTrpcQuery(request, 'getAddresses')
    const body = await parseTRPC(res)
    assertTRPCError(body, 401)
  })

  test('createAddress adds an address', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Ali', lastName: 'Khan' })

    const res = await userTrpcMutation(request, 'createAddress', TEST_ADDRESS, headers)
    const body = await parseTRPC<{ _id: string; label: string; city: string }>(res)

    assertTRPCSuccess(body)
    expect(body.data!.label).toBe('HOME')
    expect(body.data!.city).toBe('Karachi')
    expect(typeof body.data!._id).toBe('string')
  })

  test('getAddresses returns addresses array', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Sana', lastName: 'Mir' })
    await userTrpcMutation(request, 'createAddress', TEST_ADDRESS, headers)

    const res = await userTrpcQuery(request, 'getAddresses', undefined, headers)
    const body = await parseTRPC<Array<{ label: string; city: string }>>(res)

    assertTRPCSuccess(body)
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data!.length).toBeGreaterThan(0)
  })

  test('createAddress returns 400 on missing required field (addressLine)', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Test', lastName: 'User' })

    const res = await userTrpcMutation(
      request,
      'createAddress',
      { label: 'HOME', city: 'Karachi' }, // missing addressLine
      headers,
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 400)
  })

  test('createAddress enforces max 10 addresses', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Max', lastName: 'User' })

    // Create 10 addresses
    for (let i = 0; i < 10; i++) {
      await userTrpcMutation(
        request,
        'createAddress',
        { ...TEST_ADDRESS, city: `City${i}` },
        headers,
      )
    }

    // 11th should fail
    const res = await userTrpcMutation(request, 'createAddress', TEST_ADDRESS, headers)
    const body = await parseTRPC(res)
    assertTRPCError(body, 409)
  })

  test('updateAddress updates fields', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Ahmed', lastName: 'Ali' })

    const createRes = await userTrpcMutation(request, 'createAddress', TEST_ADDRESS, headers)
    const createBody = await parseTRPC<{ _id: string }>(createRes)
    assertTRPCSuccess(createBody)
    const addressId = createBody.data!._id

    const res = await userTrpcMutation(
      request,
      'updateAddress',
      { id: addressId, city: 'Lahore' },
      headers,
    )
    const body = await parseTRPC(res)
    assertTRPCSuccess(body)

    // Verify by fetching addresses
    const listRes = await userTrpcQuery(request, 'getAddresses', undefined, headers)
    const listBody = await parseTRPC<Array<{ _id: string; city: string }>>(listRes)
    const updated = listBody.data!.find((a) => a._id === addressId)
    expect(updated?.city).toBe('Lahore')
  })

  test('updateAddress returns 404 for unknown id', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Test', lastName: 'User' })

    const res = await userTrpcMutation(
      request,
      'updateAddress',
      { id: '000000000000000000000000', city: 'Lahore' },
      headers,
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 404)
  })

  test('deleteAddress removes address', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Delete', lastName: 'Test' })

    const createRes = await userTrpcMutation(request, 'createAddress', TEST_ADDRESS, headers)
    const createBody = await parseTRPC<{ _id: string }>(createRes)
    assertTRPCSuccess(createBody)
    const addressId = createBody.data!._id

    const delRes = await userTrpcMutation(request, 'deleteAddress', { id: addressId }, headers)
    const delBody = await parseTRPC(delRes)
    assertTRPCSuccess(delBody)

    // Confirm it's gone
    const listRes = await userTrpcQuery(request, 'getAddresses', undefined, headers)
    const listBody = await parseTRPC<Array<{ _id: string }>>(listRes)
    const found = listBody.data!.find((a) => a._id === addressId)
    expect(found).toBeUndefined()
  })

  test('setDefaultAddress sets exactly one default', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Default', lastName: 'Test' })

    const r1 = await userTrpcMutation(request, 'createAddress', TEST_ADDRESS, headers)
    const r2 = await userTrpcMutation(request, 'createAddress', { ...TEST_ADDRESS, label: 'WORK', city: 'Lahore' }, headers)
    const b1 = await parseTRPC<{ _id: string }>(r1)
    const b2 = await parseTRPC<{ _id: string }>(r2)
    assertTRPCSuccess(b1)
    assertTRPCSuccess(b2)

    const id1 = b1.data!._id
    const id2 = b2.data!._id

    // Set second as default
    await userTrpcMutation(request, 'setDefaultAddress', { id: id2 }, headers)

    const listRes = await userTrpcQuery(request, 'getAddresses', undefined, headers)
    const listBody = await parseTRPC<Array<{ _id: string; isDefault: boolean }>>(listRes)
    assertTRPCSuccess(listBody)

    const defaultAddresses = listBody.data!.filter((a) => a.isDefault)
    expect(defaultAddresses).toHaveLength(1)
    expect(defaultAddresses[0]!._id).toBe(id2)

    const addr1 = listBody.data!.find((a) => a._id === id1)
    expect(addr1?.isDefault).toBe(false)
  })

  test('setDefaultAddress returns 404 for unknown id', async ({ request }) => {
    const headers = fakeAuthHeaders()
    await createProfileViaUpdateMe(request, headers, { firstName: 'Test', lastName: 'User' })

    const res = await userTrpcMutation(
      request,
      'setDefaultAddress',
      { id: '000000000000000000000000' },
      headers,
    )
    const body = await parseTRPC(res)
    assertTRPCError(body, 404)
  })
})
