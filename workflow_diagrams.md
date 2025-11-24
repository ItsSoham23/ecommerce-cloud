# E-commerce Cloud Architecture Overview

...existing code...

This repository contains a sample microservices-based e-commerce platform designed for multi-cloud deployment. The architecture uses event-driven patterns, managed Kubernetes, and cloud-native data stores.

Key components:

- Microservices: `product-service`, `cart-service`, `order-service`, `payment-service`, `user-service`, `notification-service`.
- Messaging: Apache Kafka for event-driven communication (topics include `payment.requested`, `payment.succeeded`, `payment.failed`, `product.deleted`, and analytics topics).
- Persistence: PostgreSQL for product catalog, DynamoDB for cart and order storage (LocalStack for local emulation).
- Observability: Prometheus + Grafana for metrics, EFK/Loki for logs.
- IaC: Terraform for provisioning cloud infrastructure (AWS/GCP scaffolds included). EKS (AWS) or GKE (GCP) for Kubernetes.

Deployment Strategy:

- Development: Docker Compose with LocalStack and local Kafka broker for end-to-end testing.
- Production: Managed Kubernetes (EKS/GKE) with external Kafka (MSK or managed offering), cloud databases (RDS/Cloud SQL), and S3-compatible storage.

Event Flows:

- Order Flow: `order-service` publishes `payment.requested` after reserving inventory and persisting an `AWAITING_PAYMENT` order. `payment-service` consumes the request, attempts payment, and publishes `payment.succeeded` or `payment.failed`. `order-service` consumes results and updates order status and cart.
- Product Deletion: `product-service` emits `product.deleted` on soft-delete. `cart-service` consumes and removes the product from all carts.
- Analytics: Kafka topics stream to an analytics cluster (e.g., Flink on Dataproc/GKE) for aggregation.

Notes and Next Steps:

- Terraform scaffolds for AWS and GCP are included but not fully provisioned. Fill variables and complete modules (RDS, MSK, IAM) before apply.
- Add GitOps manifests for ArgoCD/Flux and Helm charts for monitoring/logging stacks.
- Implement a Flink job on GCP Dataproc to consume analytics topics and publish aggregates to BigQuery or S3.

High-level architecture
----------------------

This repository contains a multi-cloud, microservices reference implementation scaffold satisfying the assignment requirements:

- Provider A: AWS — Primary services (EKS, RDS/Postgres, S3, Lambda, DynamoDB)
- Provider B: GCP — Analytics/stream processing (Dataproc/Flink)
- Managed Kafka: Confluent Cloud (or AWS MSK / Aiven) — used as the cross-cloud event bus

Microservices (example domain: e-commerce)
- api-gateway (ingress controller / routing)
- user-service (Postgres on RDS)
- product-service (Postgres on RDS)
- cart-service (DynamoDB)
- order-service (EKS-hosted, publishes payment.requested)
- payment-service (EKS-hosted or separate; consumes payment.requested and publishes result)
- notification-service (consumes payment.succeeded, sends notifications)

Analytics service
- Flink job running on GCP Dataproc consuming from Kafka topic `events` and publishing aggregated results to `results` topic.

Serverless
- AWS Lambda function triggered by S3 object creation for async processing (e.g., image resizing, sending events to Kafka).

Deployment & GitOps
- Kubernetes manifests stored under `/k8s/` and managed via ArgoCD applications under `/gitops/argocd/`.

Observability
- Prometheus + Grafana deployed on the cluster via Helm/ArgoCD.
- Centralized logs via EFK or Loki (helm charts referenced).

This repository provides scaffolding: Terraform skeletons, K8s manifests, microservice templates, and run instructions.

Diagrams
--------

> Render these Mermaid diagrams in a Markdown viewer that supports Mermaid (VS Code preview with Mermaid extension or https://mermaid.live).

### High-level architecture
```mermaid
flowchart LR
  Browser[Browser / Frontend]
  API[Ingress / API Gateway]
  subgraph K8s["Managed K8s (EKS / GKE)"]
    UI[frontend-web]
    User[user-service]
    Product[product-service]
    Cart[cart-service]
    Order[order-service]
    Payment[payment-service]
    Notification[notification-service]
  end

  Kafka["Managed Kafka (MSK / Confluent)"]
  Flink["Flink (Provider B)"]
  ResultsDB["NoSQL / results store"]
  Postgres["Managed SQL (RDS / Cloud SQL)"]
  NoSQL["Managed NoSQL (DynamoDB / Firestore)"]
  ObjectStore["Object Store (S3 / GCS)"]

  Browser --> UI
  UI -->|REST| API --> User
  API --> Product
  API --> Cart
  API --> Order
  API --> Payment

  Order -->|publish payment.requested| Kafka
  Payment -->|publish payment.succeeded| Kafka
  Kafka -->|payment.succeeded| Order
  Kafka -->|payment.succeeded| Notification
  Kafka -->|events| Flink

  Product --> Postgres
  Cart --> NoSQL
  Order --> NoSQL
  ObjectStore --- Payment
  Flink -->|aggregates -> results topic| Kafka
  Flink --> ResultsDB
  Notification -->|optional webhook| Browser
```

### Order / payment sequence
```mermaid
sequenceDiagram
  participant B as Browser
  participant FE as Frontend
  participant O as Order-Service
  participant P as Product-Service
  participant K as Kafka
  participant PAY as Payment-Service
  participant N as Notification-Service
  participant A as Flink

  B->>FE: Click Place Order
  FE->>O: POST /api/orders {userId, items}
  O->>P: PATCH /api/products/:id/stock (reserve orderId, -quantity)
  P-->>O: 200 reserved
  O-->>O: persist order (AWAITING_PAYMENT)
  O->>K: publish payment.requested {orderId, items, total}
  K->>PAY: payment.requested
  PAY->>K: publish payment.succeeded {orderId, paymentId}
  K->>O: payment.succeeded
  O->>P: PATCH /api/products/:id/commit (decrement stock)
  O-->>FE: 200 order confirmed
  K->>N: payment.succeeded
  K->>A: payment.succeeded
  N->>User: send notification (email/webhook/WS)
```

### Analytics pipeline (Provider A ↔ Provider B)
```mermaid
flowchart LR
  subgraph ProviderA["Provider A (e.g., AWS)"]
    KafkaA["Managed Kafka (MSK / Confluent)"]
  end
  subgraph ProviderB["Provider B (e.g., GCP)"]
    FlinkCluster[Flink job @ Dataproc/EMR]
    ResultsTopic["Kafka: results"]
    ResultsStore["BigQuery / NoSQL / GCS"]
  end

  KafkaA -->|"events (payment, orders)"| FlinkCluster
  FlinkCluster -->|"windowed aggregates (1m)"| ResultsTopic
  FlinkCluster --> ResultsStore
  ResultsTopic -->|"consumed by dashboards or services"| ResultsStore
```

### Deployment / GitOps / IaC flow
```mermaid
flowchart LR
  DevRepo["Git Repo (k8s manifests / Helm / apps)"]
  Terraform["Terraform (AWS/GCP modules)"]
  CI["CI/CD (build -> image registry)"]
  ArgoCD["ArgoCD (GitOps controller)"]
  K8sCluster["K8s Cluster (EKS / GKE)"]
  CloudResources["Managed Cloud Resources: DBs, Kafka, Storage, Dataproc"]
  Registry["Container Registry"]

  Terraform --> CloudResources
  CI -->|"push image"| Registry
  DevRepo --> ArgoCD
  ArgoCD --> K8sCluster
  K8sCluster -->|"runs"| CloudResources
  CloudResources --> KafkaA
```

### Observability & Logging
```mermaid
graph LR
  subgraph K8s["Kubernetes Cluster"]
    svc1[service pods...]
  end
  Prom[Prometheus] --> Graf[Grafana]
  svc1 -->|metrics| Prom
  svc1 -->|logs| Fluentd
  Fluentd --> ES["Elasticsearch / Loki"]
  ES --> Kibana["Kibana / Grafana Logs"]
  Graf -->|dashboards| SRE["SRE / Dev"]
```

