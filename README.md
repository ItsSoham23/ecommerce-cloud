# Microservices API Summary (Improved Format)

## Default Local Base URLs
- **User Service:** http://localhost:8080  
- **Product Service:** http://localhost:8082  
- **Cart Service:** http://localhost:8083  
- **Order Service:** http://localhost:8084  
- **Payment Service:** http://localhost:8085  
- **Notification Service:** http://localhost:8090  

**Authentication:**  
- JWT issued by *user-service* at `/api/users/login`  
- Other services currently **do not enforce JWT**

**Common:**  
- `/health` and `/metrics` available in most services.

---

# USER SERVICE (http://localhost:8080, base: /api/users)

## Endpoints
### **GET /health**
Returns service status.

### **POST /api/users**
Create a new user.  
Body:
- email (required)
- password (min 6 chars, required)
- firstName, lastName, phone (optional)

### **POST /api/users/login**
Authenticate & receive JWT.

### **GET /api/users**
List users (pagination).

### **GET /api/users/:id**
Fetch user by ID.

### **GET /api/users/email/:email**
Fetch user by email.

### **PUT /api/users/:id**
Update user.

### **DELETE /api/users/:id**
Delete user.

---

# PRODUCT SERVICE (http://localhost:8082, base: /api/products)

## Endpoints
### **GET /health**, **GET /metrics**

### **POST /api/products**
Create product.

### **GET /api/products**
List products with filters:
- category, minPrice, maxPrice, search  
- includeInactive  
- includeReserved  

### **GET /api/products/:id**
Fetch product details.

### **PUT /api/products/:id**
Update product fields.

### **DELETE /api/products/:id**
Soft delete, publishes `product.deleted` Kafka event.

### **POST /api/products/:id/upload-image**
Upload image (multipart).

### **PATCH /api/products/:id/stock**
Used for **reservations** and **stock updates**.  
- quantity < 0 → reserve  
- quantity > 0 → adjust stock  
Handles validation & conflict (409).

### **PATCH /api/products/:id/clear-reservation**
Clear reservation.

### **PATCH /api/products/:id/commit**
Commit sale (atomic stock decrement).

---

# CART SERVICE (http://localhost:8083, base: /api/cart)

## Endpoints
### **GET /health**, **GET /ready**, **GET /metrics**

### **GET /api/cart/:userId**
Fetch user cart.

### **POST /api/cart/:userId/items**
Add cart item.

### **PUT /api/cart/:userId/items/:productId**
Update quantity.

### **DELETE /api/cart/:userId/items/:productId**
Remove item.

### **DELETE /api/cart/:userId**
Clear cart.

### **GET /api/cart/:userId/total**
Return totals.

---

# ORDER SERVICE (http://localhost:8084, base: /api/orders)

## Endpoints
### **GET /health**, **GET /metrics**

### **POST /api/orders**
Create order using items provided **or cart contents**.
- Reserves inventory
- Publishes `payment.requested`
- Returns order with status `AWAITING_PAYMENT`

Errors:  
- `409` insufficient stock  
- `400` cart empty  

### **GET /api/orders/user/:userId**
List user orders.

### **GET /api/orders/:orderId**
Fetch order.

**Order Lifecycle:**  
`AWAITING_PAYMENT → CONFIRMED → FAILED/CANCELLED`

---

# PAYMENT SERVICE (http://localhost:8085)

## Endpoints
### **GET /health**

### **POST /api/payments**
Simulates payment success/failure or handles automatic payment.  
Publishes:
- `payment.succeeded`
- `payment.failed`

Auto-processing is controlled by env: `PAYMENT_AUTO_PROCESS`.

---

# NOTIFICATION SERVICE (http://localhost:8090)

## Endpoints
### **GET /health**

### **POST /send-test**
Trigger manual notification.

## Kafka Consumer
Consumes `payment.succeeded`, enriches data using:
- product-service
- order-service  

Sends notifications via log/webhook.

---

# KAFKA TOPICS & MESSAGE SHAPES

### **payment.requested**
Producer: order-service  
Shape:
```
{ orderId, userId, items: [{productId, quantity}], total }
```

### **payment.succeeded**
Producer: payment-service  
Consumers: order-service, notification-service, analytics  
Shape:
```
{ orderId, paymentId }
```

### **payment.failed**
Producer: payment-service  
Consumers: order-service, analytics  
Shape:
```
{ orderId, reason }
```

### **product.deleted**
Producer: product-service  
Consumer: cart-service  
Shape:
```
{ productId }
```

---

# END-TO-END EXAMPLE

1. **Create User** – POST `/api/users`  
2. **Add to Cart** – POST `/api/cart/:userId/items`  
3. **Create Order** – POST `/api/orders`  
4. **Simulate Payment** – POST `/api/payments`  
5. **Notification Service** consumes `payment.succeeded`.

---

# Notes & Troubleshooting
- Missing wget in Docker images → update Dockerfile (`apk add wget`)  
- Use **host.docker.internal** for Windows Docker networking  
- Kafka `advertised.listeners` must be set correctly for host/container communication.
