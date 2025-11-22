# Order Service

Minimal order-service that:
- Fetches cart items for a user (or accepts items in request)
- Checks inventory via `product-service`
- Reserves (blocks) stock while awaiting payment
- Calls `payment-service` (or simulates payment when not configured)
- On payment success, persists order in DynamoDB (LocalStack supported)
- On payment failure/timeout, releases reserved stock

Environment variables used:
- `PORT` - server port (default 8084)
- `CART_SERVICE_URL` - e.g. `http://cart-service:8083`
- `PRODUCT_SERVICE_URL` - e.g. `http://product-service:8082`
- `PAYMENT_SERVICE_URL` - remote payment service base URL (optional)
- `ORDER_PAYMENT_TIMEOUT_MS` - timeout waiting for payment (ms)
- `USE_LOCALSTACK` / `LOCALSTACK_ENDPOINT` / `DYNAMODB_ORDERS_TABLE` - DynamoDB config

API:
- `POST /api/orders` - create order. Body: `{ userId, items?: [...], total?: number }`

