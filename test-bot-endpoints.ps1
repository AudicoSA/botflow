# Test bot endpoints with authentication

$railwayUrl = "https://botflow-production.up.railway.app"
$email = "kenny@audico.co.za"

Write-Host "`nTesting Bot Endpoints`n" -ForegroundColor Cyan

# Login
$password = Read-Host "Enter password" -AsSecureString
$passwordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

$loginBody = @{
    email = $email
    password = $passwordPlain
} | ConvertTo-Json

try {
    Write-Host "[1/3] Logging in..." -ForegroundColor Yellow
    $loginResponse = Invoke-RestMethod `
        -Uri "$railwayUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $loginResponse.token
    Write-Host "✅ Login successful`n" -ForegroundColor Green

    # Decode JWT to see what's in it
    Write-Host "[2/3] Decoding JWT token..." -ForegroundColor Yellow
    $tokenParts = $token.Split('.')
    $payload = $tokenParts[1]
    while ($payload.Length % 4 -ne 0) { $payload += "=" }
    $payloadBytes = [System.Convert]::FromBase64String($payload)
    $payloadJson = [System.Text.Encoding]::UTF8.GetString($payloadBytes)
    $tokenData = $payloadJson | ConvertFrom-Json

    Write-Host "JWT contains:" -ForegroundColor Cyan
    Write-Host "  userId: $($tokenData.userId)" -ForegroundColor White
    Write-Host "  email: $($tokenData.email)" -ForegroundColor White
    Write-Host "  organizationId: $($tokenData.organizationId)`n" -ForegroundColor White

    # Test bot list
    Write-Host "[3/3] Fetching bot list..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    $botsResponse = Invoke-RestMethod `
        -Uri "$railwayUrl/api/bots" `
        -Method GET `
        -Headers $headers

    Write-Host "✅ Bot list fetched successfully!" -ForegroundColor Green
    Write-Host "Number of bots: $($botsResponse.bots.Count)`n" -ForegroundColor Yellow

    if ($botsResponse.bots.Count -gt 0) {
        Write-Host "Bots:" -ForegroundColor Cyan
        $botsResponse.bots | ForEach-Object {
            Write-Host "  - $($_.name)" -ForegroundColor White
            Write-Host "    ID: $($_.id)" -ForegroundColor Gray
            Write-Host "    Type: $($_.type)" -ForegroundColor Gray
        }
    } else {
        Write-Host "No bots found - Railway may not have deployed the fix yet." -ForegroundColor Red
        Write-Host "Wait 1-2 minutes and try again.`n" -ForegroundColor Yellow
    }

} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
