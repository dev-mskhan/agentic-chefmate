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
      name: 'chef-direct',
      use: { baseURL: CHEF_URL },
      testMatch: 'tests/chef/**/*.spec.ts',
    },
    {
      name: 'user-direct',
      use: { baseURL: USER_URL },
      testMatch: 'tests/users/**/*.spec.ts',
    },
    {
      name: 'auth-direct',
      use: { baseURL: AUTH_URL },
      testMatch: 'tests/auth/**/*.spec.ts',
    },
    {
      name: 'order-direct',
      use: { baseURL: ORDER_URL },
      testMatch: 'tests/orders/**/*.spec.ts',
    },
    {
      name: 'payment-direct',
      use: { baseURL: PAYMENT_URL },
      testMatch: 'tests/payments/**/*.spec.ts',
    },
    {
      name: 'subscription-direct',
      use: { baseURL: SUBSCRIPTION_URL },
      testMatch: 'tests/subscriptions/**/*.spec.ts',
    },
    {
      name: 'gateway',
      use: { baseURL: GATEWAY_URL },
      testMatch: 'tests/gateway/**/*.spec.ts',
    },
  ],
})
