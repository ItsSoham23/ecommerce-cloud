<#
Bootstrap local Kubernetes environment for this repo.

Usage (PowerShell):
  ./scripts/bootstrap-local.ps1

What it does:
  - Creates a kind cluster named `ecommerce-local` (if kind is installed)
  - Installs ingress-nginx via Helm
  - Installs kube-prometheus-stack (Prometheus + Grafana) using repo values
  - Applies kustomize overlay at `k8s/overlays/local`
  - Shows pod and ingress status

Adjust variables below to suit your environment.
#>

$ErrorActionPreference = 'Stop'

# configuration
$clusterName = 'ecommerce-local'
$kustomizeDir = 'k8s/overlays/local'

Write-Host "Bootstrapping local cluster: $clusterName"

function Exec {
    param($cmd)
    Write-Host "=> $cmd"
    iex $cmd
}

# Create kind cluster if kind is available
try {
    $kindExists = (Get-Command kind -ErrorAction SilentlyContinue) -ne $null
} catch {
    $kindExists = $false
}

if ($kindExists) {
    Write-Host 'Creating kind cluster (if not exists)'
    if (-not (kind get clusters | Select-String $clusterName)) {
        Exec "kind create cluster --name $clusterName"
    } else {
        Write-Host "Cluster $clusterName already exists"
    }
} else {
    Write-Warning 'kind not found. Please install kind or use Docker Desktop Kubernetes and ensure kubectl context is set.'
}

# Add Helm repos
Exec "helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx"
Exec "helm repo add prometheus-community https://prometheus-community.github.io/helm-charts"
Exec "helm repo add grafana https://grafana.github.io/helm-charts"
Exec "helm repo update"

# Install ingress-nginx
Write-Host 'Installing ingress-nginx (if not present)'
if (-not (helm ls -A | Select-String ingress-nginx)) {
    Exec "helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx --create-namespace --namespace ingress-nginx"
} else {
    Write-Host 'ingress-nginx already installed'
}

# Install kube-prometheus-stack (Prometheus + Grafana). The repo contains prometheus-values.yaml
$promVals = 'monitoring/prometheus-values.yaml'
if (Test-Path $promVals) {
    if (-not (helm ls -A | Select-String kube-prometheus-stack)) {
        Exec "helm upgrade --install monitoring prometheus-community/kube-prometheus-stack --namespace monitoring --create-namespace -f $promVals"
    } else {
        Write-Host 'kube-prometheus-stack already installed'
    }
} else {
    Write-Warning "Prometheus values file not found at $promVals. Installing with defaults."
    Exec "helm upgrade --install monitoring prometheus-community/kube-prometheus-stack --namespace monitoring --create-namespace"
}

# Apply kustomize overlay
Write-Host "Applying kustomize overlay: $kustomizeDir"
Exec "kubectl apply -k $kustomizeDir"

Write-Host 'Waiting for pods to become ready (60s)'
Start-Sleep -Seconds 10
Exec "kubectl get pods -n ecommerce"
Exec "kubectl get svc -n ecommerce"
Exec "kubectl get ingress -n ecommerce"

Write-Host 'Bootstrap complete. Check Grafana and Prometheus via your cluster (kube-prometheus-stack provides Grafana service).'
