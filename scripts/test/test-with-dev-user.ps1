# Week 12 - API Testing with Dev User

$baseUrl = "http://localhost:3001"
$devEmail = "dev@botflow.app"
$devPassword = "dev-password-123"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Week 12 - API Testing (Dev User)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Login with Dev User
Write-Host "[1/5] Logging in with dev user..." -ForegroundColor Yellow
$loginData = @{
    email = $devEmail
    password = $devPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginData `
        -UseBasicParsing

    $loginResult = $loginResponse.Content | ConvertFrom-Json
    $authToken = $loginResult.token
    $userId = $loginResult.user.id
    $orgId = $loginResult.organization.id

    # If no org, use a test UUID
    if (!$orgId) {
        $orgId = "00000000-0000-0000-0000-000000000001"
        Write-Host "  SUCCESS: Logged in (using test org ID)" -ForegroundColor Green
    } else {
        Write-Host "  SUCCESS: Logged in" -ForegroundColor Green
    }
    Write-Host "    User ID: $userId" -ForegroundColor Gray
    Write-Host "    Org ID: $orgId" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "    Trying to continue without auth (some endpoints allow it)..." -ForegroundColor Yellow
    $authToken = $null
    Write-Host ""
}

# Test 2: Get Templates
Write-Host "[2/5] Fetching templates..." -ForegroundColor Yellow
try {
    $templatesResponse = Invoke-WebRequest -Uri "$baseUrl/api/templates" -Method GET -UseBasicParsing
    $templates = ($templatesResponse.Content | ConvertFrom-Json).templates

    Write-Host "  SUCCESS: Found $($templates.Count) templates" -ForegroundColor Green

    # Find taxi template
    $template = $templates | Where-Object { $_.vertical -eq "taxi" } | Select-Object -First 1
    if (!$template) {
        $template = $templates[0]
    }

    Write-Host "    Selected: $($template.name)" -ForegroundColor Gray
    Write-Host "    Template ID: $($template.id)" -ForegroundColor Gray
    Write-Host "    Vertical: $($template.vertical)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

if (!$authToken) {
    Write-Host "Cannot continue without authentication. Exiting..." -ForegroundColor Red
    exit 1
}

# Test 3: Get or Create WhatsApp Account
Write-Host "[3/5] Setting up WhatsApp account..." -ForegroundColor Yellow
# For now, use a test UUID since WhatsApp accounts endpoint is not fully implemented
$whatsappId = "00000000-0000-0000-0000-000000000002"
Write-Host "  Using test WhatsApp Account ID: $whatsappId" -ForegroundColor Yellow
Write-Host "  (WhatsApp accounts API not fully implemented yet)" -ForegroundColor Gray
Write-Host ""

# Test 4: Create Bot from Template
Write-Host "[4/5] Creating bot from template..." -ForegroundColor Yellow

# Build field_values based on template's required fields
$fieldValues = @{
    business_name = "Test Taxi Service"
    booking_phone = "+27 21 555 1234"
    service_area = "Cape Town, Western Cape"
    pricing_model = "Per kilometer"
    vehicle_types = @("Sedan (4 seater)", "SUV (6 seater)")
    operating_hours = "24/7"
    base_rate = 50
    per_km_rate = 12
}

$botData = @{
    template_id = $template.id
    organization_id = $orgId
    whatsapp_account_id = $whatsappId
    bot_name = "Test Bot - $(Get-Date -Format 'HH:mm:ss')"
    field_values = $fieldValues
} | ConvertTo-Json -Depth 10

try {
    $botResponse = Invoke-WebRequest -Uri "$baseUrl/api/bots/create-from-template" `
        -Method POST `
        -ContentType "application/json" `
        -Body $botData `
        -Headers @{ "Authorization" = "Bearer $authToken" } `
        -UseBasicParsing

    $botResult = $botResponse.Content | ConvertFrom-Json
    $botId = $botResult.bot.id

    Write-Host "  SUCCESS: Bot created!" -ForegroundColor Green
    Write-Host "    Bot ID: $botId" -ForegroundColor Gray
    Write-Host "    Name: $($botResult.bot.name)" -ForegroundColor Gray
    Write-Host "    Template: $($botResult.template.name)" -ForegroundColor Gray
    Write-Host "    Status: $($botResult.bot.status)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "    Details: $errorBody" -ForegroundColor Red
    }
    exit 1
}

# Test 5: Get Marketplace and Enable Integration
Write-Host "[5/5] Testing marketplace integration..." -ForegroundColor Yellow
try {
    $marketplaceResponse = Invoke-WebRequest -Uri "$baseUrl/api/marketplace" -Method GET -UseBasicParsing
    $integrations = ($marketplaceResponse.Content | ConvertFrom-Json).integrations

    Write-Host "  SUCCESS: Found $($integrations.Count) integrations" -ForegroundColor Green

    # Pick first integration
    $integration = $integrations[0]
    Write-Host "    Testing with: $($integration.name) ($($integration.slug))" -ForegroundColor Gray

    # Try to enable it
    $enableData = @{
        bot_id = $botId
    } | ConvertTo-Json

    $enableResponse = Invoke-WebRequest -Uri "$baseUrl/api/marketplace/$($integration.slug)/enable" `
        -Method POST `
        -ContentType "application/json" `
        -Body $enableData `
        -Headers @{ "Authorization" = "Bearer $authToken" } `
        -UseBasicParsing

    Write-Host "  SUCCESS: Integration enabled!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "    Details: $errorBody" -ForegroundColor Red
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTING COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  Bot ID: $botId" -ForegroundColor Gray
Write-Host "  Template Used: $($template.name)" -ForegroundColor Gray
Write-Host ""
