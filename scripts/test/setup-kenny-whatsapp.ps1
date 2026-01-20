# Setup WhatsApp account for kenny@audico.co.za
# Run this after logging in to get the org ID

$baseUrl = "http://localhost:3002"  # Adjust if backend is on different port
$email = "kenny@audico.co.za"
$password = "your-password-here"  # Replace with actual password

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup WhatsApp for kenny@audico.co.za" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login to get token and org ID
Write-Host "[1/3] Logging in..." -ForegroundColor Yellow
$loginData = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginData `
        -UseBasicParsing

    $loginResult = $loginResponse.Content | ConvertFrom-Json
    $token = $loginResult.token
    $userId = $loginResult.user.id
    $orgId = $loginResult.organization.id

    Write-Host "✅ Logged in successfully" -ForegroundColor Green
    Write-Host "User ID: $userId" -ForegroundColor Gray
    Write-Host "Org ID: $orgId" -ForegroundColor Gray

    # Check if WhatsApp account already exists
    if ($loginResult.whatsappAccount) {
        Write-Host "✅ WhatsApp account already exists!" -ForegroundColor Green
        Write-Host "WhatsApp ID: $($loginResult.whatsappAccount.id)" -ForegroundColor Gray
        Write-Host "Phone: $($loginResult.whatsappAccount.phone_number)" -ForegroundColor Gray
        exit 0
    }

    Write-Host "⚠️  No WhatsApp account found. You need to connect one in the dashboard." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Go to https://botflow-r9q3.vercel.app/dashboard/settings" -ForegroundColor White
    Write-Host "2. Find 'WhatsApp Settings' section" -ForegroundColor White
    Write-Host "3. Click 'Connect WhatsApp Account'" -ForegroundColor White
    Write-Host "4. Enter your WhatsApp Business number and Bird/Twilio credentials" -ForegroundColor White

} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Response: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}
