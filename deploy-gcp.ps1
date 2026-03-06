$GCLOUD = "C:\Users\asefa\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"

# Set environment variables
$GEMINI_API_KEY = "AIzaSyC1hC7VQNRLlSsLL_8nPO-udRffqjl8V98"
$MONGODB_URI = "mongodb+srv://liveaicoach:l7bTrF60Aes838d6@cluster0.8vksczm.mongodb.net/liveaicoachdb?appName=Cluster0"

Write-Host "=== Creating secrets ===" -ForegroundColor Cyan

# Create or update Gemini API Key secret
Write-Host "Creating/updating gemini-api-key..." -ForegroundColor Yellow
$tempFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempFile -Value $GEMINI_API_KEY -NoNewline
& $GCLOUD secrets create gemini-api-key --data-file=$tempFile --replication-policy=automatic 2>$null
if ($LASTEXITCODE -ne 0) {
    Remove-Item $tempFile
    $tempFile = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $tempFile -Value $GEMINI_API_KEY -NoNewline
    & $GCLOUD secrets update gemini-api-key --data-file=$tempFile
}
Remove-Item $tempFile
Write-Host "gemini-api-key created/updated" -ForegroundColor Green

# Create or update MongoDB URI secret
Write-Host "Creating/updating mongodb-uri..." -ForegroundColor Yellow
$tempFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempFile -Value $MONGODB_URI -NoNewline
& $GCLOUD secrets create mongodb-uri --data-file=$tempFile --replication-policy=automatic 2>$null
if ($LASTEXITCODE -ne 0) {
    Remove-Item $tempFile
    $tempFile = [System.IO.Path]::GetTempFileName()
    Set-Content -Path $tempFile -Value $MONGODB_URI -NoNewline
    & $GCLOUD secrets update mongodb-uri --data-file=$tempFile
}
Remove-Item $tempFile
Write-Host "mongodb-uri created/updated" -ForegroundColor Green

Write-Host ""
Write-Host "=== Creating Artifact Registry ===" -ForegroundColor Cyan
& $GCLOUD artifacts repositories create cloud-run-source-deploy --location=us-central1 --repository-format=docker 2>$null
Write-Host "Artifact Registry ready" -ForegroundColor Green

Write-Host ""
Write-Host "=== Deploying to Cloud Run ===" -ForegroundColor Cyan
Set-Location "D:\laic"

$COMMIT_SHA = Get-Date -Format "yyyyMMddHHmmss"
& $GCLOUD builds submit --config apps/api/cloudbuild.yaml --substitutions=_SERVICE_NAME=live-interview-api,_REGION=us-central1,_COMMIT_SHA=$COMMIT_SHA

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
& $GCLOUD run services describe live-interview-api --region=us-central1 --format="value(status.url)"
