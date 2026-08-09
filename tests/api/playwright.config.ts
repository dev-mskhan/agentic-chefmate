import { defineConfig } from '@playwright/test'
import * as dotenv from 'dotenv'
import path from 'path'

// Load .env.test if present, fall back to environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.test'), override: false })
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: false })

const AUTH_URL    = process.env['AUTH_SERVICE_URL']  ?? 'http://localhost:3001'
const GATEWAY_URL = process.env['GATEWAY_URL']       ?? 'http://localhost:3000'
const USER_URL    = process.env['USER_SERVICE_URL']  ?? 'http://localhost:3002'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  reporter: process.env['CI']
    ? [['line'], ['json', { outputFile: 'test-results/results.json' }]]
    : [['list']],

  use: {
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },

  projects: [
    {
      name: 'auth-direct',
      use: {
        baseURL: AUTH_URL,
      },
      testMatch: 'tests/auth/**/*.spec.ts',
    },
    {
      name: 'gateway',
      use: {
        baseURL: GATEWAY_URL,
      },
      testMatch: 'tests/gateway/**/*.spec.ts',
    },
    {
      name: 'user-direct',
      use: {
        baseURL: USER_URL,
      },
      testMatch: 'tests/users/**/*.spec.ts',
    },
  ],
})
