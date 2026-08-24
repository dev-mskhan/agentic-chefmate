import type { MediaEvent } from '@chefmate/event-contracts'
import { isEventProcessed, markEventProcessed } from '@chefmate/event-contracts'
import { Dish } from '../models/dish.model'
import { MealPlan } from '../models/meal-plan.model'
import { ChefProfile } from '../models/chef-profile.model'

/**
 * Handles media.events from the media-service.
 *
 * On `media.deleted`, removes the deleted mediaId from any dishes, meal plans,
 * and chef profiles that reference it. This keeps the chef-service's mediaId
 * arrays in sync when a media asset is soft-deleted in the media-service.
 */
export async function handleMediaEvent(event: MediaEvent): Promise<void> {
  const eventId = (event as MediaEvent & { eventId: string }).eventId
  if (await isEventProcessed(eventId)) return

  if (event.type === 'media.deleted' || event.type === 'media.failed') {
    const { mediaId } = event

    // Remove from all dishes that reference this mediaId
    await Dish.updateMany(
      { mediaIds: mediaId },
      { $pull: { mediaIds: mediaId } },
    )

    // Remove from all meal plans that reference this mediaId
    await MealPlan.updateMany(
      { mediaIds: mediaId },
      { $pull: { mediaIds: mediaId } },
    )

    // Remove from all chef profiles that reference this mediaId
    await ChefProfile.updateMany(
      { portfolioMediaIds: mediaId },
      { $pull: { portfolioMediaIds: mediaId } },
    )
  }

  await markEventProcessed(eventId)
}
