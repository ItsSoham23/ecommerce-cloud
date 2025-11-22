# Frontend Web Service - E-Commerce Cloud

React-based frontend service with Nginx serving static assets and proxying backend APIs.

## 🏗️ Architecture

- **Framework**: React 18
- **Web Server**: Nginx (Alpine)
- **State Management**: Context API
- **Routing**: React Router v6
- **Styling**: Plain CSS
- **API Client**: Axios

## 📁 Project Structure

```
frontend-web/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── Header.js
│   ├── context/
│   │   ├── AuthContext.js
│   │   └── CartContext.js
│   ├── pages/
│   │   ├── Home.js
│   │   ├── Login.js
│   │   ├── Register.js
│   │   ├── Products.js
│   │   ├── ProductDetail.js
│   │   ├── Cart.js
│   │   ├── Checkout.js
│   │   └── Profile.js
│   ├── services/
│   │   └── api.js
│   ├── styles/
│   │   ├── App.css
│   │   ├── Header.css
│   │   ├── Auth.css
│   │   ├── Products.css
│   │   ├── Cart.css
│   │   └── Home.css
│   ├── App.js
│   └── index.js
├── k8s/
│   ├── deployment.yaml
│   ├── ingress.yaml
│   └── argocd-application.yaml
├── Dockerfile
├── nginx.conf
├── package.json
└── README.md
```

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm start
   ```
   Opens at `http://localhost:3000`

3. **Build for production**
   ```bash
   npm run build
   ```

### Environment Variables

Create `.env` file:
```env
REACT_APP_API_BASE=http://localhost
```

For production, Nginx handles API proxying (no env needed).

## 🐳 Docker Build

### Build Image
```bash
docker build -t frontend-web:latest .
```

### Run Locally
```bash
docker run -p 8080:80 frontend-web:latest
```

### Push to ECR
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Tag
docker tag frontend-web:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/frontend-web:latest

# Push
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/frontend-web:latest
```

## ☸️ Kubernetes Deployment

### Deploy with ArgoCD (Recommended)

1. **Apply ArgoCD Application**
   ```bash
   kubectl apply -f k8s/argocd-application.yaml
   ```

2. **Monitor sync**
   ```bash
   argocd app get frontend-web
   argocd app sync frontend-web
   ```

### Manual Deployment (NOT RECOMMENDED - use ArgoCD)
```bash
# Only for testing
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/ingress.yaml
```

## 🔄 API Proxying

Nginx proxies these backend services:
- `/api/users` → `user-service:8080`
- `/api/products` → `product-service:8082`
- `/api/cart` → `cart-service:8083`
- `/api/orders` → `order-service:8084`
- `/api/payments` → `payment-service:8085`

## 🧪 Testing

### Health Check
```bash
curl http://localhost/health
```

### Test Backend Integration
```bash
# Products
curl http://localhost/api/products

# Users
curl http://localhost/api/users/1
```

## 📊 Monitoring

### Prometheus Metrics
- Exposed at `/metrics` (Nginx metrics)
- Pod annotations enable Prometheus scraping

### Logging
- Logs collected by Fluentd DaemonSet
- Aggregated in Elasticsearch
- Visualized in Kibana

## 🔒 Authentication

Simple email/password authentication:
- Login: `POST /api/users/email/{email}`
- Register: `POST /api/users`
- Session: Stored in localStorage

## 📝 Features

### ✅ Implemented
- User registration & login
- Product listing & details
- Shopping cart (add/update/remove)
- Responsive design
- Health checks
- API error handling

### 🚧 Pending (requires order/payment services)
- Order placement
- Payment processing
- Order history

## 🛠️ Tech Stack

- **React 18**: UI framework
- **React Router 6**: Client-side routing
- **Context API**: State management
- **Axios**: HTTP client
- **Nginx**: Production web server
- **Docker**: Containerization
- **Kubernetes**: Orchestration
- **ArgoCD**: GitOps deployment

## 📦 Dependencies

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "axios": "^1.6.2"
}
```

## 🔧 Configuration

### Nginx
- Gzip compression enabled
- Static asset caching (1 year)
- SPA routing (all routes → index.html)
- Health check endpoint
- API proxy configuration

### Kubernetes
- **Replicas**: 2
- **Resources**:
  - Request: 100m CPU, 128Mi memory
  - Limit: 200m CPU, 256Mi memory
- **Health Checks**:
  - Liveness: `/health` every 10s
  - Readiness: `/health` every 5s
- **Ingress**: ALB with internet-facing scheme

## 🐛 Troubleshooting

### Services not connecting
- Check service DNS: `user-service:8080`
- Verify services are running: `kubectl get svc`
- Check nginx proxy config in `nginx.conf`

### Images not loading
- Placeholder used if `imageUrl` is null
- Add product images via product service

### Cart not persisting
- Cart data fetched from cart-service
- Requires user to be logged in
- Check cart-service health

## 📚 API Documentation

See individual service READMEs:
- [User Service](../user-service/README.md)
- [Product Service](../product-service/README.md)
- [Cart Service](../cart-service/README.md)

## 🎯 Next Steps

1. Integrate order service once ready
2. Add payment flow
3. Implement order history page
4. Add search functionality
5. Enhance error handling
6. Add loading skeletons
7. Implement JWT authentication