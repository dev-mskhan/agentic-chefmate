#!/usr/bin/env bash
# seed.sh — creates all Redpanda topics required by ChefMate
# Run this after docker-compose up and Redpanda is healthy.
#
# Usage: bash infra/kafka/seed.sh

set -euo pipefail

BROKER="${REDPANDA_BROKER:-localhost:9092}"
RETENTION_MS=$((7 * 24 * 60 * 60 * 1000))   # 7 days in ms

echo "Creating ChefMate Redpanda topics on broker: $BROKER"

create_topic() {
  local name=$1
  local partitions=$2

  if rpk topic describe "$name" --brokers "$BROKER" &>/dev/null; then
    echo "  ✓ Topic already exists: $name"
  else
    rpk topic create "$name" \
      --brokers "$BROKER" \
      --partitions "$partitions" \
      --replicas 1 \
      --topic-config "retention.ms=$RETENTION_MS" \
      --topic-config "cleanup.policy=delete"
    echo "  ✓ Created topic: $name (partitions: $partitions, retention: 7d)"
  fi
}

# Core business event topics
create_topic "auth.events"          3
create_topic "order.events"         6
create_topic "chef.events"          3
create_topic "chat.events"          3
create_topic "notification.events"  3

# Dead-letter queues (auto-created by consumer on failure, listed here for visibility)
create_topic "auth.events.dlq"          1
create_topic "order.events.dlq"         1
create_topic "chef.events.dlq"          1
create_topic "chat.events.dlq"          1
create_topic "notification.events.dlq"  1

echo ""
echo "All topics created. Run 'rpk topic list --brokers $BROKER' to verify."
