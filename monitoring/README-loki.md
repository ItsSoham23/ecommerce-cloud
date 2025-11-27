Loki deployment notes

Purpose
- Provide Helm values and Promtail config templates to deploy Loki (S3-backed) to your Kubernetes cluster (EKS recommended).

Prerequisites
- `kubectl` configured for target cluster
- `helm` (v3)
- An S3 bucket for Loki index & chunks (or other object store)
- AWS credentials available to the cluster:
  - Recommended: IRSA (IAM Role for Service Account) on EKS
  - Alternative: Kubernetes secret containing `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`

Quick deploy (example)
1. Edit `monitoring/loki/values.yaml` and set `<S3_BUCKET_NAME>` to your S3 bucket.
2. (IRSA) Create an IAM role that allows `s3:GetObject`, `s3:PutObject`, `s3:ListBucket` on that bucket and annotate the Loki ServiceAccount.
3. Add Grafana repo and update:

```powershell
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

4. Install Loki stack (namespace `monitoring` recommended):

```powershell
kubectl create ns monitoring
helm install loki grafana/loki-stack -n monitoring -f monitoring/loki/values.yaml
```

5. Promtail
- You can enable `promtail` in the values by setting `promtail.enabled: true` and providing the `promtail.config` block.
- Or deploy Promtail separately using the `monitoring/promtail/promtail-config.yaml` as a ConfigMap and daemonset. Example:

```powershell
kubectl -n monitoring create configmap promtail-config --from-file=promtail.yaml=monitoring/promtail/promtail-config.yaml
# Then apply a daemonset that mounts that config (not included in this template)
```

6. Grafana datasource
- Add a Loki datasource in Grafana pointing to `http://loki.monitoring.svc.cluster.local:3100` (or the Service/Ingress you expose).

Notes and production tips
- Use IRSA for secure S3 access from EKS.
- Tune retention and bucket lifecycle policies on S3 to match expected retention (the `retention_period` in values).
- For HA and scale, configure ruler, compactor and quorum replicas; this template is minimal and intended as a starting point.

If you want, I can:
- Deploy these charts to your EKS cluster if you provide kubeconfig or allow me access.
- Create IAM role and annotate service account (IRSA) if you provide AWS permissions.
- Generate a Promtail DaemonSet manifest that uses the ConfigMap above.
