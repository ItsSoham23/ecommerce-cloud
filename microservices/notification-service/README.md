# Notification Service

Lightweight Node.js notification service for development.

Features
- Consumes `payment.succeeded` Kafka topic
- Sends notifications: logs to console and optionally POSTs to a webhook (`NOTIFICATION_WEBHOOK_URL`)
- Provides `/health` and `/send-test` endpoints for quick testing

Environment
- `KAFKA_BROKERS` - comma-separated list of Kafka brokers (default: `localhost:9092`)
- `KAFKA_CLIENT_ID` - Kafka client id (default: `notification-service`)
- `KAFKA_GROUP_ID` - Kafka consumer group id (default: `notification-service-group`)
- `NOTIFICATION_TOPIC` - topic to subscribe to (default: `payment.succeeded`)
- `NOTIFICATION_WEBHOOK_URL` - optional webhook to deliver notifications

Run locally (dev)

1. Install dependencies:

```powershell
cd microservices/notification-service
npm install
npm start
```

2. Or run with Docker Compose (requires Kafka reachable at `KAFKA_BROKERS`):

```powershell
cd microservices/notification-service
docker compose up --build -d
```

Testing

- Manual test via HTTP:

```powershell
Invoke-RestMethod -Uri 'http://localhost:8090/health' -Method Get
Invoke-RestMethod -Uri 'http://localhost:8090/send-test' -Method Post -ContentType 'application/json' -Body ((@{ orderId='ord-1'; userId='user-1'; items=@() }) | ConvertTo-Json -Depth 6)
```

- Produce a `payment.succeeded` message to Kafka (example using kafkacat or your existing producer) and confirm the notification service logs the message.
