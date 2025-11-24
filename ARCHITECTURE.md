# E-commerce Cloud Architecture Overview

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

Analytics service (Cross-Cloud Setup: AWS → GCP)
- **Infrastructure**: PySpark analytics job running on GCP Dataproc Serverless (runtime 2.2 / Spark 3.5 / Scala 2.13)
- **Data Source**: AWS EKS Kafka broker exposed via LoadBalancer (`a7c3502b39bba43e08f38eb2cc3d9845-1536208886.ap-south-1.elb.amazonaws.com:9092`)
- **Storage**: GCS bucket `gs://ecommerce-analytics-393953-20251124/analytics/` for aggregated results
- **Service Account**: `analytics-runner@ecommerce-cloud-dev.iam.gserviceaccount.com` with roles: `dataproc.worker`, `storage.objectAdmin`, `datastore.user`
- **Optional Storage**: Cloud SQL Postgres instance `ecommerce-analytics-pg` (136.112.199.189) and Firestore (Datastore mode) available for persistent analytics state
- **Events Consumed**: `payment.requested`, `payment.succeeded`, `payment.failed` topics from AWS Kafka
- **Analytics Output**: JSON aggregations (overall statistics, by status, by user) written to GCS

**Current Status**:
- ✅ GCP analytics infrastructure fully functional (Dataproc + GCS validated with demo using sample payment events)
- ✅ Kafka TCP connectivity verified (Cloud Shell → AWS Kafka ELB succeeds)
- ⚠️ Real-time Kafka consumption blocked by metadata fetch timeout (Spark Kafka AdminClient times out on `describeTopics` call)

**Production Requirements for Real-Time Kafka**:
The cross-cloud Kafka setup has a known networking limitation. TCP connections to the Kafka ELB succeed, but Spark's Kafka AdminClient cannot fetch topic metadata (times out on `describeTopics`). This is typically caused by:
1. **Kafka Broker Configuration**: The broker advertises internal AWS IPs to clients instead of the public ELB hostname. Clients connect to the ELB, but when fetching metadata, the broker returns internal IPs that Dataproc workers cannot reach.
2. **Security Groups**: AWS security groups may allow Cloud Shell IPs but block Dataproc Serverless egress IPs.

**Solutions for Production**:
- **Option A (Recommended)**: Configure Kafka `advertised.listeners` to use the public ELB hostname so clients receive routable addresses
- **Option B**: Implement VPN/Cloud Interconnect/PrivateLink between GCP and AWS for private connectivity
- **Option C**: Add Dataproc Serverless egress IP ranges to AWS security group ingress rules
- **Current Workaround**: Demo analytics job uses sample payment data to validate pipeline; production would use Option A or B

Serverless
- AWS Lambda function triggered by S3 object creation for async processing (e.g., image resizing, sending events to Kafka).

Deployment & GitOps
- Kubernetes manifests stored under `/k8s/` and managed via ArgoCD applications under `/gitops/argocd/`.

Observability
- Prometheus + Grafana deployed on the cluster via Helm/ArgoCD.
- Centralized logs via EFK or Loki (helm charts referenced).

This repository provides scaffolding: Terraform skeletons, K8s manifests, microservice templates, and run instructions.
