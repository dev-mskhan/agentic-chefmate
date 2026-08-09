# ChefMate Notification Architecture

## Event vs Notification vs Delivery

**Event** — A domain fact published to Redpanda. e.g. `order.created`.
**Notification** — A user-facing record persisted in MongoDB. Created from an event when the user needs history (in-app channel).
**Delivery** — The act of transmitting a notification to the user via WebSocket, Web Push, or Email.

## Full Flow

```
Redpanda topic
    │
    ▼
Kafka Consumer (one per topic)
    │
    ▼
notification-service consumers
(derive idempotent notificationId via SHA-256)
    │
    ▼
BullMQ Queue  ──── jobId = notificationId (deduplication)
    │
    ├──► email.worker   → SendGrid → user inbox
    │
    ├──► push.worker    → web-push (VAPID) → browser OS notification
    │
    └──► inapp.worker   → persistNotification() → MongoDB
                        → Redis pub/sub notif:user:{userId}
                                │
                                ▼
                         chat-service / gateway
                         (subscribes to Redis pub/sub, forwards via WebSocket)

After each job outcome:
    worker.on('completed') → publish notification.sent to Redpanda
    worker.on('failed')    → publish notification.failed to Redpanda
```

## Retry Strategy

BullMQ: `attempts=5`, exponential backoff starting at 1 s (1 s → 2 s → 4 s → 8 s → 16 s).
Workers **throw** on failure — BullMQ only retries when the processor throws.
After 5 failures: job moved to failed set, `notification.failed` event published to Redpanda.

## Idempotency Strategy

`notificationId` is derived deterministically from `eventType + identifying parts` via SHA-256.
`BullMQ jobId = notificationId` — duplicate `queue.add()` calls with the same jobId are silently ignored if the job is already queued or processing.

Examples:
- `user.registered` → `sha256('user.registered:userId').slice(0,32)`
- `order.created` chef email → `sha256('order.created:orderId:chef:email').slice(0,32)`
- `chat.message_unread` push → `sha256('chat.message_unread:messageId:push').slice(0,32)`

## Redis + BullMQ Architecture

BullMQ accepts a **plain connection config object** `{ host, port, maxRetriesPerRequest: null }`.
It does NOT accept ioredis instances.

ioredis instances are used separately:
- `pubClient` — Redis pub/sub publish in the inapp worker.

## Delivery Channels

| Channel | Mechanism | MongoDB persistence |
|---------|-----------|---------------------|
| email   | SendGrid API via `@sendgrid/mail` | No |
| push    | VAPID Web Push via `web-push` npm | No (subscription stored in `PushSubscription` collection) |
| inapp   | Redis pub/sub `notif:user:{userId}` | **Yes** — `Notification` collection |

## Offline Users

In-app notifications are persisted in MongoDB before delivery attempt.
When a user reconnects, they can fetch unseen notifications via `GET /notifications` (future endpoint).
MongoDB TTL index auto-deletes notifications after 30 days via the `expiresAt` field.

## Web Push Subscription Lifecycle

Push subscriptions are stored per device in the `PushSubscription` collection (unique index on `endpoint`).
When `webpush.sendNotification` returns HTTP 410 (Gone) or 404 (Not Found), the subscription has expired
and is automatically removed from MongoDB by the push worker.

## Channel Mapping by Event

| Event | email | push | inapp | MongoDB |
|-------|-------|------|-------|---------|
| `user.registered` (local) | ✓ (verify) | — | — | — |
| `user.password_reset_requested` | ✓ | — | — | — |
| `user.role_changed → CHEF` | ✓ (welcome) | — | ✓ | ✓ |
| `order.created` | ✓ user+chef | ✓ chef | ✓ chef | ✓ chef |
| `order.status_changed` | — | ✓ user | ✓ user | ✓ user |
| `order.completed` | ✓ user | ✓ user | — | — |
| `order.cancelled` | ✓ user+chef | — | ✓ user+chef | ✓ user+chef |
| `chef.approved` | ✓ | ✓ | ✓ | ✓ |
| `chef.suspended` | ✓ | — | ✓ | ✓ |
| `chef.approval_pending` | — | — | ✓ admin | ✓ admin |
| `chat.message_unread` | — | ✓ | ✓ | ✓ |
