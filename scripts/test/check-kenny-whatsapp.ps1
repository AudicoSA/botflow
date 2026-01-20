# Run the WhatsApp diagnostic script

Write-Host "Building backend..." -ForegroundColor Yellow
cd botflow-backend
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host "`nRunning diagnostic script..." -ForegroundColor Yellow
node dist/scripts/check-kenny-whatsapp.js

cd ..
