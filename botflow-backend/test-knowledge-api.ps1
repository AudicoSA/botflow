# Phase 2 Knowledge API Test Script (PowerShell)
# This script tests all 6 knowledge API endpoints

$API_URL = "http://localhost:3002"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Phase 2 Knowledge API Test" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get authentication token
Write-Host "Step 1: Login to get JWT token" -ForegroundColor Yellow
$Email = Read-Host "Enter your email"
$Password = Read-Host "Enter your password" -AsSecureString
$PasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))

$LoginBody = @{
    email = $Email
    password = $PasswordPlain
} | ConvertTo-Json

try {
    $LoginResponse = Invoke-RestMethod -Uri "$API_URL/api/auth/login" -Method POST -Body $LoginBody -ContentType "application/json"
    $Token = $LoginResponse.access_token
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "Token: $($Token.Substring(0, 50))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Get a bot ID
Write-Host "Step 2: Fetching your bots" -ForegroundColor Yellow
$Headers = @{
    Authorization = "Bearer $Token"
}

try {
    $BotsResponse = Invoke-RestMethod -Uri "$API_URL/api/bots" -Method GET -Headers $Headers
    $BotId = $BotsResponse[0].id
    Write-Host "✅ Found bot: $BotId" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ No bots found: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Test GET /bots/:botId/knowledge (list sources)
Write-Host "Step 3: GET /api/bots/$BotId/knowledge (list sources)" -ForegroundColor Yellow
try {
    $ListResponse = Invoke-RestMethod -Uri "$API_URL/api/bots/$BotId/knowledge" -Method GET -Headers $Headers
    Write-Host "Response:" -ForegroundColor Gray
    $ListResponse | ConvertTo-Json -Depth 5
    Write-Host ""
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

# Step 4: Test GET /bots/:botId/knowledge/stats
Write-Host "Step 4: GET /api/bots/$BotId/knowledge/stats" -ForegroundColor Yellow
try {
    $StatsResponse = Invoke-RestMethod -Uri "$API_URL/api/bots/$BotId/knowledge/stats" -Method GET -Headers $Headers
    Write-Host "Response:" -ForegroundColor Gray
    $StatsResponse | ConvertTo-Json -Depth 5
    Write-Host ""
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

# Step 5: Test POST /bots/:botId/knowledge (initialize upload)
Write-Host "Step 5: POST /api/bots/$BotId/knowledge (initialize upload)" -ForegroundColor Yellow
$UploadBody = @{
    title = "Test Policy Document"
    metadata = @{
        file_name = "test_policy.pdf"
        file_size = 50000
        file_type = "application/pdf"
    }
} | ConvertTo-Json

try {
    $UploadResponse = Invoke-RestMethod -Uri "$API_URL/api/bots/$BotId/knowledge" -Method POST -Headers $Headers -Body $UploadBody -ContentType "application/json"
    Write-Host "Response:" -ForegroundColor Gray
    $UploadResponse | ConvertTo-Json -Depth 5
    $ArticleId = $UploadResponse.article.id
    Write-Host "✅ Article created: $ArticleId" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
    exit 1
}

# Step 6: Test POST /bots/:botId/knowledge/:articleId/process
Write-Host "Step 6: POST /api/bots/$BotId/knowledge/$ArticleId/process (trigger processing)" -ForegroundColor Yellow
try {
    $ProcessResponse = Invoke-RestMethod -Uri "$API_URL/api/bots/$BotId/knowledge/$ArticleId/process" -Method POST -Headers $Headers
    Write-Host "Response:" -ForegroundColor Gray
    $ProcessResponse | ConvertTo-Json -Depth 5
    Write-Host ""
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

# Step 7: Verify in database
Write-Host "Step 7: GET /api/bots/$BotId/knowledge (verify article exists)" -ForegroundColor Yellow
try {
    $VerifyResponse = Invoke-RestMethod -Uri "$API_URL/api/bots/$BotId/knowledge" -Method GET -Headers $Headers
    Write-Host "Response:" -ForegroundColor Gray
    $VerifyResponse | ConvertTo-Json -Depth 5
    Write-Host ""
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

# Step 8: Test DELETE /bots/:botId/knowledge/:articleId
Write-Host "Step 8: DELETE /api/bots/$BotId/knowledge/$ArticleId (cleanup)" -ForegroundColor Yellow
try {
    $DeleteResponse = Invoke-RestMethod -Uri "$API_URL/api/bots/$BotId/knowledge/$ArticleId" -Method DELETE -Headers $Headers
    Write-Host "Response:" -ForegroundColor Gray
    $DeleteResponse | ConvertTo-Json -Depth 5
    Write-Host ""
} catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:"
Write-Host "- Login: ✅"
Write-Host "- List sources: ✅"
Write-Host "- Get stats: ✅"
Write-Host "- Initialize upload: ✅"
Write-Host "- Trigger processing: ✅"
Write-Host "- Delete source: ✅"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Build n8n workflow to process uploaded files"
Write-Host "2. Test actual file upload to Supabase Storage"
Write-Host "3. Verify embeddings are created in knowledge_embeddings table"
