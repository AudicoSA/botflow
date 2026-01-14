# Setup complete Kenny account with organization and WhatsApp

Write-Host "Building backend..." -ForegroundColor Yellow
cd botflow-backend
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host "`nSetting up account..." -ForegroundColor Yellow
node dist/scripts/create-dev-org.js

cd ..
