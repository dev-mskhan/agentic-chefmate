import { defineConfig } from '@playwright/test'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: false })

const AUTH_URL         = process.env['AUTH_SERVICE_URL']         ?? 'http://localhost:3001'
const GATEWAY_URL      = process.env['GATEWAY_URL']              ?? 'http://localhost:3000'
const USER_URL         = process.env['USER_SERVICE_URL']         ?? 'http://localhost:3002'
const CHEF_URL         = process.env['CHEF_SERVICE_URL']         ?? 'http://localhost:3003'
const ORDER_URL        = process.env['ORDER_SERVICE_URL']        ?? 'http://localhost:3004'
const PAYMENT_URL      = process.env['PAYMENT_SERVICE_URL']      ?? 'http://localhost:3008'
const SUBSCRIPTION_URL = process.env['SUBSCRIPTION_SERVICE_URL'] ?? 'http://localhost:3009'
const PAYOUT_URL       = process.env['PAYOUT_SERVICE_URL']       ?? 'http://localhost:3012'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: [['list']],

  use: {
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },

  projects: [
    {
      // Chef-service tests run through the gateway (GATEWAY_URL), not the
      // chef-service directly, so that cookie auth, the auth-verify hook,
      // role gating, and proxy behaviour are exercised end-to-end.
      name: 'chef-via-gateway',
      use: { baseURL: GATEWAY_URL },
      testMatch: 'tests/chef/**/*.spec.ts',
    },
    {
      // User-service tests run through the gateway (GATEWAY_URL), not the
      // user-service directly, so that cookie auth, the auth-verify hook,
      // role gating, and proxy behaviour are exercised end-to-end.
      name: 'user-via-gateway',
      use: { baseURL: GATEWAY_URL },
      testMatch: 'tests/users/**/*.spec.ts',
    },
    {
      // Auth tests run through the gateway (GATEWAY_URL), not the auth
      // service directly, so that cookie auth, JWKS verification, the
      // auth-verify hook, and proxy behaviour are exercised end-to-end.
      name: 'auth-via-gateway',
      use: { baseURL: GATEWAY_URL },
      testMatch: 'tests/auth/**/*.spec.ts',
    },
    {
      // Media-service tests run through the gateway (GATEWAY_URL), not the
      // media-service directly, so that cookie auth, the auth-verify hook,
      // role gating, and proxy behaviour are exercised end-to-end.
      name: 'media-via-gateway',
      use: { baseURL: GATEWAY_URL },
      testMatch: 'tests/media/**/*.spec.ts',
    },
    {
      // Order-service tests run through the gateway (GATEWAY_URL), not the
      // order-service directly, so that cookie auth, the auth-verify hook,
      // role gating, and proxy behaviour are exercised end-to-end.
      name: 'order-via-gateway',
      use: { baseURL: GATEWAY_URL },
      testMatch: 'tests/orders/**/*.spec.ts',
    },
    {
      // Payment-service tests run through the gateway (GATEWAY_URL), not the
      // payment-service directly, so that cookie auth, the auth-verify hook,
      // role gating, and proxy behaviour are exercised end-to-end.
      name: 'payment-via-gateway',
      use: { baseURL: GATEWAY_URL },
      testMatch: 'tests/payments/**/*.spec.ts',
    },
    {
      // Subscription-service tests run through the gateway (GATEWAY_URL),
      // not the subscription-service directly, so that cookie auth, the
      // auth-verify hook, role gating, and proxy behaviour are exercised
      // end-to-end.
      name: 'subscription-via-gateway',
      use: { baseURL: GATEWAY_URL },
      testMatch: 'tests/subscriptions/**/*.spec.ts',
    },
    {
      // Payout-service tests run through the gateway (GATEWAY_URL),
      // not the payout-service directly, so that cookie auth, the
      // auth-verify hook, role gating (CHEF | ADMIN), and proxy behaviour
      // are exercised end-to-end.
      name: 'payout-via-gateway',
      use: { baseURL: GATEWAY_URL },
      testMatch: 'tests/payouts/**/*.spec.ts',
    },
    {
      // Review-service tests run through the gateway (GATEWAY_URL),
      // exercising cookie auth, role gating, public access, and proxy behavior.
      name: 'review-via-gateway',
      use: { baseURL: GATEWAY_URL },
      testMatch: 'tests/reviews/**/*.spec.ts',
    },
    {
      name: 'gateway',
      use: { baseURL: GATEWAY_URL },
      testMatch: 'tests/gateway/**/*.spec.ts',
    },
  ],
})
