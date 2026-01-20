# Full Knowledge Base Test
Write-Host "Testing Knowledge Base Pipeline..." -ForegroundColor Cyan
Write-Host ""

# Configuration
$EMAIL = "kenny@audico.co.za"
$PASSWORD = "Apwd4me-1"
$BACKEND_URL = "http://localhost:3002"
$BOT_ID = "8982d756-3cd0-4e2b-bf20-396e919cb354"

# Step 1: Login
Write-Host "Step 1: Logging in..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body (@{email=$EMAIL; password=$PASSWORD} | ConvertTo-Json)

    $TOKEN = $loginResponse.token
    Write-Host "Success! Logged in" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "Error: Login failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
    exit 1
}

# Step 2: Create knowledge article
Write-Host "Step 2: Creating knowledge article..." -ForegroundColor Yellow
try {
    $articleBody = @{
        file_name = "test.pdf"
        file_size = 13264
        file_type = "application/pdf"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge" `
        -Method POST `
        -Headers @{Authorization="Bearer $TOKEN"} `
        -ContentType "application/json" `
        -Body $articleBody

    Write-Host "Success! Article created" -ForegroundColor Green
    Write-Host ""
    Write-Host "Article ID: $($response.article.id)" -ForegroundColor Yellow
    Write-Host "Status: $($response.article.metadata.status)" -ForegroundColor White
    Write-Host "File URL: $($response.article.file_url)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Upload URL (first 100 chars):" -ForegroundColor Gray
    Write-Host $response.upload_url.Substring(0, 100) -ForegroundColor Gray
    Write-Host ""

    # Save for next steps
    $response.article.id | Out-File -FilePath "article-id.txt"
    $response.upload_url | Out-File -FilePath "upload-url.txt"

} catch {
    Write-Host "Error: Failed to create article" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
    }
    exit 1
}

# Step 3: Next steps
Write-Host "Step 3: What to do next:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option A: Upload a real PDF" -ForegroundColor White
Write-Host "  `$uploadUrl = Get-Content upload-url.txt" -ForegroundColor Gray
Write-Host "  Invoke-RestMethod -Uri `$uploadUrl -Method PUT -ContentType 'application/pdf' -InFile 'path\to\file.pdf'" -ForegroundColor Gray
Write-Host ""
Write-Host "Option B: Trigger processing (will fail without real PDF)" -ForegroundColor White
Write-Host "  `$articleId = Get-Content article-id.txt" -ForegroundColor Gray
Write-Host "  Invoke-RestMethod -Uri '$BACKEND_URL/api/bots/$BOT_ID/knowledge/`$articleId/process' ``" -ForegroundColor Gray
Write-Host "    -Method POST ``" -ForegroundColor Gray
Write-Host "    -Headers @{Authorization='Bearer $TOKEN'}" -ForegroundColor Gray
Write-Host ""
Write-Host "Test completed successfully!" -ForegroundColor Green
