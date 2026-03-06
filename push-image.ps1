$GCLOUD = "C:\Users\asefa\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"

Write-Host "Getting access token..."
$token = & $GCLOUD auth print-access-token
Write-Host "Token obtained"

Write-Host "Logging in to gcr.io..."
$token | docker login -u oauth2accesstoken --password-stdin https://gcr.io

Write-Host "Pushing image..."
docker push gcr.io/voice-ai-agent-447515/live-interview-api:latest

Write-Host "Done!"
