$GCLOUD = "C:\Users\asefa\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
$PROJECT_ID = "voice-ai-agent-447515"
$REGION = "us-central1"
$SERVICE_NAME = "live-interview-api"

Write-Host "Deploying to Cloud Run..." -ForegroundColor Green

# Create env vars YAML file
$envVars = @"
NODE_ENV: production
API_PORT: "3001"
API_HOST: "0.0.0.0"
API_PREFIX: api
CORS_ORIGINS: "https://web-taupe-theta-94.vercel.app,http://localhost:3000"
"@
$envFile = [System.IO.Path]::GetTempFileName() + ".yaml"
[IO.File]::WriteAllText($envFile, $envVars)

try {
    & $GCLOUD run deploy $SERVICE_NAME `
        --image "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" `
        --platform managed `
        --region $REGION `
        --memory 2048Mi `
        --cpu 2 `
        --timeout 3600s `
        --concurrency 80 `
        --max-instances 10 `
        --min-instances 1 `
        --env-vars-file $envFile `
        --set-secrets GEMINI_API_KEY=gemini-api-key:latest,MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest `
        --allow-unauthenticated

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Deployment successful!" -ForegroundColor Green
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
    } else {
        Write-Host "Deployment failed!" -ForegroundColor Red
    }
} finally {
    Remove-Item $envFile -ErrorAction SilentlyContinue
}
