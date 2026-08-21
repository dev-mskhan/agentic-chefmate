import { test, expect } from '@playwright/test'
import {
  setupUser,
  utrpcPost,
  utrpcGet,
  errorHttpStatus,
} from '../../helpers/user'

/**
 * Phase 2 — User Service: Addresses (via Gateway)
 * Covers: create, get, update, delete, set-default, default isolation
 * (only one default at a time), 10-address cap, not-found, invalid ObjectId.
 */

function addrInput(label: 'HOME' | 'WORK' | 'OTHER' = 'HOME', city = 'Islamabad') {
  return {
    label,
    addressLine: `House ${Math.floor(Math.random() * 999)}, Street 4`,
    city,
    province: 'Federal Capital',
    postalCode: '44000',
    deliveryInstructions: 'Ring the bell',
    isDefault: false,
  }
}

test.describe('Phase 2 — Addresses (via Gateway)', () => {

  test('1. Create + Get address', async ({ request }) => {
    await setupUser(request)
    const create = await utrpcPost(request, 'createAddress', addrInput('HOME', 'Lahore'))
    expect(create.status).toBe(200)
    expect(create.data.label).toBe('HOME')
    expect(create.data.city).toBe('Lahore')
    const id = create.data._id

    const list = await utrpcGet(request, 'getAddresses')
    expect(list.status).toBe(200)
    expect(Array.isArray(list.data)).toBe(true)
    expect(list.data.some((a: any) => a._id === id)).toBe(true)
  })

  test('2. Update address fields', async ({ request }) => {
    await setupUser(request)
    const create = await utrpcPost(request, 'createAddress', addrInput())
    const id = create.data._id

    const upd = await utrpcPost(request, 'updateAddress', {
      id,
      addressLine: 'House 999-B, Street 4',
      city: 'Karachi',
    })
    expect(upd.status).toBe(200)
    expect(upd.data.success).toBe(true)

    const list = await utrpcGet(request, 'getAddresses')
    const updated = list.data.find((a: any) => a._id === id)
    expect(updated.addressLine).toBe('House 999-B, Street 4')
    expect(updated.city).toBe('Karachi')
  })

  test('3. setDefaultAddress — only one default at a time', async ({ request }) => {
    await setupUser(request)
    const a1 = await utrpcPost(request, 'createAddress', { ...addrInput('HOME'), isDefault: true })
    const a2 = await utrpcPost(request, 'createAddress', { ...addrInput('WORK', 'Karachi'), isDefault: false })

    // a1 is default; set a2 as default → a1 should no longer be default
    const set = await utrpcPost(request, 'setDefaultAddress', { id: a2.data._id })
    expect(set.status).toBe(200)

    const list = await utrpcGet(request, 'getAddresses')
    const defaults = list.data.filter((a: any) => a.isDefault)
    expect(defaults.length).toBe(1)
    expect(defaults[0]._id).toBe(a2.data._id)
  })

  test('4. Delete address', async ({ request }) => {
    await setupUser(request)
    const create = await utrpcPost(request, 'createAddress', addrInput())
    const id = create.data._id

    const del = await utrpcPost(request, 'deleteAddress', { id })
    expect(del.status).toBe(200)
    expect(del.data.success).toBe(true)

    const list = await utrpcGet(request, 'getAddresses')
    expect(list.data.some((a: any) => a._id === id)).toBe(false)
  })

  test('5. Delete a non-existent address → 404', async ({ request }) => {
    await setupUser(request)
    const fakeId = '64abcdef01234567890abcdef' // valid ObjectId, not in user's addresses
    const { status, error } = await utrpcPost(request, 'deleteAddress', { id: fakeId })
    expect(status).toBe(404)
    expect(errorHttpStatus(error, status)).toBe(404)
  })

  test('6. Delete with an invalid ObjectId → 404', async ({ request }) => {
    await setupUser(request)
    const { status, error } = await utrpcPost(request, 'deleteAddress', { id: 'not-an-object-id' })
    expect(status).toBe(404)
    expect(errorHttpStatus(error, status)).toBe(404)
  })

  test('7. setDefaultAddress on a non-existent address → 404', async ({ request }) => {
    await setupUser(request)
    const fakeId = '64abcdef01234567890abcdef'
    const { status, error } = await utrpcPost(request, 'setDefaultAddress', { id: fakeId })
    expect(status).toBe(404)
    expect(errorHttpStatus(error, status)).toBe(404)
  })

  test('8. createAddress rejects an invalid label → 400 validation', async ({ request }) => {
    await setupUser(request)
    const { status, error } = await utrpcPost(request, 'createAddress', {
      ...addrInput(),
      label: 'VACATION',
    })
    expect(status).toBe(400)
    expect(errorHttpStatus(error, status)).toBe(400)
  })

  test('9. Maximum 10 addresses — 11th is rejected with 409', async ({ request }) => {
    await setupUser(request)
    // Create 10 addresses
    for (let i = 0; i < 10; i++) {
      const c = await utrpcPost(request, 'createAddress', addrInput('HOME', `City${i}`))
      expect(c.status).toBe(200)
    }
    // 11th should be rejected
    const { status, error } = await utrpcPost(request, 'createAddress', addrInput('WORK', 'Overflow'))
    expect(status).toBe(409)
    expect(errorHttpStatus(error, status)).toBe(409)
  })

  test('10. updateAddress on a non-existent address → 404', async ({ request }) => {
    await setupUser(request)
    const fakeId = '64abcdef01234567890abcdef'
    const { status, error } = await utrpcPost(request, 'updateAddress', { id: fakeId, city: 'Nowhere' })
    expect(status).toBe(404)
    expect(errorHttpStatus(error, status)).toBe(404)
  })
})
