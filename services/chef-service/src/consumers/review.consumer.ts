import { isEventProcessed, markEventProcessed } from '@chefmate/event-contracts'
import type { ReviewEvent } from '@chefmate/event-contracts'
import { ReviewShadow } from '../models/review-shadow.model'
import { ChefProfile } from '../models/chef-profile.model'
import { Dish } from '../models/dish.model'
import { MealPlan } from '../models/meal-plan.model'

// ─── Aggregate helpers ────────────────────────────────────────────────────────

import mongoose from 'mongoose'
import Redis from 'ioredis'
import { config } from '../config'

let redisClient: Redis | null = null
function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null })
  }
  return redisClient
}

async function recalculateChefAggregate(chefId: string): Promise<void> {
  const [result] = await ReviewShadow.aggregate([
    { $match: { chefId, status: 'PUBLISHED' } },
    {
      $group: {
        _id:           null,
        averageRating: { $avg: '$rating' },
        totalReviews:  { $sum: 1 },
      },
    },
  ])

  const averageRating = result
    ? Math.round((result.averageRating as number) * 100) / 100
    : 0
  const totalReviews = result ? (result.totalReviews as number) : 0

  const filter: Record<string, unknown>[] = [{ userId: chefId }]
  if (mongoose.isValidObjectId(chefId)) {
    filter.push({ _id: new mongoose.Types.ObjectId(chefId) })
  }

  const updated = await ChefProfile.findOneAndUpdate(
    { $or: filter },
    { $set: { averageRating, totalReviews } },
    { new: true },
  )

  if (updated) {
    const redis = getRedisClient()
    const pId = updated._id.toString()
    await redis.del(`chef:${pId}:profile`, `chef:${updated.userId}:profile`).catch(() => {})
  }
}

async function recalculateDishAggregate(dishId: string): Promise<void> {
  const [result] = await ReviewShadow.aggregate([
    { $match: { dishId, status: 'PUBLISHED' } },
    {
      $group: {
        _id:           null,
        averageRating: { $avg: '$rating' },
        totalReviews:  { $sum: 1 },
      },
    },
  ])

  const averageRating = result
    ? Math.round((result.averageRating as number) * 100) / 100
    : 0
  const totalReviews = result ? (result.totalReviews as number) : 0

  await Dish.findByIdAndUpdate(dishId, { $set: { averageRating, totalReviews } })
}

async function recalculatePlanAggregate(planId: string): Promise<void> {
  const [result] = await ReviewShadow.aggregate([
    { $match: { planId, status: 'PUBLISHED' } },
    {
      $group: {
        _id:           null,
        averageRating: { $avg: '$rating' },
        totalReviews:  { $sum: 1 },
      },
    },
  ])

  const averageRating = result
    ? Math.round((result.averageRating as number) * 100) / 100
    : 0
  const totalReviews = result ? (result.totalReviews as number) : 0

  await MealPlan.findByIdAndUpdate(planId, { $set: { averageRating, totalReviews } })
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function handleReviewEvent(event: ReviewEvent): Promise<void> {
  const eventId = (event as ReviewEvent & { eventId: string }).eventId
  if (await isEventProcessed(eventId)) return
  if (event.type === 'review.published') {
    // Upsert the shadow document
    await ReviewShadow.findOneAndUpdate(
      { reviewId: event.reviewId },
      {
        $setOnInsert: {
          reviewId: event.reviewId,
          chefId:   event.chefId,
          dishId:   event.dishId,
          planId:   event.planId,
          rating:   event.rating,
          status:   'PUBLISHED',
        },
      },
      { upsert: true, new: true },
    )

    // Recalculate aggregates
    await recalculateChefAggregate(event.chefId)
    if (event.dishId) await recalculateDishAggregate(event.dishId)
    if (event.planId) await recalculatePlanAggregate(event.planId)

    await markEventProcessed(eventId)
  } else if (event.type === 'review.status_changed') {
    // Update the shadow document status
    await ReviewShadow.findOneAndUpdate(
      { reviewId: event.reviewId },
      { $set: { status: event.newStatus } },
    )

    // Recalculate aggregates for affected entities
    if (event.oldStatus === 'PUBLISHED' || event.newStatus === 'PUBLISHED') {
      await recalculateChefAggregate(event.chefId)
      if (event.dishId) await recalculateDishAggregate(event.dishId)
      if (event.planId) await recalculatePlanAggregate(event.planId)
      await markEventProcessed(eventId)
    }
  }
}
