Payment Service
----------------

Lightweight payment processor that subscribes to `payment.requested` and emits `payment.succeeded` or `payment.failed`.

Run locally (from this folder):

1) Install dependencies:
   npm ci

2) Start the service:
   NODE_ENV=development node src/index.js

Environment variables:
- `KAFKA_BROKERS` (default `kafka:9092`)
- `PAYMENT_SUCCESS_RATE` (default `0.85`)
- `PAYMENT_PROCESSING_MS` (default `800`)

If you run in Docker, build and run with your preferred compose setup so it can reach the Kafka broker.
