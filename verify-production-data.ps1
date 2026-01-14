# Verify production data in Supabase

Write-Host "`nBuilding backend..." -ForegroundColor Yellow
cd "c:\Users\kenny\OneDrive\Whatsapp Service\botflow-backend"

npm run build 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host "Running verification script...`n" -ForegroundColor Yellow

node dist/scripts/verify-production-data.js

cd ..
