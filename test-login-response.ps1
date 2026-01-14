# Test what the login endpoint returns
# This will show us if WhatsApp account is in the database

$email = "kenny@audico.co.za"
$password = Read-Host "Enter your password" -AsSecureString
$passwordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Testing Login Response" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

try {
    $loginBody = @{
        email = $email
        password = $passwordPlain
    } | ConvertTo-Json

    $response = Invoke-RestMethod `
        -Uri "https://botflow-backend-production.up.railway.app/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    Write-Host "Login successful`n" -ForegroundColor Green

    Write-Host "User:" -ForegroundColor Cyan
    Write-Host "  ID: $($response.user.id)"
    Write-Host "  Email: $($response.user.email)"
    Write-Host "  Name: $($response.user.fullName)`n"

    Write-Host "Organization:" -ForegroundColor Cyan
    if ($response.organization) {
        Write-Host "  ID: $($response.organization.id)" -ForegroundColor Green
        Write-Host "  Name: $($response.organization.name)"
        Write-Host "  Plan: $($response.organization.plan)`n"
    } else {
        Write-Host "  NULL" -ForegroundColor Red
        Write-Host "`n"
    }

    Write-Host "WhatsApp Account:" -ForegroundColor Cyan
    if ($response.whatsappAccount) {
        Write-Host "  ID: $($response.whatsappAccount.id)" -ForegroundColor Green
        Write-Host "  Phone: $($response.whatsappAccount.phone_number)"
        Write-Host "  Display Name: $($response.whatsappAccount.display_name)"
        Write-Host "  Status: $($response.whatsappAccount.status)"
        Write-Host "  Provider: $($response.whatsappAccount.provider)`n"

        Write-Host "========================================" -ForegroundColor Green
        Write-Host "SUCCESS! WhatsApp account found!" -ForegroundColor Green
        Write-Host "========================================`n" -ForegroundColor Green

        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Clear browser cache (Ctrl+Shift+Delete)"
        Write-Host "2. Open incognito window (Ctrl+Shift+N)"
        Write-Host "3. Login at https://botflow-r9q3.vercel.app/login"
        Write-Host "4. Try creating a bot!`n"
    } else {
        Write-Host "  NULL" -ForegroundColor Red
        Write-Host "`n"

        Write-Host "========================================" -ForegroundColor Red
        Write-Host "PROBLEM: WhatsApp account not found!" -ForegroundColor Red
        Write-Host "========================================`n" -ForegroundColor Red

        Write-Host "This means the integration endpoint did not create the record." -ForegroundColor Yellow
        Write-Host "`nNext steps:" -ForegroundColor Yellow
        Write-Host "1. Go to https://botflow-r9q3.vercel.app/dashboard/integrations"
        Write-Host "2. Click Manage on WhatsApp card"
        Write-Host "3. Re-enter your Twilio credentials:"
        Write-Host "   - Provider: Twilio"
        Write-Host "   - Display Name: Kenny WhatsApp"
        Write-Host "   - Account SID: Your Twilio SID"
        Write-Host "   - Auth Token: Your Twilio token"
        Write-Host "   - Phone Number: Your Twilio number"
        Write-Host "4. Click Update button"
        Write-Host "5. Run this script again to verify`n"
    }

} catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nError details:" -ForegroundColor Yellow
    Write-Host $_.ErrorDetails.Message
}
