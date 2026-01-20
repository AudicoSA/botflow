# Check what user_id the bot was created with

$railwayUrl = "https://botflow-production.up.railway.app"
$email = "kenny@audico.co.za"

Write-Host "`nChecking bot data in database...`n" -ForegroundColor Cyan

# Login first
$password = Read-Host "Enter password" -AsSecureString
$passwordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

$loginBody = @{
    email = $email
    password = $passwordPlain
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod `
        -Uri "$railwayUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $loginResponse.token
    $userId = $loginResponse.user.id

    Write-Host "Logged in successfully!" -ForegroundColor Green
    Write-Host "User ID from login response: $userId`n" -ForegroundColor Yellow

    # Try to get bot list
    Write-Host "Fetching bot list..." -ForegroundColor Cyan

    $bots = Invoke-RestMethod `
        -Uri "$railwayUrl/api/bots" `
        -Method GET `
        -Headers @{ Authorization = "Bearer $token" }

    Write-Host "Bots returned: $($bots.bots.Count)" -ForegroundColor Yellow

    if ($bots.bots.Count -gt 0) {
        Write-Host "`nBots found:" -ForegroundColor Green
        $bots.bots | ForEach-Object {
            Write-Host "  - $($_.name) (ID: $($_.id))" -ForegroundColor White
            Write-Host "    Created: $($_.created_at)" -ForegroundColor Gray
            Write-Host "    User ID: $($_.user_id)" -ForegroundColor Gray
        }
    } else {
        Write-Host "`nNo bots found. This means:" -ForegroundColor Red
        Write-Host "- Bot exists in database but user_id doesn't match" -ForegroundColor Yellow
        Write-Host "- Or JWT token userId field is different`n" -ForegroundColor Yellow
    }

    # Try to decode JWT token
    Write-Host "`nDecoding JWT token..." -ForegroundColor Cyan
    $tokenParts = $token.Split('.')
    if ($tokenParts.Length -ge 2) {
        $payload = $tokenParts[1]
        # Add padding if needed
        while ($payload.Length % 4 -ne 0) {
            $payload += "="
        }
        $payloadBytes = [System.Convert]::FromBase64String($payload)
        $payloadJson = [System.Text.Encoding]::UTF8.GetString($payloadBytes)
        $payloadObj = $payloadJson | ConvertFrom-Json

        Write-Host "JWT Token contains:" -ForegroundColor Yellow
        Write-Host ($payloadObj | ConvertTo-Json -Depth 3) -ForegroundColor White
    }

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
