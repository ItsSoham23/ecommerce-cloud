# Local Kafka Workflow for Development

This project uses a local Kafka broker for development to avoid cloud costs. The broker runs on your host using Docker and is exposed to the kind cluster via an ExternalName service.

## How it works
- Start Kafka and Zookeeper using the helper script:

```powershell
# From the repo root
./scripts/run-local-kafka.ps1 start
```
- The broker advertises itself as `host.docker.internal:9092`.
- Kubernetes pods use a Service named `kafka` (type: ExternalName) that resolves to `host.docker.internal`.
- Microservices use the env var `KAFKA_BROKERS=host.docker.internal:9092` (or just `kafka:9092` if you want to use the Service name).

## Switching to managed Kafka (cloud)
- In production, update the `KAFKA_BROKERS` env to point to your managed Kafka endpoint (MSK, Confluent Cloud, etc).
- Remove the ExternalName service and deploy the real broker using Terraform or Helm.
- Update your manifests and Terraform to provision the broker and inject the correct endpoint.

## Troubleshooting
- If pods cannot reach Kafka, ensure Docker Desktop is running and the containers are started.
- If you see connection errors, check that `host.docker.internal` resolves inside the pod (it works in kind/Docker Desktop).
- For cloud, ensure network/firewall rules allow access to the managed broker.

## Clean up
- To stop and remove the local Kafka containers:
```powershell
./scripts/run-local-kafka.ps1 stop
./scripts/run-local-kafka.ps1 clean
```
