export const USER_EVENTS_TOPIC = 'user.events'

export type UserEvent =
  | {
      type: 'user.profile_updated'
      userId: string
      firstName: string
      lastName: string
      phone?: string
      profileImage?: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'user.preferences_updated'
      userId: string
      dietaryPreferences: string[]
      allergies: string[]
      dislikedIngredients: string[]
      spiceLevel: string
      favoriteCuisines: string[]
      createdAt: string
      version: '1'
    }
  | {
      type: 'user.deleted'
      userId: string
      createdAt: string
      version: '1'
    }
