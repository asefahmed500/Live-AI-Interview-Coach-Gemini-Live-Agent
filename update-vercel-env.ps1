# Update Vercel environment variables using PowerShell
$API_URL = "https://live-interview-api-ywh3e45esq-uc.a.run.app"
$WS_URL = "wss://live-interview-api-ywh3e45esq-uc.a.run.app"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Update Vercel Environment Variables" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Please update the following environment variables in your Vercel dashboard:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://vercel.com/asefas-projects/live-ai-interview-coach/settings/environment-variables" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Update or add the following environment variables for Production:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   NEXT_PUBLIC_API_URL = $API_URL" -ForegroundColor White
Write-Host "   NEXT_PUBLIC_WS_URL = $WS_URL" -ForegroundColor White
Write-Host ""
Write-Host "3. After updating, redeploy your frontend:" -ForegroundColor Yellow
Write-Host "   cd apps\web && vercel --prod" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or run the following command to redeploy:" -ForegroundColor Yellow
Write-Host "   vercel --prod --scope live-ai-interview-coach" -ForegroundColor Cyan
Write-Host ""
