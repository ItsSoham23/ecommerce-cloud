param(
  [string]$Namespace = "ecommerce",
  [string]$ApiHost = ""
)

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$out = Join-Path $PSScriptRoot "cluster-info-$ts.txt"
Write-Host "Writing cluster info to $out"

"Timestamp: $(Get-Date)" | Out-File $out
"Namespace: $Namespace" | Out-File $out -Append

Write-Host "Getting ingresses..."
kubectl -n $Namespace get ingress 2>&1 | Tee-Object -FilePath $out -Append

Write-Host "Describing ingresses..."
kubectl -n $Namespace describe ingress 2>&1 | Tee-Object -FilePath $out -Append

Write-Host "Getting services (wide)..."
kubectl -n $Namespace get svc -o wide 2>&1 | Tee-Object -FilePath $out -Append

Write-Host "Listing LoadBalancer hostnames (if any)..."
kubectl -n $Namespace get svc --field-selector spec.type=LoadBalancer -o jsonpath="{range .items[*]}{.metadata.name}{': '}{.status.loadBalancer.ingress[*].hostname}{'\n'}{end}" 2>&1 | Tee-Object -FilePath $out -Append

Write-Host "Getting user-service pods and deployment..."
kubectl -n $Namespace get pods -l app=user-service -o wide 2>&1 | Tee-Object -FilePath $out -Append
kubectl -n $Namespace get deployment user-service -o yaml 2>&1 | Tee-Object -FilePath $out -Append

Write-Host "Fetching logs for user-service deployment (last 500 lines)..."
kubectl -n $Namespace logs deployment/user-service --tail=500 2>&1 | Tee-Object -FilePath $out -Append

if ($ApiHost -ne "") {
  Write-Host "Running curl POST test against $ApiHost/api/users ..."
  try {
    & curl -v -X POST "https://$ApiHost/api/users" -H "Content-Type: application/json" -d '{"email":"test1@gmail.com","firstName":"test1","lastName":"te","password":"test123","phone":"1234567890"}' 2>&1 | Tee-Object -FilePath $out -Append
  } catch {
    "Curl failed: $_" | Tee-Object -FilePath $out -Append
  }
}

Write-Host "Done. Output saved to: $out" 
