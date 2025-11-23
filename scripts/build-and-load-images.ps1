<#
Build microservice Docker images and load them into the kind cluster `ecommerce-local`.

Run (PowerShell):
  ./scripts/build-and-load-images.ps1

This script will look for subfolders under `microservices/` that contain a `Dockerfile`,
build an image with the folder name as the image tag (e.g. `cart-service:latest`) and load
it into the `ecommerce-local` kind cluster.
#>

$ErrorActionPreference = 'Stop'

$clusterName = 'ecommerce-local'
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

Write-Host "Building and loading images into kind cluster: $clusterName"

$servicesDir = Join-Path $root '..\microservices'
Get-ChildItem -Path $servicesDir -Directory | ForEach-Object {
    $svc = $_.Name
    $svcPath = $_.FullName
    $dockerfile = Join-Path $svcPath 'Dockerfile'
    if (Test-Path $dockerfile) {
        $imageTag = "$($svc):latest"
        Write-Host "Building image $imageTag from $svcPath"
        docker build -t $imageTag $svcPath
        Write-Host "Loading $imageTag into kind cluster $clusterName"
        kind load docker-image $imageTag --name $clusterName
    } else {
        Write-Host "Skipping $svc - no Dockerfile found"
    }
}

Write-Host 'Done building/loading images.'
