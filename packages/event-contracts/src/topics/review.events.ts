export const REVIEW_EVENTS_TOPIC = 'review.events'

export type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'REJECTED'

export type ReviewEvent =
  | {
      type: 'review.created'
      reviewId: string
      customerId: string
      chefId: string
      orderId: string
      rating: number
      createdAt: string
      version: '1'
    }
  | {
      type: 'review.published'
      reviewId: string
      customerId: string
      chefId: string
      orderId: string
      rating: number
      dishId?: string
      planId?: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'review.status_changed'
      reviewId: string
      customerId: string
      chefId: string
      orderId: string
      rating: number
      dishId?: string
      planId?: string
      oldStatus: ReviewStatus
      newStatus: ReviewStatus
      createdAt: string
      version: '1'
    }
  | {
      type: 'review.replied'
      reviewId: string
      customerId: string
      chefId: string
      orderId: string
      rating: number
      createdAt: string
      version: '1'
    }
