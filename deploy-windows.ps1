# Deployment script for Google Cloud Run on Windows
$ErrorActionPreference = "Continue"

# Configuration
$PROJECT_ID = "voice-ai-agent-447515"
$REGION = "us-central1"
$SERVICE_NAME = "live-interview-api"

# Environment variables - MUST be set before running
# Example:
# $env:GEMINI_API_KEY="your-gemini-api-key"
# $env:MONGODB_URI="mongodb+srv://..."
$GEMINI_API_KEY = $env:GEMINI_API_KEY
$MONGODB_URI = $env:MONGODB_URI

# Validate required environment variables
if ([string]::IsNullOrEmpty($GEMINI_API_KEY)) {
    Write-Host "ERROR: GEMINI_API_KEY environment variable not set" -ForegroundColor Red
    Write-Host "Usage: `$env:GEMINI_API_KEY='your-key'; `$env:MONGODB_URI='your-connection-string'; .\deploy-windows.ps1" -ForegroundColor Yellow
    exit 1
}

if ([string]::IsNullOrEmpty($MONGODB_URI)) {
    Write-Host "ERROR: MONGODB_URI environment variable not set" -ForegroundColor Red
    Write-Host "Usage: `$env:GEMINI_API_KEY='your-key'; `$env:MONGODB_URI='your-connection-string'; .\deploy-windows.ps1" -ForegroundColor Yellow
    exit 1
}

$GCLOUD = "C:\Users\asefa\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Live AI Interview Coach Deployment" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Set project
Write-Host "[1/6] Setting project to: $PROJECT_ID" -ForegroundColor Green
& $GCLOUD config set project $PROJECT_ID

# Enable required APIs
Write-Host "[2/6] Enabling required Google Cloud APIs..." -ForegroundColor Green
& $GCLOUD services enable run.googleapis.com cloudbuild.googleapis.com aiplatform.googleapis.com secretmanager.googleapis.com --quiet

# Create secrets
Write-Host "[3/6] Setting up secrets..." -ForegroundColor Green

# Create temp files for secrets
$geminiTemp = [IO.Path]::GetTempFileName()
[IO.File]::WriteAllText($geminiTemp, $GEMINI_API_KEY)
& $GCLOUD secrets create gemini-api-key --data-file=$geminiTemp --replication-policy=automatic 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Updating existing gemini-api-key secret..." -ForegroundColor Yellow
    & $GCLOUD secrets versions add gemini-api-key --data-file=$geminiTemp
}
Remove-Item $geminiTemp

$mongoTemp = [IO.Path]::GetTempFileName()
[IO.File]::WriteAllText($mongoTemp, $MONGODB_URI)
& $GCLOUD secrets create mongodb-uri --data-file=$mongoTemp --replication-policy=automatic 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Updating existing mongodb-uri secret..." -ForegroundColor Yellow
    & $GCLOUD secrets versions add mongodb-uri --data-file=$mongoTemp
}
Remove-Item $mongoTemp

# Build and push Docker image
Write-Host "[4/6] Building and pushing Docker image..." -ForegroundColor Green
$imageName = "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

# Build with Docker (use repo root as context since Dockerfile references root files)
docker build -f apps/api/Dockerfile -t $imageName .
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed!" -ForegroundColor Red
    exit 1
}

# Push to gcr.io
Write-Host "  Pushing image to gcr.io..." -ForegroundColor Yellow
& $GCLOUD auth configure-docker gcr.io --quiet
docker push $imageName

# Deploy to Cloud Run
Write-Host "[5/6] Deploying to Cloud Run..." -ForegroundColor Green
& $GCLOUD run deploy $SERVICE_NAME `
    --image $imageName `
    --platform managed `
    --region $REGION `
    --memory 2048Mi `
    --cpu 2 `
    --timeout 3600s `
    --concurrency 80 `
    --max-instances 10 `
    --min-instances 1 `
    --set-env-vars NODE_ENV=production,API_PORT=3001,API_HOST=0.0.0.0,API_PREFIX=api,CORS_ORIGINS=https://web-taupe-theta-94.vercel.app,http://localhost:3000 `
    --set-secrets GEMINI_API_KEY=gemini-api-key:latest,MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest `
    --allow-unauthenticated

# Get service URL
Write-Host "[6/6] Getting service URL..." -ForegroundColor Green
$SERVICE_URL = & $GCLOUD run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "API URL: $SERVICE_URL" -ForegroundColor Yellow
$wsUrl = $SERVICE_URL -replace 'https://', 'wss://'
Write-Host "WebSocket URL: $wsUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update Vercel environment variables:"
Write-Host "   NEXT_PUBLIC_API_URL=$SERVICE_URL"
Write-Host "   NEXT_PUBLIC_WS_URL=$wsUrl"
Write-Host ""
Write-Host "2. Redeploy frontend with:"
Write-Host "   cd apps\web && vercel --prod"
Write-Host ""
Write-Host "Done!" -ForegroundColor Green
