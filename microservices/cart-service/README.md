# Cart Service

Shopping cart microservice for the e-commerce platform. Built with Node.js, Express, and AWS DynamoDB.

## Features

- Add/remove items from cart
- Update item quantities
- Calculate cart totals
- Session-based cart storage in DynamoDB
- Prometheus metrics for monitoring
- Health check endpoints

## Tech Stack

- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Database**: AWS DynamoDB (NoSQL)
- **Metrics**: Prometheus
- **Container**: Docker

## API Endpoints

### Cart Operations
- `GET /api/cart/:userId` - Get user's cart
- `POST /api/cart/:userId/items` - Add item to cart
- `PUT /api/cart/:userId/items/:productId` - Update item quantity
- `DELETE /api/cart/:userId/items/:productId` - Remove item from cart
- `DELETE /api/cart/:userId` - Clear entire cart
- `GET /api/cart/:userId/total` - Get cart total

### Health & Metrics
- `GET /health` - Health check
- `GET /ready` - Readiness check
- `GET /metrics` - Prometheus metrics

## Local Development

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (optional, for local dev without Docker)

### Setup

1. **Clone and navigate to cart-service:**
   ```bash
   cd microservices/cart-service
   ```

2. **Create .env file:**
   ```bash
   cp .env.example .env
   ```

3. **Build Docker image:**
   ```bash
   docker build -t cart-service:latest .
   ```

4. **Start services:**
   ```bash
   docker-compose up -d
   ```

5. **Check health:**
   ```bash
   curl http://localhost:8083/health
   ```

### Testing the API

**Add item to cart:**
```bash
curl -X POST http://localhost:8083/api/cart/user123/items \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod-001",
    "productName": "Dell XPS 15",
    "price": 1299.99,
    "quantity": 2
  }'
```

**Get cart:**
```bash
curl http://localhost:8083/api/cart/user123
```

**Update quantity:**
```bash
curl -X PUT http://localhost:8083/api/cart/user123/items/prod-001 \
  -H "Content-Type: application/json" \
  -d '{"quantity": 3}'
```

**Remove item:**
```bash
curl -X DELETE http://localhost:8083/api/cart/user123/items/prod-001
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `8083` |
| `NODE_ENV` | Environment | `development` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `DYNAMODB_TABLE` | DynamoDB table name | `Carts` |
| `USE_LOCALSTACK` | Use LocalStack for local dev | `true` |
| `LOCALSTACK_ENDPOINT` | LocalStack endpoint | `http://localstack:4566` |

## DynamoDB Schema

**Table: Carts**

```json
{
  "userId": "user123",           // Partition Key
  "items": [
    {
      "productId": "prod-001",
      "productName": "Dell XPS 15",
      "price": 1299.99,
      "quantity": 2,
      "addedAt": "2024-11-18T12:00:00Z"
    }
  ],
  "totalAmount": 2599.98,
  "itemCount": 2,
  "updatedAt": "2024-11-18T12:00:00Z"
}
```

## Monitoring

Prometheus metrics available at `/metrics`:
- `cart_service_*` - Default Node.js metrics
- `http_requests_total` - HTTP request counter
- `http_request_duration_seconds` - Request latency
- `cart_operations_total` - Cart operation counter

## Production Deployment

For production, use real AWS DynamoDB:

1. Set environment variables:
   ```bash
   USE_LOCALSTACK=false
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   ```

2. Deploy to Kubernetes:
   ```bash
   kubectl apply -f k8s/
   ```

## License

MIT