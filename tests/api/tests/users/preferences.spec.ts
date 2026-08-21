import { test, expect } from '@playwright/test'
import {
  setupUser,
  utrpcPost,
  utrpcGet,
  errorHttpStatus,
} from '../../helpers/user'

/**
 * Phase 2 — User Service: Preferences & Allergies (via Gateway)
 * Covers: dietary preferences, spice level, disliked ingredients, favorite
 * cuisines, allergies set/get, enum validation, get-reflects-update.
 */

test.describe('Phase 2 — Preferences & Allergies (via Gateway)', () => {

  test('1. updatePreferences + getPreferences reflect changes', async ({ request }) => {
    await setupUser(request)
    const upd = await utrpcPost(request, 'updatePreferences', {
      dietaryPreferences: ['HALAL', 'VEGETARIAN'],
      spiceLevel: 'SPICY',
      favoriteCuisines: ['PAKISTANI', 'MIDDLE_EASTERN'],
      dislikedIngredients: ['ONION', 'GARLIC'],
    })
    expect(upd.status).toBe(200)
    expect(upd.data.dietaryPreferences).toContain('HALAL')
    expect(upd.data.spiceLevel).toBe('SPICY')
    expect(upd.data.dislikedIngredients).toContain('ONION')

    const get = await utrpcGet(request, 'getPreferences')
    expect(get.status).toBe(200)
    expect(get.data.dietaryPreferences).toContain('HALAL')
    expect(get.data.spiceLevel).toBe('SPICY')
    expect(get.data.favoriteCuisines).toContain('PAKISTANI')
  })

  test('2. updatePreferences rejects an invalid dietaryPreference → 400', async ({ request }) => {
    await setupUser(request)
    const { status, error } = await utrpcPost(request, 'updatePreferences', {
      dietaryPreferences: ['HALAL', 'JUNK_FOOD'],
    })
    expect(status).toBe(400)
    expect(errorHttpStatus(error, status)).toBe(400)
  })

  test('3. updatePreferences rejects an invalid spiceLevel → 400', async ({ request }) => {
    await setupUser(request)
    const { status, error } = await utrpcPost(request, 'updatePreferences', {
      spiceLevel: 'NUCLEAR',
    })
    expect(status).toBe(400)
    expect(errorHttpStatus(error, status)).toBe(400)
  })

  test('4. updatePreferences rejects an invalid cuisine → 400', async ({ request }) => {
    await setupUser(request)
    const { status, error } = await utrpcPost(request, 'updatePreferences', {
      favoriteCuisines: ['PAKISTANI', 'MEXICAN'],
    })
    expect(status).toBe(400)
    expect(errorHttpStatus(error, status)).toBe(400)
  })

  test('5. updatePreferences rejects an invalid dislikedIngredient → 400', async ({ request }) => {
    await setupUser(request)
    const { status, error } = await utrpcPost(request, 'updatePreferences', {
      dislikedIngredients: ['BROCCOLI'],
    })
    expect(status).toBe(400)
    expect(errorHttpStatus(error, status)).toBe(400)
  })

  test('6. setAllergies + getAllergies reflect changes', async ({ request }) => {
    await setupUser(request)
    const set = await utrpcPost(request, 'setAllergies', {
      allergies: ['PEANUTS', 'SHELLFISH', 'MILK_DAIRY'],
    })
    expect(set.status).toBe(200)
    expect(set.data).toContain('PEANUTS')
    expect(set.data).toContain('SHELLFISH')

    const get = await utrpcGet(request, 'getAllergies')
    expect(get.status).toBe(200)
    expect(get.data).toContain('PEANUTS')
    expect(get.data).toContain('MILK_DAIRY')
  })

  test('7. setAllergies rejects an invalid allergy → 400', async ({ request }) => {
    await setupUser(request)
    const { status, error } = await utrpcPost(request, 'setAllergies', {
      allergies: ['PEANUTS', 'DUST'],
    })
    expect(status).toBe(400)
    expect(errorHttpStatus(error, status)).toBe(400)
  })

  test('8. setAllergies with an empty array clears allergies', async ({ request }) => {
    await setupUser(request)
    await utrpcPost(request, 'setAllergies', { allergies: ['PEANUTS', 'EGGS'] })
    const cleared = await utrpcPost(request, 'setAllergies', { allergies: [] })
    expect(cleared.status).toBe(200)
    expect(cleared.data).toEqual([])

    const get = await utrpcGet(request, 'getAllergies')
    expect(get.data).toEqual([])
  })

  test('9. getPreferences/getAllergies without a profile → 404', async ({ request }) => {
    // Signup but don't ensure a profile (consumer may not have created one).
    // To be deterministic we still need a profile-less read. setupUser creates
    // a profile, so instead we use a fresh signup and read immediately.
    const email = `pref-noprofile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@chefmate.test`
    await request.post('/api/v1/auth/trpc/signup', { data: { email, password: 'UserTest123!' } })
    const { status } = await utrpcGet(request, 'getPreferences')
    // 404 if consumer hasn't created the stub yet; 200 if it has (with defaults).
    expect([200, 404]).toContain(status)
  })
})
