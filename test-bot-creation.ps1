# Week 12 - Test Bot Creation API
# This script tests the /api/bots/create-from-template endpoint

$baseUrl = "http://localhost:3001"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Bot Creation from Template" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get templates
Write-Host "Step 1: Fetching templates..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/templates" -Method GET -UseBasicParsing
    $templates = ($response.Content | ConvertFrom-Json).templates
    Write-Host "✓ Found $($templates.Count) templates" -ForegroundColor Green

    # Get first template
    $template = $templates[0]
    Write-Host "  Using template: $($template.name) (ID: $($template.id))" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ Failed to fetch templates: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Login/Get Auth Token (for now, we'll test without auth since it's disabled)
Write-Host "Step 2: Authentication..." -ForegroundColor Yellow
Write-Host "  Note: Auth is currently disabled for testing" -ForegroundColor Gray
Write-Host ""

# Step 3: Create bot from template
Write-Host "Step 3: Creating bot from template..." -ForegroundColor Yellow

# Prepare test data based on taxi template
$testData = @{
    template_id = $template.id
    organization_id = "00000000-0000-0000-0000-000000000000"  # Test org
    whatsapp_account_id = "00000000-0000-0000-0000-000000000000"  # Test account
    bot_name = "Test Taxi Bot $(Get-Date -Format 'HHmmss')"
    field_values = @{
        business_name = "Cape Town Cabs"
        business_phone = "+27 21 555 1234"
        business_email = "info@capetowncabs.co.za"
        service_area = "Cape Town, Western Cape"
        operating_hours = "Mon-Fri: 6am-10pm, Sat-Sun: 7am-9pm"
        fleet_size = "15"
        vehicle_types = @("Sedan", "SUV", "Minivan")
        payment_methods = @("Cash", "Card", "EFT")
        booking_lead_time = "30 minutes"
        emergency_contact = "+27 82 555 9999"
    }
}

$jsonBody = $testData | ConvertTo-Json -Depth 10

try {
    # Note: The endpoint requires authentication, but it's currently disabled in dev mode
    $response = Invoke-WebRequest -Uri "$baseUrl/api/bots/create-from-template" `
        -Method POST `
        -ContentType "application/json" `
        -Body $jsonBody `
        -UseBasicParsing

    $result = $response.Content | ConvertFrom-Json

    if ($result.success) {
        Write-Host "✓ Bot created successfully!" -ForegroundColor Green
        Write-Host "  Bot ID: $($result.bot.id)" -ForegroundColor Gray
        Write-Host "  Bot Name: $($result.bot.name)" -ForegroundColor Gray
        Write-Host "  Template: $($result.template.name)" -ForegroundColor Gray
        Write-Host ""

        # Step 4: Verify bot was created
        Write-Host "Step 4: Verifying bot exists..." -ForegroundColor Yellow
        try {
            $verifyResponse = Invoke-WebRequest -Uri "$baseUrl/api/bots/$($result.bot.id)" -Method GET -UseBasicParsing
            $bot = ($verifyResponse.Content | ConvertFrom-Json).bot

            Write-Host "✓ Bot verified in database" -ForegroundColor Green
            Write-Host "  Status: $($bot.status)" -ForegroundColor Gray
            Write-Host "  AI Model: $($bot.ai_model)" -ForegroundColor Gray
            Write-Host ""

            Write-Host "========================================" -ForegroundColor Cyan
            Write-Host "✓ ALL TESTS PASSED" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Cyan
        } catch {
            Write-Host "✗ Failed to verify bot: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Bot creation failed" -ForegroundColor Red
        Write-Host $response.Content
    }
} catch {
    Write-Host "✗ Failed to create bot: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
    exit 1
}
