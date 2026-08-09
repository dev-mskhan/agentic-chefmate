import { Kafka } from 'kafkajs'
import { createConsumer, TypedConsumer, AUTH_EVENTS_TOPIC, AuthEvent } from '@chefmate/event-contracts'
import { createLogger } from '@chefmate/logger'
import type Redis from 'ioredis'
import { UserProfile } from '../models/user-profile.model'
import { RedisCacheService } from '../services/redis-cache.service'

const logger = createLogger('user-service:auth-consumer')

let consumer: TypedConsumer | null = null

export async function startAuthConsumer(broker: string, redis: Redis): Promise<void> {
  const kafka = new Kafka({
    clientId: 'user-service-consumer',
    brokers: [broker],
  })

  const cacheService = new RedisCacheService(redis)

  consumer = createConsumer(kafka, 'user-service-auth')
  await consumer.connect()

  await consumer.subscribe<AuthEvent>(AUTH_EVENTS_TOPIC, async (event) => {
    switch (event.type) {
      case 'user.registered': {
        try {
          await UserProfile.create({
            userId:    event.userId,
            firstName: '',
            lastName:  '',
          })
          logger.info({ userId: event.userId }, 'Created UserProfile for registered user')
        } catch (err: any) {
          if (err?.code === 11000) {
            // Duplicate key — profile already exists, safe to ignore
            logger.warn({ userId: event.userId }, 'UserProfile already exists for user.registered — skipping')
          } else {
            throw err
          }
        }
        break
      }

      case 'user.deleted': {
        await UserProfile.deleteOne({ userId: event.userId })
        await cacheService.invalidateAll(event.userId)
        logger.info({ userId: event.userId }, 'Deleted UserProfile for deleted user')
        break
      }

      default: {
        logger.warn({ type: (event as AuthEvent).type }, 'Unknown auth event type — skipping')
        break
      }
    }
  })

  logger.info('Auth consumer started')
}

export async function stopAuthConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect()
    consumer = null
    logger.info('Auth consumer stopped')
  }
}
