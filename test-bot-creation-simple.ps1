# Week 12 - Test Bot Creation API (Simplified)
$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3001"

Write-Host "========================================"
Write-Host "Testing Bot Creation from Template"
Write-Host "========================================"
Write-Host ""

# Step 1: Get templates
Write-Host "Step 1: Fetching templates..."
$response = Invoke-WebRequest -Uri "$baseUrl/api/templates" -Method GET -UseBasicParsing
$templates = ($response.Content | ConvertFrom-Json).templates
Write-Host "SUCCESS: Found $($templates.Count) templates"

# Get first template (taxi)
$template = $templates[0]
Write-Host "Using template: $($template.name) (ID: $($template.id))"
Write-Host ""

# Step 2: Create bot from template
Write-Host "Step 2: Creating bot from template..."

# Prepare test data
$testData = @{
    template_id = $template.id
    organization_id = "00000000-0000-0000-0000-000000000000"
    whatsapp_account_id = "00000000-0000-0000-0000-000000000000"
    bot_name = "Test Taxi Bot $(Get-Date -Format 'HHmmss')"
    field_values = @{
        business_name = "Cape Town Cabs"
        business_phone = "+27 21 555 1234"
        business_email = "info@capetowncabs.co.za"
        service_area = "Cape Town, Western Cape"
        operating_hours = "Mon-Fri: 6am-10pm"
        fleet_size = "15"
        vehicle_types = @("Sedan", "SUV")
        payment_methods = @("Cash", "Card")
        booking_lead_time = "30 minutes"
        emergency_contact = "+27 82 555 9999"
    }
}

$jsonBody = $testData | ConvertTo-Json -Depth 10

try {
    $response2 = Invoke-WebRequest -Uri "$baseUrl/api/bots/create-from-template" `
        -Method POST `
        -ContentType "application/json" `
        -Body $jsonBody `
        -UseBasicParsing `
        -Headers @{
            "Authorization" = "Bearer fake-token-for-testing"
        }

    $result = $response2.Content | ConvertFrom-Json

    Write-Host "SUCCESS: Bot created!"
    Write-Host "  Bot ID: $($result.bot.id)"
    Write-Host "  Bot Name: $($result.bot.name)"
    Write-Host ""

    # Step 3: Verify bot exists
    Write-Host "Step 3: Verifying bot..."
    $response3 = Invoke-WebRequest -Uri "$baseUrl/api/bots/$($result.bot.id)" -Method GET -UseBasicParsing
    $bot = ($response3.Content | ConvertFrom-Json).bot

    Write-Host "SUCCESS: Bot verified!"
    Write-Host "  Status: $($bot.status)"
    Write-Host "  AI Model: $($bot.ai_model)"
    Write-Host ""
    Write-Host "========================================"
    Write-Host "ALL TESTS PASSED!"
    Write-Host "========================================"

} catch {
    Write-Host "FAILED: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody"
    }
}
