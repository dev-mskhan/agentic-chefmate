export const MEDIA_EVENTS_TOPIC = 'media.events'

export type MediaEvent =
  | {
      type: 'media.uploaded'
      mediaId: string
      chefId: string
      ownerType: 'chef' | 'dish' | 'plan'
      mimeType: string
      sizeBytes: number
      createdAt: string
      version: '1'
    }
  | {
      type: 'media.ready'
      mediaId: string
      chefId: string
      thumbnailKey?: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'media.failed'
      mediaId: string
      chefId: string
      reason: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'media.deleted'
      mediaId: string
      chefId: string
      createdAt: string
      version: '1'
    }
