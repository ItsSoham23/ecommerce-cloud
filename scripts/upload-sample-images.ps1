<#
Uploads a tiny sample image for each product using the product-service upload endpoint.
Usage:
  $env:PRODUCT_API = 'http://localhost:8082'
  .\scripts\upload-sample-images.ps1

This script fetches products from the product API and POSTs a small PNG for each product
to `/api/products/:id/upload-image` (form field `image`). It works against the local
product-service running on port 8082. For LocalStack or custom S3 endpoints, ensure the
product-service environment is configured accordingly.
#>

$ProductApi = $env:PRODUCT_API
if (-not $ProductApi) { $ProductApi = 'http://localhost:8082' }
Write-Host "Using product API: $ProductApi"

# Minimal 1x1 PNG (base64)
$base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='

try {
    $products = Invoke-RestMethod -Uri "$ProductApi/api/products" -Method Get -ErrorAction Stop
} catch {
    Write-Error "Failed to fetch products from $ProductApi/api/products : $($_.Exception.Message)"
    exit 1
}

foreach ($p in $products) {
    try {
        $temp = Join-Path $env:TEMP "product-$($p.id)-sample.png"
        [IO.File]::WriteAllBytes($temp, [Convert]::FromBase64String($base64))
        Write-Host "Uploading sample image for product id=$($p.id) to $ProductApi/api/products/$($p.id)/upload-image"
        $resp = Invoke-RestMethod -Uri "$ProductApi/api/products/$($p.id)/upload-image" -Method Post -Form @{ image = Get-Item $temp } -ErrorAction Stop
        Write-Host "Response for product $($p.id):"; Write-Host ($resp | ConvertTo-Json -Depth 3)
        Remove-Item $temp -ErrorAction SilentlyContinue
    } catch {
        Write-Warning "Upload failed for product $($p.id): $($_.Exception.Message)"
    }
}

Write-Host "Done. Triggered uploads for $($products.Count) products. The image-processor Lambda will create resized variants asynchronously."