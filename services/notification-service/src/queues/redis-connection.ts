import { config } from '../config'

export function getBullMQConnection(): { host: string; port: number; maxRetriesPerRequest: null } {
  const url = new URL(config.REDIS_URL!)
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    maxRetriesPerRequest: null,
  }
}
