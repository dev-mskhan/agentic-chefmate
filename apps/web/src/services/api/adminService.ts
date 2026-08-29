import adminDashboardFixture from '../mock/fixtures/adminDashboard.json'

export interface AdminOverviewStats {
  totalUsers: number
  activeUsers: number
  pendingChefs: number
  activeChefs: number
  suspendedChefs: number
  rejectedChefs: number
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  refundedOrders: number
  disputedOrders: number
  activeSubscriptions: number
  publishedReviews: number
  pendingReviews: number
  totalGrossMarketplaceVolume: number
  platformCommissionRevenue: number
  pendingPayoutsAmount: number
}

export interface MetricTimeSeriesPoint {
  date: string
  gmv: number
  orders: number
  revenue: number
  activeUsers: number
}

export interface PendingChefApplication {
  id: string
  userId: string
  displayName: string
  applicantName: string
  email: string
  phone: string
  city: string
  serviceArea: {
    city: string
    areas: string[]
    postalCodes: string[]
    radiusKm: number
  }
  cuisineSpecialties: string[]
  bio: string
  hygieneCertificates: string[]
  signatureDish: {
    name: string
    price: number
    portion: string
    category: string
  }
  appliedAt: string
  verificationStatus: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED'
}

export interface AdminChefRecord {
  id: string
  userId: string
  displayName: string
  phone: string
  city: string
  cuisineSpecialties: string[]
  averageRating: number
  totalReviews: number
  verificationStatus: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'REJECTED'
  accountState: 'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'DELETED'
  totalOrdersCompleted: number
  totalEarned: number
  joinedDate: string
  suspensionReason?: string
}

export interface AdminUserRecord {
  id: string
  displayName: string
  email: string
  phone: string
  city: string
  role: 'USER' | 'CHEF' | 'ADMIN'
  status: 'ACTIVE' | 'SUSPENDED'
  totalOrders: number
  totalSpent: number
  createdAt: string
  suspensionReason?: string
}

export interface AdminOrderRecord {
  id: string
  customerName: string
  customerEmail: string
  chefName: string
  itemsSummary: string
  totalAmount: number
  platformFee: number
  paymentMethod: string
  paymentStatus: string
  orderStatus: string
  deliveryAddress: string
  createdAt: string
  hasDispute: boolean
  disputeReason?: string
}

export interface AdminPayoutRecord {
  id: string
  chefId: string
  chefName: string
  kitchenName: string
  amount: number
  bankName: string
  accountNumber: string
  requestedDate: string
  status: 'PENDING' | 'SETTLED' | 'REJECTED'
  settledAt?: string
  period: string
}

export interface AdminReviewRecord {
  id: string
  authorName: string
  targetType: 'chef' | 'dish'
  targetName: string
  rating: number
  text: string
  status: 'PUBLISHED' | 'PENDING' | 'REJECTED'
  flags?: string[]
  createdAt: string
}

export interface QualityFlagItem {
  id: string
  entityType: 'chef' | 'user'
  entityId: string
  entityName: string
  flagType: string
  count: number
  threshold: number
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  recommendation: string
}

export interface AdminAuditLogRecord {
  id: string
  adminEmail: string
  action: string
  targetEntity: string
  ipAddress: string
  timestamp: string
}

const ADMIN_STORAGE_PREFIX = 'chefmate-admin-'

function loadData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${ADMIN_STORAGE_PREFIX}${key}`)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`${ADMIN_STORAGE_PREFIX}${key}`, JSON.stringify(data))
  } catch {
    // ignore
  }
}

export async function getAdminOverview(): Promise<AdminOverviewStats> {
  await new Promise((r) => setTimeout(r, 120))
  return loadData('overview', adminDashboardFixture.overview as AdminOverviewStats)
}

export async function getPlatformMetrics(): Promise<MetricTimeSeriesPoint[]> {
  await new Promise((r) => setTimeout(r, 120))
  return loadData('metrics', adminDashboardFixture.metricsTimeSeries as MetricTimeSeriesPoint[])
}

export async function getPendingChefs(): Promise<PendingChefApplication[]> {
  await new Promise((r) => setTimeout(r, 120))
  return loadData('pending-chefs', adminDashboardFixture.pendingChefs as PendingChefApplication[])
}

export async function approveChefApplication(chefId: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 200))
  const pending = loadData<PendingChefApplication[]>('pending-chefs', adminDashboardFixture.pendingChefs as PendingChefApplication[])
  const updated = pending.filter((c) => c.id !== chefId)
  saveData('pending-chefs', updated)

  // Append to audit log
  const logs = loadData<AdminAuditLogRecord[]>('audit-logs', adminDashboardFixture.auditLogs as AdminAuditLogRecord[])
  logs.unshift({
    id: `aud-${Date.now()}`,
    adminEmail: 'admin@chefmate.pk',
    action: 'CHEF_APPROVED',
    targetEntity: `Chef Application ${chefId}`,
    ipAddress: '192.168.1.100',
    timestamp: new Date().toISOString(),
  })
  saveData('audit-logs', logs)
  return true
}

export async function rejectChefApplication(chefId: string, reason: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 200))
  const pending = loadData<PendingChefApplication[]>('pending-chefs', adminDashboardFixture.pendingChefs as PendingChefApplication[])
  const updated = pending.filter((c) => c.id !== chefId)
  saveData('pending-chefs', updated)

  const logs = loadData<AdminAuditLogRecord[]>('audit-logs', adminDashboardFixture.auditLogs as AdminAuditLogRecord[])
  logs.unshift({
    id: `aud-${Date.now()}`,
    adminEmail: 'admin@chefmate.pk',
    action: 'CHEF_REJECTED',
    targetEntity: `Chef Application ${chefId} (Reason: ${reason})`,
    ipAddress: '192.168.1.100',
    timestamp: new Date().toISOString(),
  })
  saveData('audit-logs', logs)
  return true
}

export async function getAllChefs(): Promise<AdminChefRecord[]> {
  await new Promise((r) => setTimeout(r, 120))
  return loadData('all-chefs', adminDashboardFixture.allChefs as AdminChefRecord[])
}

export async function suspendChef(chefId: string, reason: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 150))
  const chefs = loadData<AdminChefRecord[]>('all-chefs', adminDashboardFixture.allChefs as AdminChefRecord[])
  const target = chefs.find((c) => c.id === chefId)
  if (target) {
    target.verificationStatus = 'SUSPENDED'
    target.accountState = 'PAUSED'
    target.suspensionReason = reason
    saveData('all-chefs', chefs)
  }
  return true
}

export async function restoreChef(chefId: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 150))
  const chefs = loadData<AdminChefRecord[]>('all-chefs', adminDashboardFixture.allChefs as AdminChefRecord[])
  const target = chefs.find((c) => c.id === chefId)
  if (target) {
    target.verificationStatus = 'ACTIVE'
    target.accountState = 'ACTIVE'
    target.suspensionReason = undefined
    saveData('all-chefs', chefs)
  }
  return true
}

export async function getAdminUsers(): Promise<AdminUserRecord[]> {
  await new Promise((r) => setTimeout(r, 120))
  return loadData('users', adminDashboardFixture.users as AdminUserRecord[])
}

export async function suspendUser(userId: string, reason: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 150))
  const users = loadData<AdminUserRecord[]>('users', adminDashboardFixture.users as AdminUserRecord[])
  const target = users.find((u) => u.id === userId)
  if (target) {
    target.status = 'SUSPENDED'
    target.suspensionReason = reason
    saveData('users', users)
  }
  return true
}

export async function restoreUser(userId: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 150))
  const users = loadData<AdminUserRecord[]>('users', adminDashboardFixture.users as AdminUserRecord[])
  const target = users.find((u) => u.id === userId)
  if (target) {
    target.status = 'ACTIVE'
    target.suspensionReason = undefined
    saveData('users', users)
  }
  return true
}

export async function getAdminOrders(): Promise<AdminOrderRecord[]> {
  await new Promise((r) => setTimeout(r, 120))
  return loadData('orders', adminDashboardFixture.orders as AdminOrderRecord[])
}

export async function issueOrderRefund(orderId: string, reason: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 180))
  const orders = loadData<AdminOrderRecord[]>('orders', adminDashboardFixture.orders as AdminOrderRecord[])
  const target = orders.find((o) => o.id === orderId)
  if (target) {
    target.paymentStatus = 'REFUNDED'
    target.orderStatus = 'CANCELLED'
    target.hasDispute = false
    target.disputeReason = `Refunded: ${reason}`
    saveData('orders', orders)
  }
  return true
}

export async function getAdminPayouts(): Promise<AdminPayoutRecord[]> {
  await new Promise((r) => setTimeout(r, 120))
  return loadData('payouts', adminDashboardFixture.payouts as AdminPayoutRecord[])
}

export async function settlePayout(payoutId: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 180))
  const payouts = loadData<AdminPayoutRecord[]>('payouts', adminDashboardFixture.payouts as AdminPayoutRecord[])
  const target = payouts.find((p) => p.id === payoutId)
  if (target) {
    target.status = 'SETTLED'
    target.settledAt = new Date().toISOString()
    saveData('payouts', payouts)
  }
  return true
}

export async function getAdminReviews(): Promise<AdminReviewRecord[]> {
  await new Promise((r) => setTimeout(r, 120))
  return loadData('reviews', adminDashboardFixture.reviews as AdminReviewRecord[])
}

export async function moderateReview(reviewId: string, status: 'PUBLISHED' | 'REJECTED'): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 150))
  const reviews = loadData<AdminReviewRecord[]>('reviews', adminDashboardFixture.reviews as AdminReviewRecord[])
  const target = reviews.find((r) => r.id === reviewId)
  if (target) {
    target.status = status
    saveData('reviews', reviews)
  }
  return true
}

export async function getQualityFlags(): Promise<QualityFlagItem[]> {
  await new Promise((r) => setTimeout(r, 120))
  return loadData('quality-flags', adminDashboardFixture.qualityFlags as QualityFlagItem[])
}

export async function getAuditLogs(): Promise<AdminAuditLogRecord[]> {
  await new Promise((r) => setTimeout(r, 120))
  return loadData('audit-logs', adminDashboardFixture.auditLogs as AdminAuditLogRecord[])
}
