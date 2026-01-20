# Setup Kenny account in PRODUCTION database via Railway API

$email = "kenny@audico.co.za"
$railwayUrl = "https://botflow-production.up.railway.app"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Setup Production Account" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Target: $railwayUrl" -ForegroundColor Yellow
Write-Host "User: $email`n" -ForegroundColor Yellow

# Step 1: Login to get auth token
Write-Host "[1/3] Logging in..." -ForegroundColor Cyan
$password = Read-Host "Enter password for $email" -AsSecureString
$passwordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

try {
    $loginBody = @{
        email = $email
        password = $passwordPlain
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod `
        -Uri "$railwayUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop

    $token = $loginResponse.token
    $userId = $loginResponse.user.id

    Write-Host "Success! User ID: $userId" -ForegroundColor Green

    if ($loginResponse.organization) {
        Write-Host "Organization already exists: $($loginResponse.organization.name)" -ForegroundColor Yellow
        $orgId = $loginResponse.organization.id
    } else {
        Write-Host "No organization found - will create" -ForegroundColor Yellow
        $orgId = $null
    }

    if ($loginResponse.whatsappAccount) {
        Write-Host "WhatsApp account already exists: $($loginResponse.whatsappAccount.phone_number)" -ForegroundColor Green
        Write-Host "`n========================================" -ForegroundColor Green
        Write-Host "ACCOUNT ALREADY SETUP!" -ForegroundColor Green
        Write-Host "========================================`n" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "WhatsApp account missing - will create`n" -ForegroundColor Yellow
    }

} catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Build backend to run setup script
Write-Host "[2/3] Building backend..." -ForegroundColor Cyan
cd "c:\Users\kenny\OneDrive\Whatsapp Service\botflow-backend"

npm run build 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    cd ..
    exit 1
}

Write-Host "Build successful`n" -ForegroundColor Green

# Step 3: Run setup script with PRODUCTION environment
Write-Host "[3/3] Running setup script..." -ForegroundColor Cyan
Write-Host "This will create organization and WhatsApp account in production database`n" -ForegroundColor Yellow

$env:NODE_ENV = "production"
node dist/scripts/create-dev-org.js

cd ..

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
    Write-Host "2. Open incognito window (Ctrl+Shift+N)" -ForegroundColor White
    Write-Host "3. Login at https://botflow-r9q3.vercel.app/login" -ForegroundColor White
    Write-Host "4. Try creating a bot!`n" -ForegroundColor White
} else {
    Write-Host "`nSetup script failed - check output above" -ForegroundColor Red
    exit 1
}
