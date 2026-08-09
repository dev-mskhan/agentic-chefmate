import type { MediaConfig } from '../config'
import type { ObjectStorage } from './storage.interface'
import { S3Storage } from './s3.storage'

export function createStorage(config: MediaConfig): ObjectStorage {
  switch (config.STORAGE_PROVIDER) {
    case 'minio':
      return new S3Storage({
        endpoint: config.MINIO_ENDPOINT,
        region: 'us-east-1',
        accessKeyId: config.MINIO_ACCESS_KEY,
        secretAccessKey: config.MINIO_SECRET_KEY,
        bucket: config.MINIO_BUCKET,
        forcePathStyle: true,
      })

    case 'r2':
      throw new Error('R2 storage provider is not yet implemented')

    case 's3':
      throw new Error('S3 storage provider is not yet implemented')

    default: {
      const _exhaustiveCheck: never = config.STORAGE_PROVIDER
      throw new Error(`Unknown STORAGE_PROVIDER: ${_exhaustiveCheck}`)
    }
  }
}
