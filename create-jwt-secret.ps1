$GCLOUD = "C:\Users\asefa\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"

# Generate a secure JWT secret (minimum 64 characters for production)
$chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
$jwtSecret = -join (1..64 | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })

Write-Host "Creating JWT_SECRET secret (64 chars)..." -ForegroundColor Yellow
$tempFile = [System.IO.Path]::GetTempFileName()
[IO.File]::WriteAllText($tempFile, $jwtSecret)
try {
    & $GCLOUD secrets versions add jwt-secret --data-file=$tempFile
    Write-Host "JWT_SECRET secret updated" -ForegroundColor Green
} finally {
    Remove-Item $tempFile
}
