# Test production Railway login endpoint

$email = "kenny@audico.co.za"
$password = Read-Host "Enter your password" -AsSecureString
$passwordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host "`nTesting production login..." -ForegroundColor Cyan

try {
    $loginBody = @{
        email = $email
        password = $passwordPlain
    } | ConvertTo-Json

    # Try the actual Railway URL
    $response = Invoke-RestMethod `
        -Uri "https://botflow-production.up.railway.app/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop

    Write-Host "Login successful!" -ForegroundColor Green
    Write-Host "`nOrganization:" -ForegroundColor Yellow
    Write-Host ($response.organization | ConvertTo-Json)

    Write-Host "`nWhatsApp Account:" -ForegroundColor Yellow
    if ($response.whatsappAccount) {
        Write-Host ($response.whatsappAccount | ConvertTo-Json)
        Write-Host "`nSUCCESS - WhatsApp account found!" -ForegroundColor Green
    } else {
        Write-Host "NULL - Not found in database" -ForegroundColor Red
    }

} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Failed with status code: $statusCode" -ForegroundColor Red

    if ($statusCode -eq 404) {
        Write-Host "`nThe Railway URL is wrong or the service is not deployed." -ForegroundColor Yellow
        Write-Host "Check your Railway dashboard for the correct URL." -ForegroundColor Yellow
    } else {
        Write-Host "`nError: $($_.Exception.Message)" -ForegroundColor Red
        try {
            $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host ($errorBody | ConvertTo-Json) -ForegroundColor Red
        } catch {
            Write-Host $_.ErrorDetails.Message -ForegroundColor Red
        }
    }
}
