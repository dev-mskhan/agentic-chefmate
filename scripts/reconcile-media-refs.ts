type MongooseLike = {
  connect(uri: string): Promise<unknown>
  disconnect(): Promise<void>
  connection: { db?: {
    collection(name: string): {
      find(filter: unknown, options?: unknown): { toArray(): Promise<Array<Record<string, unknown>>> }
      updateOne(filter: unknown, update: unknown): Promise<unknown>
    }
  } }
  Types: { ObjectId: new (value: string) => unknown }
}

const mongoose = require('../services/chef-service/node_modules/mongoose') as MongooseLike

type Reference = {
  collection: 'dishes' | 'mealplans' | 'chefprofiles'
  documentId: string
  field: 'mediaIds' | 'portfolioMediaIds'
  ownerId: string
  mediaIds: string[]
}

type ValidationResponse = { valid: boolean; invalidIds: string[] }

const dryRun = !process.argv.includes('--apply')
const mongoUri = process.env.MONGODB_URI
const mediaServiceUrl = process.env.MEDIA_SERVICE_URL ?? 'http://localhost:3007'
const internalSecret = process.env.INTERNAL_SECRET

if (!mongoUri || !internalSecret) {
  throw new Error('MONGODB_URI and INTERNAL_SECRET are required')
}

async function validateMediaIds(mediaIds: string[], ownerId: string): Promise<string[]> {
  if (mediaIds.length === 0 || !ownerId) return mediaIds

  const response = await fetch(`${mediaServiceUrl}/internal/media/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': internalSecret!,
    },
    body: JSON.stringify({ mediaIds, ownerId }),
  })
  if (!response.ok) {
    throw new Error(`Media validation failed: ${response.status} ${await response.text()}`)
  }

  const body = await response.json() as ValidationResponse
  return body.invalidIds
}

async function main(): Promise<void> {
  await mongoose.connect(mongoUri!)
  const db = mongoose.connection.db
  if (!db) throw new Error('MongoDB connection is not available')

  const profiles = await db.collection('chefprofiles')
    .find({}, { projection: { userId: 1 } })
    .toArray()
  const chefOwners = new Map<string, string>()
  for (const profile of profiles) {
    chefOwners.set(String(profile._id), String(profile.userId))
  }

  const references: Reference[] = []
  for (const collection of ['dishes', 'mealplans'] as const) {
    const documents = await db.collection(collection)
      .find({ mediaIds: { $exists: true, $ne: [] } }, { projection: { mediaIds: 1, chefId: 1 } })
      .toArray()
    for (const document of documents) {
      references.push({
        collection,
        documentId: String(document._id),
        field: 'mediaIds',
        ownerId: chefOwners.get(String(document.chefId)) ?? '',
        mediaIds: Array.isArray(document.mediaIds)
          ? document.mediaIds.map((mediaId) => String(mediaId))
          : [],
      })
    }
  }

  const profilesWithMedia = await db.collection('chefprofiles')
    .find({ portfolioMediaIds: { $exists: true, $ne: [] } }, { projection: { userId: 1, portfolioMediaIds: 1 } })
    .toArray()
  for (const profile of profilesWithMedia) {
    references.push({
      collection: 'chefprofiles',
      documentId: String(profile._id),
      field: 'portfolioMediaIds',
      ownerId: String(profile.userId),
      mediaIds: Array.isArray(profile.portfolioMediaIds)
        ? profile.portfolioMediaIds.map((mediaId) => String(mediaId))
        : [],
    })
  }

  const idsByOwner = new Map<string, Set<string>>()
  for (const reference of references) {
    const ids = idsByOwner.get(reference.ownerId) ?? new Set<string>()
    reference.mediaIds.forEach((mediaId) => ids.add(mediaId))
    idsByOwner.set(reference.ownerId, ids)
  }

  const invalidByOwner = new Map<string, Set<string>>()
  for (const [ownerId, ids] of idsByOwner) {
    const invalidIds = await validateMediaIds([...ids], ownerId)
    invalidByOwner.set(ownerId, new Set(invalidIds))
  }

  const invalidReferences = references
    .map((reference) => ({
      ...reference,
      invalidIds: reference.mediaIds.filter((mediaId) =>
        !reference.ownerId || invalidByOwner.get(reference.ownerId)?.has(mediaId),
      ),
    }))
    .filter((reference) => reference.invalidIds.length > 0)

  if (!dryRun) {
    for (const reference of invalidReferences) {
      await db.collection(reference.collection).updateOne(
        { _id: new mongoose.Types.ObjectId(reference.documentId) },
        { $pull: { [reference.field]: { $in: reference.invalidIds } } },
      )
    }
  }

  const report = {
    dryRun,
    checked: {
      documents: references.length,
      references: references.reduce((total, reference) => total + reference.mediaIds.length, 0),
      uniqueMediaIds: new Set(references.flatMap((reference) => reference.mediaIds)).size,
    },
    invalidReferences: invalidReferences.map((reference) => ({
      collection: reference.collection,
      documentId: reference.documentId,
      ownerId: reference.ownerId,
      field: reference.field,
      invalidIds: reference.invalidIds,
    })),
    removedReferences: dryRun
      ? 0
      : invalidReferences.reduce((total, reference) => total + reference.invalidIds.length, 0),
  }
  console.log(JSON.stringify(report, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
