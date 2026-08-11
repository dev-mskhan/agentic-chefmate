export const CHEF_EVENTS_TOPIC = 'chef.events'

export type ChefEvent =
  | {
      type: 'chef.onboarded'
      chefId: string
      userId: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'chef.profile_updated'
      chefId: string
      changedFields: string[]
      createdAt: string
      version: '1'
    }
  | {
      type: 'chef.plan_published'
      chefId: string
      planId: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'chef.plan_unpublished'
      chefId: string
      planId: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'chef.approval_pending'
      chefId: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'chef.approved'
      chefId: string
      approvedBy: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'chef.suspended'
      chefId: string
      reason: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'chef.created'
      chefId: string
      userId: string
      displayName: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'chef.updated'
      chefId: string
      changedFields: string[]
      createdAt: string
      version: '1'
    }
  | {
      type: 'chef.status_changed'
      chefId: string
      oldStatus: string
      newStatus: string
      changedBy?: string
      reason?: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'chef.service_area_updated'
      chefId: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'chef.specialties_updated'
      chefId: string
      cuisineSpecialties: string[]
      createdAt: string
      version: '1'
    }
  | {
      type: 'dish.created'
      dishId: string
      chefId: string
      name: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'dish.updated'
      dishId: string
      chefId: string
      changedFields: string[]
      createdAt: string
      version: '1'
    }
  | {
      type: 'dish.archived'
      dishId: string
      chefId: string
      createdAt: string
      version: '1'
    }
