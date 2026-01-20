# Simple setup: Build and run the setup script that writes directly to Supabase

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Setup Kenny Account in Supabase" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Building backend..." -ForegroundColor Yellow
cd "c:\Users\kenny\OneDrive\Whatsapp Service\botflow-backend"

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host "`nRunning setup script..." -ForegroundColor Yellow
Write-Host "This will create organization and WhatsApp account in Supabase database`n" -ForegroundColor Cyan

node dist/scripts/create-dev-org.js

cd ..

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Done! Now test the production login:" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
Write-Host "Run: .\test-production-login.ps1" -ForegroundColor Yellow
Write-Host "Expected: WhatsApp account should NOT be null`n" -ForegroundColor Yellow
