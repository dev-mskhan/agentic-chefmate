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
