export const MEDIA_EVENTS_TOPIC = 'media.events'

export type MediaEvent =
  | {
      type: 'media.uploaded'
      mediaId: string
      ownerId: string
      ownerType: 'chef' | 'dish' | 'plan'
      mimeType: string
      sizeBytes: number
      createdAt: string
      version: '1'
    }
  | {
      type: 'media.ready'
      mediaId: string
      ownerId: string
      thumbnailKey?: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'media.failed'
      mediaId: string
      ownerId: string
      reason: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'media.deleted'
      mediaId: string
      ownerId: string
      createdAt: string
      version: '1'
    }
