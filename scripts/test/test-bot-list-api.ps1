# Test the bot list API endpoint

$railwayUrl = "https://botflow-production.up.railway.app"
$email = "kenny@audico.co.za"

Write-Host "`nTesting Bot List API`n" -ForegroundColor Cyan

# Login
$password = Read-Host "Enter password" -AsSecureString
$passwordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

$loginBody = @{
    email = $email
    password = $passwordPlain
} | ConvertTo-Json

try {
    Write-Host "[1/2] Logging in..." -ForegroundColor Yellow
    $loginResponse = Invoke-RestMethod `
        -Uri "$railwayUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $loginResponse.token
    Write-Host "✅ Login successful`n" -ForegroundColor Green

    # Test bot list
    Write-Host "[2/2] Fetching bot list from API..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
    }

    $botsResponse = Invoke-RestMethod `
        -Uri "$railwayUrl/api/bots" `
        -Method GET `
        -Headers $headers

    Write-Host "✅ API Response:`n" -ForegroundColor Green
    Write-Host ($botsResponse | ConvertTo-Json -Depth 5)

    if ($botsResponse.bots -and $botsResponse.bots.Count -gt 0) {
        Write-Host "`n✅ SUCCESS! Found $($botsResponse.bots.Count) bot(s)" -ForegroundColor Green
        $botsResponse.bots | ForEach-Object {
            Write-Host "  - $($_.name) (ID: $($_.id))" -ForegroundColor White
        }
    } else {
        Write-Host "`n❌ EMPTY - No bots returned from API" -ForegroundColor Red
        Write-Host "This means the API query is filtering out your bot.`n" -ForegroundColor Yellow
    }

} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}
