# Test after Railway redeploys with Supabase variables

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Testing Railway with Supabase Connection" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Waiting 90 seconds for Railway to finish deploying..." -ForegroundColor Yellow
Start-Sleep -Seconds 90

$railwayUrl = "https://botflow-production.up.railway.app"
$email = "kenny@audico.co.za"

Write-Host "`n[1/2] Testing health endpoint..." -ForegroundColor Cyan

try {
    $health = Invoke-RestMethod -Uri "$railwayUrl/health" -Method GET -ErrorAction Stop
    Write-Host "SUCCESS - Railway is running!" -ForegroundColor Green
    Write-Host "Uptime: $($health.uptime) seconds`n" -ForegroundColor White
} catch {
    Write-Host "FAILED - Railway not responding`n" -ForegroundColor Red
    exit 1
}

Write-Host "[2/2] Testing login endpoint..." -ForegroundColor Cyan
$password = Read-Host "Enter password for $email" -AsSecureString
$passwordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

try {
    $loginBody = @{
        email = $email
        password = $passwordPlain
    } | ConvertTo-Json

    $response = Invoke-RestMethod `
        -Uri "$railwayUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop

    Write-Host "`nLogin Response:" -ForegroundColor Yellow
    Write-Host "  User: $($response.user.email)" -ForegroundColor White

    if ($response.organization) {
        Write-Host "  Organization: $($response.organization.name)" -ForegroundColor Green
    } else {
        Write-Host "  Organization: NULL" -ForegroundColor Red
    }

    if ($response.whatsappAccount) {
        Write-Host "  WhatsApp Account: $($response.whatsappAccount.phone_number)" -ForegroundColor Green
        Write-Host "  WhatsApp ID: $($response.whatsappAccount.id)" -ForegroundColor White
        Write-Host "  Status: $($response.whatsappAccount.status)" -ForegroundColor White

        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "SUCCESS! Bot creation should now work!" -ForegroundColor Green
        Write-Host "========================================`n" -ForegroundColor Green

        Write-Host "Next Steps:" -ForegroundColor Yellow
        Write-Host "1. Open browser in incognito mode (Ctrl+Shift+N)" -ForegroundColor White
        Write-Host "2. Go to: https://botflow-r9q3.vercel.app/login" -ForegroundColor Cyan
        Write-Host "3. Login with $email" -ForegroundColor White
        Write-Host "4. Try creating a bot from the Gym template!" -ForegroundColor White
        Write-Host "5. Should work without errors!`n" -ForegroundColor Green

    } else {
        Write-Host "  WhatsApp Account: NULL" -ForegroundColor Red

        Write-Host "`n========================================" -ForegroundColor Red
        Write-Host "STILL NULL - Troubleshooting needed" -ForegroundColor Red
        Write-Host "========================================`n" -ForegroundColor Red

        Write-Host "Possible issues:" -ForegroundColor Yellow
        Write-Host "1. Railway deployed before variables were added" -ForegroundColor White
        Write-Host "2. Database connection issue" -ForegroundColor White
        Write-Host "3. Data doesn't exist in Supabase" -ForegroundColor White
        Write-Host "`nTry running: .\verify-production-data.ps1`n" -ForegroundColor Yellow
    }

} catch {
    Write-Host "`nLOGIN FAILED:" -ForegroundColor Red
    Write-Host "$($_.Exception.Message)`n" -ForegroundColor Red
}
