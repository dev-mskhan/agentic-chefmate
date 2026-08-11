import { router } from './trpc'

import { getChefProfileProcedure }         from './procedures/get-chef-profile'
import { getMyChefProfileProcedure }        from './procedures/get-my-chef-profile'
import { createChefProfileProcedure }       from './procedures/create-chef-profile'
import { updateChefProfileProcedure }       from './procedures/update-chef-profile'
import { updateCuisineSpecialtiesProcedure } from './procedures/update-cuisine-specialties'
import { updateServiceAreaProcedure }        from './procedures/update-service-area'
import { getChefStatusProcedure }           from './procedures/get-chef-status'
import { updateChefStatusProcedure }        from './procedures/update-chef-status'

// ── Phase 3: Dish procedures ─────────────────────────────────────────────────
import { createDishProcedure }       from './procedures/create-dish'
import { getDishProcedure }          from './procedures/get-dish'
import { listChefDishesProcedure }   from './procedures/list-chef-dishes'
import { updateDishProcedure }       from './procedures/update-dish'
import { archiveDishProcedure }      from './procedures/archive-dish'
import { activateDishProcedure }     from './procedures/activate-dish'
import { deactivateDishProcedure }   from './procedures/deactivate-dish'
import { manageDishMediaProcedure }  from './procedures/manage-dish-media'
import { manageIngredientsProcedure } from './procedures/manage-ingredients'
import { managePricingProcedure }    from './procedures/manage-pricing'
import { manageAvailabilityProcedure } from './procedures/manage-availability'

// ── Phase 4: Metadata procedures (public, no auth) ───────────────────────────
import { listCuisineCategoriesProcedure } from './procedures/list-cuisine-categories'
import { listOccasionTagsProcedure }      from './procedures/list-occasion-tags'
import { listDietaryTagsProcedure }       from './procedures/list-dietary-tags'
import { listAllergensProcedure }         from './procedures/list-allergens'

export const appRouter = router({
  // ── Chef profile procedures (Phase 1) ────────────────────────────────────────
  getChefProfile:           getChefProfileProcedure,
  getMyChefProfile:         getMyChefProfileProcedure,
  createChefProfile:        createChefProfileProcedure,
  updateChefProfile:        updateChefProfileProcedure,
  updateCuisineSpecialties: updateCuisineSpecialtiesProcedure,
  updateServiceArea:        updateServiceAreaProcedure,
  getChefStatus:            getChefStatusProcedure,
  updateChefStatus:         updateChefStatusProcedure,

  // ── Dish procedures (Phase 3) ─────────────────────────────────────────────────
  createDish:          createDishProcedure,
  getDish:             getDishProcedure,
  listChefDishes:      listChefDishesProcedure,
  updateDish:          updateDishProcedure,
  archiveDish:         archiveDishProcedure,
  activateDish:        activateDishProcedure,
  deactivateDish:      deactivateDishProcedure,
  manageDishMedia:     manageDishMediaProcedure,
  manageIngredients:   manageIngredientsProcedure,
  managePricing:       managePricingProcedure,
  manageAvailability:  manageAvailabilityProcedure,

  // ── Metadata procedures (Phase 4) — public, no auth ─────────────────────────
  listCuisineCategories: listCuisineCategoriesProcedure,
  listOccasionTags:      listOccasionTagsProcedure,
  listDietaryTags:       listDietaryTagsProcedure,
  listAllergens:         listAllergensProcedure,
})

export type AppRouter = typeof appRouter
