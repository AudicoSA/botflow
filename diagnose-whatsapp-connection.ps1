# Diagnostic script to check WhatsApp connection status
# This will help us understand why bot creation is failing

$email = "kenny@audico.co.za"
$password = Read-Host "Enter your password" -AsSecureString
$passwordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "BotFlow WhatsApp Connection Diagnostic" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Test backend health
Write-Host "[1/5] Testing backend health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "https://botflow-backend-production.up.railway.app/health" -Method GET
    Write-Host "✓ Backend is healthy: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Login and get full response
Write-Host "`n[2/5] Logging in and checking response..." -ForegroundColor Yellow
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

    Write-Host "✓ Login successful" -ForegroundColor Green

    # Display user info
    Write-Host "`nUser Information:" -ForegroundColor Cyan
    Write-Host "  Email: $($response.user.email)"
    Write-Host "  User ID: $($response.user.id)"
    Write-Host "  Name: $($response.user.fullName)"

    # Display organization info
    Write-Host "`nOrganization Information:" -ForegroundColor Cyan
    if ($response.organization) {
        Write-Host "  ✓ Organization ID: $($response.organization.id)" -ForegroundColor Green
        Write-Host "  Name: $($response.organization.name)"
        Write-Host "  Plan: $($response.organization.plan)"
    } else {
        Write-Host "  ✗ No organization found!" -ForegroundColor Red
    }

    # Display WhatsApp account info (CRITICAL)
    Write-Host "`nWhatsApp Account Information:" -ForegroundColor Cyan
    if ($response.whatsappAccount) {
        Write-Host "  ✓ WhatsApp Account ID: $($response.whatsappAccount.id)" -ForegroundColor Green
        Write-Host "  Phone Number: $($response.whatsappAccount.phone_number)"
        Write-Host "  Display Name: $($response.whatsappAccount.display_name)"
        Write-Host "  Status: $($response.whatsappAccount.status)"
        Write-Host "  Provider: $($response.whatsappAccount.provider)"
        $whatsappAccountId = $response.whatsappAccount.id
    } else {
        Write-Host "  ✗ No WhatsApp account found in login response!" -ForegroundColor Red
        Write-Host "  This is why bot creation is failing." -ForegroundColor Red
        $whatsappAccountId = $null
    }

    $token = $response.token
    $orgId = $response.organization.id

} catch {
    Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Query WhatsApp accounts directly via API
Write-Host "`n[3/5] Querying WhatsApp accounts via API..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    $whatsappAccounts = Invoke-RestMethod `
        -Uri "https://botflow-backend-production.up.railway.app/api/whatsapp/accounts" `
        -Method GET `
        -Headers $headers

    if ($whatsappAccounts.accounts -and $whatsappAccounts.accounts.Count -gt 0) {
        Write-Host "✓ Found $($whatsappAccounts.accounts.Count) WhatsApp account(s)" -ForegroundColor Green
        foreach ($account in $whatsappAccounts.accounts) {
            Write-Host "  - ID: $($account.id)"
            Write-Host "    Phone: $($account.phone_number)"
            Write-Host "    Status: $($account.status)"
            Write-Host "    Org ID: $($account.organization_id)"
        }
    } else {
        Write-Host "✗ No WhatsApp accounts found via API" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Failed to query WhatsApp accounts: $($_.Exception.Message)" -ForegroundColor Red
}

# Step 4: Query database directly (via Supabase)
Write-Host "`n[4/5] Checking database for WhatsApp accounts..." -ForegroundColor Yellow
Write-Host "Organization ID: $orgId" -ForegroundColor Cyan

# We'll skip direct database query since we need Supabase credentials
Write-Host "Skipping direct database query (requires Supabase access)" -ForegroundColor Gray

# Step 5: Summary and recommendation
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Diagnostic Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($whatsappAccountId) {
    Write-Host "✓ DIAGNOSIS: Everything looks good!" -ForegroundColor Green
    Write-Host "`nYour localStorage should have:" -ForegroundColor Cyan
    Write-Host "  botflow_token: <token>"
    Write-Host "  botflow_organizationId: $orgId"
    Write-Host "  botflow_whatsappAccountId: $whatsappAccountId"
    Write-Host "`nRecommendation:" -ForegroundColor Yellow
    Write-Host "1. Clear your browser cache (Ctrl+Shift+Delete)"
    Write-Host "2. Open incognito window (Ctrl+Shift+N)"
    Write-Host "3. Login again at https://botflow-r9q3.vercel.app/login"
    Write-Host "4. Try creating a bot"
} else {
    Write-Host "✗ DIAGNOSIS: WhatsApp account not connected or not active!" -ForegroundColor Red
    Write-Host "`nPossible causes:" -ForegroundColor Yellow
    Write-Host "1. No WhatsApp account in database for your organization"
    Write-Host "2. WhatsApp account exists but status is not 'active'"
    Write-Host "3. WhatsApp account is linked to different organization"
    Write-Host "`nRecommendation:" -ForegroundColor Yellow
    Write-Host "1. Go to https://botflow-r9q3.vercel.app/dashboard/integrations"
    Write-Host "2. Click 'Manage' on WhatsApp card"
    Write-Host "3. Connect/reconnect your WhatsApp Business account"
    Write-Host "4. Verify it shows 'Connected' with green checkmark"
    Write-Host "5. Logout and login again"
    Write-Host "6. Try creating a bot"
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
