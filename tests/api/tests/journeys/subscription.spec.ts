import { test, expect } from '@playwright/test'
import {
  setupSubCustomer,
  setupChefWithPlan,
  signinSubCustomer,
  subPost,
  subGet,
  type SubCustomer,
  type ChefWithPlan,
} from '../../helpers/subscription'

let chef: ChefWithPlan
let customer: SubCustomer

test.beforeAll(async ({ request }) => {
  chef = await setupChefWithPlan()
  customer = await setupSubCustomer(request, 'journey3')
})

test.afterAll(async () => {
  await chef?.request?.dispose()
})

test('Journey 3 — subscription renewal generates the next order', async ({ request }) => {
  test.setTimeout(120_000)
  await signinSubCustomer(request, customer.email, customer.password)
  const created = await subPost(request, '/', {
    planId: chef.planId,
    chefId: chef.chefId,
    tierId: chef.tierId,
    addressId: customer.addressId,
    frequency: 'WEEKLY',
  })
  expect(created.status).toBe(201)
  expect(created.data.subscription.status).toBe('ACTIVE')

  const subscriptionId = created.data.subscription._id
  const initialNextBilling = created.data.subscription.nextBillingDate
  const trigger = await request.post(
    `${process.env.SUBSCRIPTION_SERVICE_URL ?? 'http://localhost:3009'}/api/v1/subscriptions/internal/test/billing/${subscriptionId}`,
    {
      data: {},
      headers: { 'x-internal-secret': process.env.INTERNAL_SECRET ?? 'dev-internal-secret-min-16chars!' },
    },
  )
  expect(trigger.status(), await trigger.text()).toBe(202)

  await expect.poll(async () => {
    const current = await subGet(request, `/${subscriptionId}`)
    return current.data?.nextBillingDate
  }, { timeout: 30_000 }).not.toBe(initialNextBilling)

  const current = await subGet(request, `/${subscriptionId}`)
  expect(current.status).toBe(200)
  expect(current.data.status).toBe('ACTIVE')
})
