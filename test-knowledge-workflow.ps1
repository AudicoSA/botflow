# Test Knowledge Base Workflow - PowerShell Script
# This script tests the complete knowledge base pipeline

Write-Host "🧪 Testing Knowledge Base Workflow" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BACKEND_URL = "http://localhost:3002"
$TEST_EMAIL = "test@example.com"
$TEST_PASSWORD = "password123"
$BOT_ID = "your-bot-id-here"  # Replace with actual bot ID

# Step 1: Login
Write-Host "Step 1: Logging in..." -ForegroundColor Yellow
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
    Write-Host "✅ Login successful! Token: $($TOKEN.Substring(0, 20))..." -ForegroundColor Green
}
catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. Backend is running (npm run dev)" -ForegroundColor Yellow
    Write-Host "  2. You have a test user account" -ForegroundColor Yellow
    Write-Host "  3. Backend URL is correct: $BACKEND_URL" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 2: Check knowledge base stats
Write-Host "Step 2: Checking knowledge base stats..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
    }

    $statsResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge/stats" `
        -Method GET `
        -Headers $headers

    Write-Host "✅ Stats retrieved!" -ForegroundColor Green
    Write-Host "   Total articles: $($statsResponse.total_articles)" -ForegroundColor White
    Write-Host "   Total chunks: $($statsResponse.total_chunks)" -ForegroundColor White
    Write-Host "   Total size: $($statsResponse.total_size) bytes" -ForegroundColor White
}
catch {
    Write-Host "⚠️  Stats check failed (this is OK if bot doesn't exist yet)" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""

# Step 3: List existing knowledge articles
Write-Host "Step 3: Listing knowledge articles..." -ForegroundColor Yellow
try {
    $listResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge" `
        -Method GET `
        -Headers $headers

    Write-Host "✅ Found $($listResponse.articles.Count) articles" -ForegroundColor Green

    if ($listResponse.articles.Count -gt 0) {
        Write-Host "   Recent articles:" -ForegroundColor White
        $listResponse.articles | Select-Object -First 3 | ForEach-Object {
            $status = $_.metadata.status
            $statusIcon = if ($status -eq "indexed") { "✅" } elseif ($status -eq "processing") { "⏳" } else { "❓" }
            Write-Host "   $statusIcon $($_.title) - Status: $status" -ForegroundColor Gray
        }
    }
}
catch {
    Write-Host "⚠️  List check failed" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host ""

# Step 4: Create a new knowledge article
Write-Host "Step 4: Creating new knowledge article..." -ForegroundColor Yellow
try {
    $createBody = @{
        title = "Test Document $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        file_name = "test-document.pdf"
        file_size = 13264
    } | ConvertTo-Json

    $createResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge" `
        -Method POST `
        -Headers $headers `
        -ContentType "application/json" `
        -Body $createBody

    $ARTICLE_ID = $createResponse.article.id
    $UPLOAD_URL = $createResponse.upload_url

    Write-Host "✅ Article created!" -ForegroundColor Green
    Write-Host "   Article ID: $ARTICLE_ID" -ForegroundColor White
    Write-Host "   Upload URL: $($UPLOAD_URL.Substring(0, 60))..." -ForegroundColor Gray
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Upload a PDF to the signed URL" -ForegroundColor White
    Write-Host "   2. Trigger processing: POST $BACKEND_URL/api/bots/$BOT_ID/knowledge/$ARTICLE_ID/process" -ForegroundColor White
    Write-Host "   3. Check status: GET $BACKEND_URL/api/bots/$BOT_ID/knowledge" -ForegroundColor White
}
catch {
    Write-Host "❌ Article creation failed: $($_.Exception.Message)" -ForegroundColor Red

    # Try to get more error details
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Test completed!" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test the full n8n workflow:" -ForegroundColor Yellow
Write-Host "1. Import workflow into n8n (see N8N_IMPORT_GUIDE.md)" -ForegroundColor White
Write-Host "2. Configure environment variables in n8n" -ForegroundColor White
Write-Host "3. Activate the workflow" -ForegroundColor White
Write-Host "4. Upload a PDF file to the signed URL" -ForegroundColor White
Write-Host "5. Trigger processing via API" -ForegroundColor White
Write-Host "6. Check execution in n8n dashboard" -ForegroundColor White
Write-Host ""
