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

// ── Phase 5: Schedule / Availability procedures ──────────────────────────────
import { getChefScheduleProcedure }        from './procedures/get-chef-schedule'
import { upsertChefScheduleProcedure }     from './procedures/upsert-chef-schedule'
import { addBlackoutDateProcedure }        from './procedures/add-blackout-date'
import { removeBlackoutDateProcedure }     from './procedures/remove-blackout-date'
import { addOneOffDateProcedure }          from './procedures/add-one-off-date'
import { removeOneOffDateProcedure }       from './procedures/remove-one-off-date'
import { updateCapacityProcedure }         from './procedures/update-capacity'
import { updateDeliveryZonesProcedure }    from './procedures/update-delivery-zones'
import { checkChefAvailabilityProcedure }  from './procedures/check-chef-availability'

// ── Phase 6: Meal Plan procedures ─────────────────────────────────────────────
import { createPlanProcedure }       from './procedures/create-plan'
import { getPlanProcedure }          from './procedures/get-plan'
import { listChefPlansProcedure }    from './procedures/list-chef-plans'
import { updatePlanProcedure }       from './procedures/update-plan'
import { managePlanTiersProcedure }  from './procedures/manage-plan-tiers'
import { managePlanMediaProcedure }  from './procedures/manage-plan-media'
import { activatePlanProcedure }     from './procedures/activate-plan'
import { pausePlanProcedure }        from './procedures/pause-plan'
import { archivePlanProcedure }      from './procedures/archive-plan'

// ── Geo Discovery procedures (public, no auth) ────────────────────────────────
import { discoverChefsProcedure }  from './procedures/discover-chefs'
import { discoverDishesProcedure } from './procedures/discover-dishes'

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

  // ── Schedule / Availability procedures (Phase 5) ─────────────────────────────
  getChefSchedule:       getChefScheduleProcedure,
  upsertChefSchedule:    upsertChefScheduleProcedure,
  addBlackoutDate:       addBlackoutDateProcedure,
  removeBlackoutDate:    removeBlackoutDateProcedure,
  addOneOffDate:         addOneOffDateProcedure,
  removeOneOffDate:      removeOneOffDateProcedure,
  updateCapacity:        updateCapacityProcedure,
  updateDeliveryZones:   updateDeliveryZonesProcedure,
  checkChefAvailability: checkChefAvailabilityProcedure,

  // ── Meal Plan procedures (Phase 6) ───────────────────────────────────────────
  createPlan:      createPlanProcedure,
  getPlan:         getPlanProcedure,
  listChefPlans:   listChefPlansProcedure,
  updatePlan:      updatePlanProcedure,
  managePlanTiers: managePlanTiersProcedure,
  managePlanMedia: managePlanMediaProcedure,
  activatePlan:    activatePlanProcedure,
  pausePlan:       pausePlanProcedure,
  archivePlan:     archivePlanProcedure,

  // ── Geo Discovery procedures (public, no auth) ────────────────────────────────
  discoverChefs:  discoverChefsProcedure,
  discoverDishes: discoverDishesProcedure,
})

export type AppRouter = typeof appRouter
