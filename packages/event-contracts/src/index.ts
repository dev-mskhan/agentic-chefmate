// Topic constants
export { AUTH_EVENTS_TOPIC } from './topics/auth.events'
export { ORDER_EVENTS_TOPIC } from './topics/order.events'
export { CHEF_EVENTS_TOPIC } from './topics/chef.events'
export { CHAT_EVENTS_TOPIC } from './topics/chat.events'
export { NOTIFICATION_EVENTS_TOPIC } from './topics/notification.events'
export { USER_EVENTS_TOPIC } from './topics/user.events'
export { MEDIA_EVENTS_TOPIC } from './topics/media.events'
export { PAYMENT_EVENTS_TOPIC } from './topics/payment.events'
export { SUBSCRIPTION_EVENTS_TOPIC } from './topics/subscription.events'

// Event types
export type { AuthEvent, Role } from './topics/auth.events'
export type { OrderEvent, OrderStatus, OrderItem } from './topics/order.events'
export type { ChefEvent } from './topics/chef.events'
export type { ChatEvent } from './topics/chat.events'
export type { NotificationEvent, NotificationChannel } from './topics/notification.events'
export type { UserEvent } from './topics/user.events'
export type { MediaEvent } from './topics/media.events'
export type { PaymentEvent, PaymentStatus } from './topics/payment.events'
export type { SubscriptionEvent, SubscriptionFrequency } from './topics/subscription.events'

// Producer / Consumer factories
export { createProducer } from './producer'
export { createConsumer } from './consumer'
export type { TypedProducer } from './producer'
export type { TypedConsumer } from './consumer'
