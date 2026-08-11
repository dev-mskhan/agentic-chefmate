import { router } from './trpc'

// Profile procedures
import { getMeProcedure } from './procedures/get-me'
import { updateMeProcedure } from './procedures/update-me'

// Address procedures
import { getAddressesProcedure } from './procedures/get-addresses'
import { createAddressProcedure } from './procedures/create-address'
import { updateAddressProcedure } from './procedures/update-address'
import { deleteAddressProcedure } from './procedures/delete-address'
import { setDefaultAddressProcedure } from './procedures/set-default-address'

// Preferences procedures
import { getPreferencesProcedure } from './procedures/get-preferences'
import { updatePreferencesProcedure } from './procedures/update-preferences'

// Allergies procedures
import { getAllergiesProcedure } from './procedures/get-allergies'
import { setAllergiesProcedure } from './procedures/set-allergies'

// Favorites procedures
import { getFavoritesProcedure } from './procedures/get-favorites'
import { addFavoriteChefProcedure } from './procedures/add-favorite-chef'
import { removeFavoriteChefProcedure } from './procedures/remove-favorite-chef'
import { addFavoriteDishProcedure } from './procedures/add-favorite-dish'
import { removeFavoriteDishProcedure } from './procedures/remove-favorite-dish'
import { addFavoritePlanProcedure } from './procedures/add-favorite-plan'
import { removeFavoritePlanProcedure } from './procedures/remove-favorite-plan'

// Notification preferences procedures
import { getNotifPrefsProcedure } from './procedures/get-notif-prefs'
import { updateNotifPrefsProcedure } from './procedures/update-notif-prefs'

// Data export
import { exportDataProcedure } from './procedures/export-data'

export const appRouter = router({
  // Profile
  getMe:    getMeProcedure,
  updateMe: updateMeProcedure,

  // Addresses
  getAddresses:      getAddressesProcedure,
  createAddress:     createAddressProcedure,
  updateAddress:     updateAddressProcedure,
  deleteAddress:     deleteAddressProcedure,
  setDefaultAddress: setDefaultAddressProcedure,

  // Preferences
  getPreferences:    getPreferencesProcedure,
  updatePreferences: updatePreferencesProcedure,

  // Allergies
  getAllergies: getAllergiesProcedure,
  setAllergies: setAllergiesProcedure,

  // Favorites
  getFavorites:       getFavoritesProcedure,
  addFavoriteChef:    addFavoriteChefProcedure,
  removeFavoriteChef: removeFavoriteChefProcedure,
  addFavoriteDish:    addFavoriteDishProcedure,
  removeFavoriteDish: removeFavoriteDishProcedure,
  addFavoritePlan:    addFavoritePlanProcedure,
  removeFavoritePlan: removeFavoritePlanProcedure,

  // Notification preferences
  getNotifPrefs:    getNotifPrefsProcedure,
  updateNotifPrefs: updateNotifPrefsProcedure,

  // Data export
  exportData: exportDataProcedure,
})

export type AppRouter = typeof appRouter
