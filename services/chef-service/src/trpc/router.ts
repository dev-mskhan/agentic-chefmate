import { router } from './trpc'

import { getChefProfileProcedure }         from './procedures/get-chef-profile'
import { getMyChefProfileProcedure }        from './procedures/get-my-chef-profile'
import { createChefProfileProcedure }       from './procedures/create-chef-profile'
import { updateChefProfileProcedure }       from './procedures/update-chef-profile'
import { updateCuisineSpecialtiesProcedure } from './procedures/update-cuisine-specialties'
import { updateServiceAreaProcedure }        from './procedures/update-service-area'
import { getChefStatusProcedure }           from './procedures/get-chef-status'
import { updateChefStatusProcedure }        from './procedures/update-chef-status'

export const appRouter = router({
  getChefProfile:           getChefProfileProcedure,
  getMyChefProfile:         getMyChefProfileProcedure,
  createChefProfile:        createChefProfileProcedure,
  updateChefProfile:        updateChefProfileProcedure,
  updateCuisineSpecialties: updateCuisineSpecialtiesProcedure,
  updateServiceArea:        updateServiceAreaProcedure,
  getChefStatus:            getChefStatusProcedure,
  updateChefStatus:         updateChefStatusProcedure,
})

export type AppRouter = typeof appRouter
