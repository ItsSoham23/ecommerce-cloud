param(
    [string]$Project = 'ecommerce-cloud-dev',
    [string]$Region = 'us-central1',
    [string]$JobBodyPath = '..\job_body.json',
    [string]$OutSuccess = '..\dataproc_submit_response.json',
    [string]$OutError = '..\dataproc_submit_error.txt'
)

Set-StrictMode -Version Latest
Write-Host "Submit Dataproc job from: $JobBodyPath to project $Project region $Region"

if (-Not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "gcloud not found in PATH. Use Cloud SDK or run this in Cloud Shell."; exit 2
}

$jobPath = Resolve-Path -Path $JobBodyPath -ErrorAction Stop
try {
    $token = gcloud auth print-access-token 2>&1 | Out-String
    $token = $token.Trim()
} catch {
    Write-Host "Failed to fetch access token: $($_)"; exit 3
}

Write-Host "Using token length: $($token.Length)"

try {
    $body = Get-Content -Path $jobPath -Raw -ErrorAction Stop
} catch {
    Write-Host "Failed to read job body at $($jobPath): $($_)"; exit 4
}

$uri = "https://dataproc.googleapis.com/v1/projects/$Project/regions/$Region/jobs:submit"
Write-Host "POST $uri"

try {
    $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $body -TimeoutSec 300
    $json = $resp | ConvertTo-Json -Depth 12
    $json | Out-File -FilePath $OutSuccess -Encoding UTF8
    Write-Host "Success: response written to $OutSuccess"
    Write-Host $json
    exit 0
} catch {
    $e = $_.Exception
    if ($e.Response -ne $null) {
        $stream = $e.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $text = $reader.ReadToEnd()
        $text | Out-File -FilePath $OutError -Encoding UTF8
        Write-Host "Error response saved to $OutError"
        Write-Host "--- Error response start ---"
        Write-Host $text
        Write-Host "--- Error response end ---"
        exit 5
    } else {
        Write-Host "Invoke-RestMethod exception: $($e.Message)"; exit 6
    }
}
