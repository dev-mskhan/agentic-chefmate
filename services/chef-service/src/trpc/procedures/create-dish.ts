import { z } from 'zod'
import { NotFoundError, ValidationError } from '@chefmate/errors'
import { chefProcedure } from '../trpc'
import { ChefProfile } from '../../models/chef-profile.model'
import { Dish, DietaryTagValues, AllergenValues, OccasionTagValues, ALLOWED_CURRENCIES, WEEK_DAYS } from '../../models/dish.model'
import { publishChefEvent } from '../../services/event.service'
import { CUISINE_CATEGORIES } from '../../constants/cuisine-categories'

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

const ingredientInputSchema = z.object({
  name:     z.string().min(1).max(80),
  quantity: z.number().positive(),
  unit:     z.string().min(1).max(20),
})

const availabilityInputSchema = z.object({
  isAvailable:    z.boolean().optional(),
  availableDays:  z.array(z.enum(WEEK_DAYS)).optional(),
  availableFrom:  z.string().regex(TIME_REGEX, 'Must be HH:MM format').optional(),
  availableUntil: z.string().regex(TIME_REGEX, 'Must be HH:MM format').optional(),
})

const createDishInput = z.object({
  name:          z.string().min(2).max(100).trim(),
  description:   z.string().max(500).optional(),
  ingredients:   z.array(ingredientInputSchema).max(50).optional(),
  price:         z.number().positive().max(999999),
  currency:      z.enum(ALLOWED_CURRENCIES).optional(),
  portionInfo:   z.string().max(200).optional(),
  dietaryTags:   z.array(z.enum(DietaryTagValues)).optional(),
  allergens:     z.array(z.enum(AllergenValues)).optional(),
  cuisine:       z.string().optional(),
  category:      z.string().max(60).optional(),
  occasionTags:  z.array(z.enum(OccasionTagValues)).optional(),
  mediaIds:      z.array(z.string().min(1)).max(10).optional(),
  availability:  availabilityInputSchema.optional(),
})

export const createDishProcedure = chefProcedure
  .input(createDishInput)
  .mutation(async ({ ctx, input }) => {
    const { userId } = ctx.principal

    const chef = await ChefProfile.findOne({ userId })
    if (!chef) {
      throw new NotFoundError('Chef profile not found')
    }

    // Validate price decimal places (max 2)
    if (!isValidPriceDecimal(input.price)) {
      throw new ValidationError('Price must have at most 2 decimal places')
    }

    // Validate cuisine if provided
    if (input.cuisine && !(CUISINE_CATEGORIES as readonly string[]).includes(input.cuisine)) {
      throw new ValidationError(`Invalid cuisine category: ${input.cuisine}`)
    }

    // Deduplicate tag arrays
    const dietaryTags  = input.dietaryTags  ? [...new Set(input.dietaryTags)]  : []
    const allergens    = input.allergens    ? [...new Set(input.allergens)]    : []
    const occasionTags = input.occasionTags ? [...new Set(input.occasionTags)] : []
    const mediaIds     = input.mediaIds     ? [...new Set(input.mediaIds)]     : []

    const chefId = chef._id.toString()

    const dish = await Dish.create({
      chefId,
      name:         input.name,
      description:  input.description,
      ingredients:  input.ingredients ?? [],
      price:        input.price,
      currency:     input.currency ?? 'PKR',
      portionInfo:  input.portionInfo,
      dietaryTags,
      allergens,
      cuisine:      input.cuisine,
      category:     input.category,
      occasionTags,
      mediaIds,
      availability: input.availability,
      status:       'DRAFT',
    })

    await publishChefEvent({
      type:      'dish.created',
      dishId:    dish._id.toString(),
      chefId,
      name:      dish.name,
      createdAt: new Date().toISOString(),
      version:   '1',
    })

    return dish.toObject()
  })

export function isValidPriceDecimal(price: number): boolean {
  const str = price.toString()
  const dotIdx = str.indexOf('.')
  if (dotIdx === -1) return true
  return str.length - dotIdx - 1 <= 2
}
