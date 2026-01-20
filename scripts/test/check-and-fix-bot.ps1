# Build and run bot user check script

Write-Host "`nBuilding backend..." -ForegroundColor Yellow
cd "c:\Users\kenny\OneDrive\Whatsapp Service\botflow-backend"

npm run build 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host "Running bot user check script...`n" -ForegroundColor Yellow

node dist/scripts/check-bot-user.js

cd ..

Write-Host "`nDone! Now refresh the bot list page in your browser." -ForegroundColor Green
