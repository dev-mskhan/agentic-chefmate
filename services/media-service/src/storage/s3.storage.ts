import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { ObjectStorage, UploadUrlResult, DownloadUrlResult } from './storage.interface'

export interface S3StorageOptions {
  endpoint?: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  forcePathStyle: boolean
}

export class S3Storage implements ObjectStorage {
  private readonly client: S3Client
  private readonly bucket: string

  constructor(options: S3StorageOptions) {
    this.bucket = options.bucket
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      forcePathStyle: options.forcePathStyle,
    })
  }

  async getSignedUploadUrl(
    objectKey: string,
    mimeType: string,
    expiresInSeconds = 900,
  ): Promise<UploadUrlResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: mimeType,
    })

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    })

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)

    return { uploadUrl, objectKey, expiresAt }
  }

  async getSignedDownloadUrl(
    objectKey: string,
    expiresInSeconds = 3600,
  ): Promise<DownloadUrlResult> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    })

    const downloadUrl = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    })

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)

    return { downloadUrl, expiresAt }
  }

  async uploadBuffer(objectKey: string, buffer: Buffer, mimeType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: mimeType,
      ContentLength: buffer.length,
    })

    await this.client.send(command)
  }

  async deleteObject(objectKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    })

    await this.client.send(command)
  }

  async exists(objectKey: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      })
      await this.client.send(command)
      return true
    } catch (err: unknown) {
      // NoSuchKey or NotFound means the object doesn't exist
      if (
        err instanceof Error &&
        (err.name === 'NoSuchKey' || err.name === 'NotFound' || err.name === '404')
      ) {
        return false
      }
      // Re-throw unexpected errors
      throw err
    }
  }
}
