/**
 * Cross-service client for User Service.
 *
 * Order Service calls User Service to validate and snapshot a customer's
 * delivery address. All communication is HTTP — no direct MongoDB access.
 *
 * User Service exposes addresses via the tRPC procedure:
 *   GET /trpc/getAddresses?input=<urlencoded JSON>
 *
 * tRPC query procedures require the input to be passed as a URL-encoded JSON
 * string in the `input` query param. Since getAddresses takes no input, we
 * pass `{}`.
 */

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

/**
 * Fetches the authenticated customer's addresses from User Service and finds
 * the requested address by ID.
 *
 * Makes a service-to-service tRPC GET call, passing the customer's identity
 * via X-User-* headers (same mechanism the gateway uses).
 *
 * Throws:
 *  - NotFoundError if the address does not exist in the user's profile.
 *  - ValidationError if the User Service call fails.
 */
export async function fetchAddressSnapshot(
  customerId:    string,
  customerEmail: string,
  addressId:     string,
): Promise<AddressSnapshot> {
  const base = config.USER_SERVICE_URL

  // tRPC query input must be URL-encoded JSON in the `input` query param.
  // getAddresses takes no input, so we pass an empty object.
  const inputParam = encodeURIComponent(JSON.stringify({}))
  const url = `${base}/trpc/getAddresses?input=${inputParam}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Pass customer's identity so user-service protectedProcedure can
      // verify the request and scope addresses to the correct user.
      'X-User-Id':    customerId,
      'X-User-Role':  'USER',
      'X-User-Email': customerEmail,
    },
  })

  if (!res.ok) {
    throw new ValidationError(`Failed to fetch addresses from user-service: ${res.status}`)
  }

  // The @chefmate/trpc flattenTRPCResponse middleware rewrites the tRPC wire
  // format to { statusCode, data, message }, so body.data is the address array.
  const body = await res.json() as any

  const addresses: Array<{
    _id:                  string
    label:                string
    addressLine:          string
    area?:                string
    city:                 string
    province?:            string
    postalCode?:          string
    location?:            { type: 'Point'; coordinates: [number, number] }
    deliveryInstructions?: string
    isDefault:            boolean
  }> = body.data ?? body.result?.data ?? (Array.isArray(body) ? body : [])
  const addr = addresses.find((a) => String(a._id) === String(addressId))

  if (!addr) {
    throw new NotFoundError(`Address ${addressId} not found in your profile`)
  }

  return {
    addressId:            addr._id,
    label:                addr.label,
    addressLine:          addr.addressLine,
    area:                 addr.area,
    city:                 addr.city,
    province:             addr.province,
    postalCode:           addr.postalCode,
    location:             addr.location,
    deliveryInstructions: addr.deliveryInstructions,
  }
}
