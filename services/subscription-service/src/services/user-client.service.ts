import { config } from '../config'
import { NotFoundError, ValidationError } from '@chefmate/errors'

export interface AddressSnapshot {
  addressId:             string
  label:                 string
  addressLine:           string
  area?:                 string
  city:                  string
  province?:             string
  postalCode?:           string
  location?:             { type: 'Point'; coordinates: [number, number] }
  deliveryInstructions?: string
}

export async function fetchAddressSnapshot(
  customerId:    string,
  customerEmail: string,
  addressId:     string,
): Promise<AddressSnapshot> {
  const base = config.USER_SERVICE_URL
  const inputParam = encodeURIComponent(JSON.stringify({}))
  const url = `${base}/trpc/getAddresses?input=${inputParam}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id':    customerId,
      'X-User-Role':  'USER',
      'X-User-Email': customerEmail,
    },
  })

  if (!res.ok) throw new ValidationError(`Failed to fetch addresses from user-service: ${res.status}`)

  const body = await res.json() as {
    statusCode?: number
    data?: Array<{ _id: string; label: string; addressLine: string; area?: string
      city: string; province?: string; postalCode?: string
      location?: { type: 'Point'; coordinates: [number, number] }
      deliveryInstructions?: string; isDefault: boolean }>
    message?: string
  }

  const addresses = body.data ?? []
  const addr = addresses.find((a) => a._id === addressId)
  if (!addr) throw new NotFoundError(`Address ${addressId} not found in your profile`)

  return {
    addressId: addr._id, label: addr.label, addressLine: addr.addressLine,
    area: addr.area, city: addr.city, province: addr.province,
    postalCode: addr.postalCode, location: addr.location,
    deliveryInstructions: addr.deliveryInstructions,
  }
}
