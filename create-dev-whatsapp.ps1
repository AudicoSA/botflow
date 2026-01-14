# Create WhatsApp account for Kenny directly in database

Write-Host "Building backend..." -ForegroundColor Yellow
cd botflow-backend
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host "`nCreating WhatsApp account..." -ForegroundColor Yellow
node dist/scripts/create-dev-whatsapp.js

cd ..
