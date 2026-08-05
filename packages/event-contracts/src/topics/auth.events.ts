export const AUTH_EVENTS_TOPIC = 'auth.events'

export type Role = 'USER' | 'CHEF' | 'ADMIN'

export type AuthEvent =
  | {
      type: 'user.registered'
      userId: string
      email: string
      role: Role
      provider: 'local' | 'google'
      createdAt: string
      version: '1'
    }
  | {
      type: 'user.role_changed'
      userId: string
      oldRole: Role
      newRole: Role
      createdAt: string
      version: '1'
    }
  | {
      type: 'user.deleted'
      userId: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'password.reset'
      userId: string
      requestedAt: string
      createdAt: string
      version: '1'
    }
