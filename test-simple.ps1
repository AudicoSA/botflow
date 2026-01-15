# Simple Knowledge Base API Test
Write-Host "Testing Knowledge Base API..." -ForegroundColor Cyan
Write-Host ""

# Configuration
$BACKEND_URL = "http://localhost:3002"
$TEST_EMAIL = "test@example.com"
$TEST_PASSWORD = "password123"

# Step 1: Test health endpoint
Write-Host "Step 1: Testing health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$BACKEND_URL/health" -Method GET
    Write-Host "Success! Backend is healthy" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Error: Backend is not reachable" -ForegroundColor Red
    Write-Host "Make sure backend is running: npm run dev" -ForegroundColor Yellow
    exit 1
}

# Step 2: Login
Write-Host "Step 2: Logging in..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $TEST_EMAIL
        password = $TEST_PASSWORD
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody

    $TOKEN = $loginResponse.token
    Write-Host "Success! Logged in" -ForegroundColor Green
    Write-Host "Token: $($TOKEN.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "Error: Login failed" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "You may need to create a test user first" -ForegroundColor Yellow
    exit 1
}

# Step 3: Test knowledge endpoint (requires a bot ID)
Write-Host "Step 3: API is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Get a bot ID from your database or dashboard" -ForegroundColor White
Write-Host "2. Create a knowledge article:" -ForegroundColor White
Write-Host "   Invoke-RestMethod -Uri '$BACKEND_URL/api/bots/YOUR_BOT_ID/knowledge' ``" -ForegroundColor Gray
Write-Host "     -Method POST ``" -ForegroundColor Gray
Write-Host "     -Headers @{Authorization='Bearer $TOKEN'} ``" -ForegroundColor Gray
Write-Host "     -ContentType 'application/json' ``" -ForegroundColor Gray
Write-Host "     -Body '{`"title`":`"Test Doc`",`"file_name`":`"test.pdf`",`"file_size`":1000}'" -ForegroundColor Gray
Write-Host ""
Write-Host "Test completed successfully!" -ForegroundColor Green
