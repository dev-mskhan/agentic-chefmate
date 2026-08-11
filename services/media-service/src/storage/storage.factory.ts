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
        forcePathStyle: true, // required for MinIO path-style bucket addressing
      })

    case 'r2':
      // Cloudflare R2 — S3-compatible, no path-style, endpoint format:
      // https://<account-id>.r2.cloudflarestorage.com
      return new S3Storage({
        endpoint: config.R2_ENDPOINT,
        region: 'auto', // R2 requires region 'auto'
        accessKeyId: config.R2_ACCESS_KEY_ID!,
        secretAccessKey: config.R2_SECRET_ACCESS_KEY!,
        bucket: config.R2_BUCKET!,
        forcePathStyle: false,
      })

    case 's3':
      return new S3Storage({
        region: config.AWS_REGION!,
        accessKeyId: config.AWS_ACCESS_KEY_ID!,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY!,
        bucket: config.AWS_S3_BUCKET!,
        forcePathStyle: false,
      })

    default: {
      const _exhaustiveCheck: never = config.STORAGE_PROVIDER
      throw new Error(`Unknown STORAGE_PROVIDER: ${_exhaustiveCheck}`)
    }
  }
}
