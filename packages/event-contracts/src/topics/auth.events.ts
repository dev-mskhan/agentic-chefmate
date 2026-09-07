export const AUTH_EVENTS_TOPIC = 'auth.events'

export type Role = 'USER' | 'CHEF' | 'ADMIN'

export type AuthEvent =
  | {
      type: 'user.registered'
      userId: string
      email: string
      role: Role
      provider: 'local'
      /** Full verification URL — auth-service builds it, notification-service emails it */
      verifyUrl: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'user.registered'
      userId: string
      email: string
      role: Role
      provider: 'google'
      createdAt: string
      version: '1'
    }
  | {
      type: 'user.logged_in'
      userId: string
      email: string
      role: Role
      ip?: string
      userAgent?: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'user.logged_out'
      userId: string
      sessionId?: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'user.email_verified'
      userId: string
      email: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'user.password_reset_requested'
      userId: string
      email: string
      /** Full reset URL — auth-service builds it, notification-service emails it */
      resetUrl: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'user.password_changed'
      userId: string
      createdAt: string
      version: '1'
    }
  | {
      type: 'user.role_changed'
      userId: string
      email: string
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
