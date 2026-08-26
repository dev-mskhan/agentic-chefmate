import type { AuthIdentity, UserRole } from '../types/domain'

const validRoles: UserRole[] = ['USER', 'CHEF', 'ADMIN']
const configuredRole = import.meta.env.VITE_DEMO_ROLE as string | undefined
const role = validRoles.includes(configuredRole as UserRole) ? configuredRole as UserRole : 'USER'

export const demoIdentity: AuthIdentity = {
  userId: role === 'CHEF' ? 'chef-ayesha-khan' : role === 'ADMIN' ? 'admin-demo' : 'customer-demo',
  email: role === 'CHEF' ? 'ayesha@chefmate.test' : role === 'ADMIN' ? 'ops@chefmate.test' : 'hello@chefmate.test',
  role,
}

export const isRoleAllowed = (allowedRoles: UserRole[]) => allowedRoles.includes(demoIdentity.role)
