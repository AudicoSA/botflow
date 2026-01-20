# Week 12 - Complete API Testing Script
# Tests: Auth, Templates, Bot Creation, Integration Enable/Disable

$baseUrl = "http://localhost:3001"
$testEmail = "test-$(Get-Date -Format 'yyyyMMdd-HHmmss')@test.com"
$testPassword = "TestPass123!"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Week 12 - API Testing Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Signup and Get Auth Token
Write-Host "[1/6] Testing Signup..." -ForegroundColor Yellow
$signupData = @{
    email = $testEmail
    password = $testPassword
    fullName = "Test User"
    organizationName = "Test Org $(Get-Date -Format 'HHmmss')"
} | ConvertTo-Json

try {
    $signupResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/signup" `
        -Method POST `
        -ContentType "application/json" `
        -Body $signupData `
        -UseBasicParsing

    $signupResult = $signupResponse.Content | ConvertFrom-Json
    $authToken = $signupResult.token
    $userId = $signupResult.user.id
    $orgId = $signupResult.organization.id

    Write-Host "  SUCCESS: User created" -ForegroundColor Green
    Write-Host "    Email: $testEmail" -ForegroundColor Gray
    Write-Host "    User ID: $userId" -ForegroundColor Gray
    Write-Host "    Org ID: $orgId" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "    Error details: $errorBody" -ForegroundColor Red
    }
    exit 1
}

# Test 2: Get Templates
Write-Host "[2/6] Testing Templates API..." -ForegroundColor Yellow
try {
    $templatesResponse = Invoke-WebRequest -Uri "$baseUrl/api/templates" -Method GET -UseBasicParsing
    $templates = ($templatesResponse.Content | ConvertFrom-Json).templates

    Write-Host "  SUCCESS: Found $($templates.Count) templates" -ForegroundColor Green
    $taxiTemplate = $templates | Where-Object { $_.vertical -eq "taxi" } | Select-Object -First 1

    if ($taxiTemplate) {
        Write-Host "    Using: $($taxiTemplate.name) (ID: $($taxiTemplate.id))" -ForegroundColor Gray
    } else {
        Write-Host "    Using: $($templates[0].name) (ID: $($templates[0].id))" -ForegroundColor Gray
        $taxiTemplate = $templates[0]
    }
    Write-Host ""
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 3: Create WhatsApp Account (required for bot creation)
Write-Host "[3/6] Creating WhatsApp Account..." -ForegroundColor Yellow
$whatsappData = @{
    phone_number = "+27821234567"
    display_name = "Test WhatsApp"
    provider = "bird"
} | ConvertTo-Json

try {
    $whatsappResponse = Invoke-WebRequest -Uri "$baseUrl/api/whatsapp" `
        -Method POST `
        -ContentType "application/json" `
        -Body $whatsappData `
        -Headers @{ "Authorization" = "Bearer $authToken" } `
        -UseBasicParsing

    $whatsappAccount = ($whatsappResponse.Content | ConvertFrom-Json).whatsappAccount
    $whatsappId = $whatsappAccount.id

    Write-Host "  SUCCESS: WhatsApp account created" -ForegroundColor Green
    Write-Host "    Account ID: $whatsappId" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red

    # Try to get existing WhatsApp account
    try {
        $existingResponse = Invoke-WebRequest -Uri "$baseUrl/api/whatsapp" `
            -Method GET `
            -Headers @{ "Authorization" = "Bearer $authToken" } `
            -UseBasicParsing

        $accounts = ($existingResponse.Content | ConvertFrom-Json).accounts
        if ($accounts.Count -gt 0) {
            $whatsappId = $accounts[0].id
            Write-Host "  Using existing account: $whatsappId" -ForegroundColor Yellow
            Write-Host ""
        } else {
            Write-Host "  No WhatsApp accounts available" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "  Cannot proceed without WhatsApp account" -ForegroundColor Red
        exit 1
    }
}

# Test 4: Create Bot from Template
Write-Host "[4/6] Creating Bot from Template..." -ForegroundColor Yellow

$botData = @{
    template_id = $taxiTemplate.id
    organization_id = $orgId
    whatsapp_account_id = $whatsappId
    bot_name = "Test Bot $(Get-Date -Format 'HHmmss')"
    field_values = @{
        business_name = "Test Business"
        business_phone = "+27 21 555 1234"
        business_email = "test@business.co.za"
        service_area = "Cape Town"
        operating_hours = "Mon-Fri: 9am-5pm"
    }
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

    Write-Host "  SUCCESS: Bot created" -ForegroundColor Green
    Write-Host "    Bot ID: $botId" -ForegroundColor Gray
    Write-Host "    Bot Name: $($botResult.bot.name)" -ForegroundColor Gray
    Write-Host "    Template: $($botResult.template.name)" -ForegroundColor Gray
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

# Test 5: Get Marketplace Integrations
Write-Host "[5/6] Testing Marketplace API..." -ForegroundColor Yellow
try {
    $marketplaceResponse = Invoke-WebRequest -Uri "$baseUrl/api/marketplace" -Method GET -UseBasicParsing
    $integrations = ($marketplaceResponse.Content | ConvertFrom-Json).integrations

    Write-Host "  SUCCESS: Found $($integrations.Count) integrations" -ForegroundColor Green
    $testIntegration = $integrations | Where-Object { $_.category -eq "calendar" } | Select-Object -First 1

    if (!$testIntegration) {
        $testIntegration = $integrations[0]
    }

    Write-Host "    Test integration: $($testIntegration.name) ($($testIntegration.slug))" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 6: Enable Integration
Write-Host "[6/6] Testing Integration Enable..." -ForegroundColor Yellow
$integrationData = @{
    bot_id = $botId
} | ConvertTo-Json

try {
    $enableResponse = Invoke-WebRequest -Uri "$baseUrl/api/marketplace/$($testIntegration.slug)/enable" `
        -Method POST `
        -ContentType "application/json" `
        -Body $integrationData `
        -Headers @{ "Authorization" = "Bearer $authToken" } `
        -UseBasicParsing

    $enableResult = $enableResponse.Content | ConvertFrom-Json

    Write-Host "  SUCCESS: Integration enabled" -ForegroundColor Green
    Write-Host "    Integration: $($testIntegration.name)" -ForegroundColor Gray
    Write-Host "    Bot: $botId" -ForegroundColor Gray
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
Write-Host "TESTING COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "  Email: $testEmail" -ForegroundColor Gray
Write-Host "  Password: $testPassword" -ForegroundColor Gray
Write-Host "  User ID: $userId" -ForegroundColor Gray
Write-Host "  Org ID: $orgId" -ForegroundColor Gray
Write-Host "  Bot ID: $botId" -ForegroundColor Gray
Write-Host ""
