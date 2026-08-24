import mongoose from 'mongoose'

const mongoUri = process.env.MONGODB_URI
const dryRun = process.argv.includes('--dry-run')

if (!mongoUri) throw new Error('MONGODB_URI is required')

async function main(): Promise<void> {
  await mongoose.connect(mongoUri!)
  const collection = mongoose.connection.collection('notifications')
  const cursor = collection.find({
    channelStatus: { $exists: false },
    status: { $in: ['pending', 'delivered', 'failed'] },
  })

  let scanned = 0
  let migrated = 0
  while (await cursor.hasNext()) {
    const document = await cursor.next()
    if (!document) continue
    scanned++
    const status = document.status as 'pending' | 'delivered' | 'failed'
    const channelStatus = {
      inApp: {
        status,
        ...(status === 'delivered' && document.deliveredAt ? { sentAt: document.deliveredAt } : {}),
      },
      email: { status: 'skipped' },
      push: { status: 'skipped' },
    }

    if (!dryRun) {
      await collection.updateOne(
        { _id: document._id, channelStatus: { $exists: false } },
        { $set: { channelStatus }, $unset: { status: '', deliveredAt: '', failedReason: '' } },
      )
    }
    migrated++
  }

  console.log(JSON.stringify({ dryRun, scanned, migrated }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
