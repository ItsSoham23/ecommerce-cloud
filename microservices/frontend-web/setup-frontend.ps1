# Push Frontend Image to ECR (Windows PowerShell)
# Usage: .\push-to-ecr.ps1 -AccountId YOUR_ACCOUNT_ID -Region us-east-1

param(
    [Parameter(Mandatory=$true)]
    [string]$AccountId,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$ImageTag = "latest"
)

$RepoName = "frontend-web"

Write-Host "🚀 Pushing frontend-web to ECR..." -ForegroundColor Green
Write-Host "   Account: $AccountId" -ForegroundColor Cyan
Write-Host "   Region: $Region" -ForegroundColor Cyan
Write-Host "   Tag: $ImageTag" -ForegroundColor Cyan
Write-Host ""

# Login to ECR
Write-Host "🔐 Logging in to ECR..." -ForegroundColor Yellow
$LoginCommand = aws ecr get-login-password --region $Region
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to get ECR login password" -ForegroundColor Red
    exit 1
}

$LoginCommand | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$Region.amazonaws.com"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to login to ECR" -ForegroundColor Red
    exit 1
}

# Build image
Write-Host "🏗️  Building Docker image..." -ForegroundColor Yellow
docker build -t "${RepoName}:${ImageTag}" .
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build image" -ForegroundColor Red
    exit 1
}

# Tag image
Write-Host "🏷️  Tagging image..." -ForegroundColor Yellow
docker tag "${RepoName}:${ImageTag}" "$AccountId.dkr.ecr.$Region.amazonaws.com/${RepoName}:${ImageTag}"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to tag image" -ForegroundColor Red
    exit 1
}

# Push image
Write-Host "⬆️  Pushing to ECR..." -ForegroundColor Yellow
docker push "$AccountId.dkr.ecr.$Region.amazonaws.com/${RepoName}:${ImageTag}"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push image" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Successfully pushed to ECR!" -ForegroundColor Green
Write-Host "   Image: $AccountId.dkr.ecr.$Region.amazonaws.com/${RepoName}:${ImageTag}" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Update k8s/deployment.yaml with this image URI" -ForegroundColor Yellow