# Quick Knowledge API Test

# Step 1: Login
$loginBody = @{
    email = "kenny@audico.co.za"
    password = "Apwd4me-1"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/auth/login" `
    -Method POST `
    -Body $loginBody `
    -ContentType "application/json"

$token = $loginResponse.token
$botId = "8982d756-3cd0-4e2b-bf20-396e919cb354"

Write-Host "Login successful! Token: $($token.Substring(0,50))..." -ForegroundColor Green
Write-Host ""

# Step 2: Test GET /knowledge/stats
Write-Host "Testing GET /api/bots/$botId/knowledge/stats" -ForegroundColor Yellow

try {
    $stats = Invoke-RestMethod -Uri "http://localhost:3002/api/bots/$botId/knowledge/stats" `
        -Method GET `
        -Headers @{Authorization="Bearer $token"}

    Write-Host "✅ Stats endpoint works!" -ForegroundColor Green
    $stats | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Stats failed: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode.value__
}

Write-Host ""

# Step 3: Test POST /knowledge (create article)
Write-Host "Testing POST /api/bots/$botId/knowledge" -ForegroundColor Yellow

$uploadBody = @{
    file_name = "test_policy.pdf"
    file_size = 50000
    file_type = "application/pdf"
} | ConvertTo-Json

try {
    $upload = Invoke-RestMethod -Uri "http://localhost:3002/api/bots/$botId/knowledge" `
        -Method POST `
        -Headers @{Authorization="Bearer $token"} `
        -Body $uploadBody `
        -ContentType "application/json"

    Write-Host "✅ Upload initialization works!" -ForegroundColor Green
    $articleId = $upload.article.id
    Write-Host "Article ID: $articleId"
    $upload | ConvertTo-Json -Depth 5

    # Step 4: Test GET /knowledge (list)
    Write-Host ""
    Write-Host "Testing GET /api/bots/$botId/knowledge" -ForegroundColor Yellow

    $list = Invoke-RestMethod -Uri "http://localhost:3002/api/bots/$botId/knowledge" `
        -Method GET `
        -Headers @{Authorization="Bearer $token"}

    Write-Host "✅ List endpoint works!" -ForegroundColor Green
    Write-Host "Found $($list.articles.Count) article(s)"

    # Step 5: Test DELETE /knowledge/:articleId
    Write-Host ""
    Write-Host "Testing DELETE /api/bots/$botId/knowledge/$articleId" -ForegroundColor Yellow

    $delete = Invoke-RestMethod -Uri "http://localhost:3002/api/bots/$botId/knowledge/$articleId" `
        -Method DELETE `
        -Headers @{Authorization="Bearer $token"}

    Write-Host "✅ Delete endpoint works!" -ForegroundColor Green
    $delete | ConvertTo-Json -Depth 5

} catch {
    Write-Host "❌ Upload failed: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode.value__
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Testing complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
