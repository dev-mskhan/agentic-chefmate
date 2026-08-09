export interface UploadUrlResult {
  uploadUrl: string
  objectKey: string
  expiresAt: Date
}

export interface DownloadUrlResult {
  downloadUrl: string
  expiresAt: Date
}

export interface ObjectStorage {
  getSignedUploadUrl(
    objectKey: string,
    mimeType: string,
    expiresInSeconds?: number,
  ): Promise<UploadUrlResult>

  getSignedDownloadUrl(
    objectKey: string,
    expiresInSeconds?: number,
  ): Promise<DownloadUrlResult>

  uploadBuffer(objectKey: string, buffer: Buffer, mimeType: string): Promise<void>

  deleteObject(objectKey: string): Promise<void>

  exists(objectKey: string): Promise<boolean>

  getBuffer(key: string): Promise<Buffer>
}
