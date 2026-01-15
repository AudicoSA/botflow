# Test Knowledge Base Search Endpoint
# This script tests the semantic search functionality

$EMAIL = "kenny@audico.co.za"
$PASSWORD = "Apwd4me-1"
$BACKEND_URL = "http://localhost:3002"
$BOT_ID = "8982d756-3cd0-4e2b-bf20-396e919cb354"

Write-Host "=== Knowledge Base Search Test ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login
Write-Host "Step 1: Logging in..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body (@{email=$EMAIL; password=$PASSWORD} | ConvertTo-Json)

    $TOKEN = $loginResponse.token
    Write-Host "✓ Login successful" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Test different queries
$testQueries = @(
    "How do I reset my password?",
    "What are the pricing plans?",
    "How do I contact support?",
    "What features are included?"
)

foreach ($query in $testQueries) {
    Write-Host "Query: '$query'" -ForegroundColor Cyan
    Write-Host "Searching..." -ForegroundColor Yellow

    try {
        $searchBody = @{
            query = $query
            limit = 3
            threshold = 0.7
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge/search" `
            -Method POST `
            -Headers @{
                Authorization="Bearer $TOKEN"
                "Content-Type"="application/json"
            } `
            -Body $searchBody

        Write-Host "✓ Found $($response.count) results" -ForegroundColor Green
        Write-Host ""

        if ($response.count -gt 0) {
            $response.results | ForEach-Object {
                Write-Host "  Similarity: $([math]::Round($_.similarity, 4))" -ForegroundColor Yellow
                Write-Host "  Content: $($_.content.Substring(0, [Math]::Min(150, $_.content.Length)))..." -ForegroundColor White
                Write-Host "  Source: $($_.source_title)" -ForegroundColor Gray
                Write-Host ""
            }
        } else {
            Write-Host "  No relevant content found (threshold: 0.7)" -ForegroundColor Gray
            Write-Host ""
        }
    } catch {
        Write-Host "✗ Search failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }

    Write-Host "---" -ForegroundColor DarkGray
    Write-Host ""
}

# Step 3: Test with different thresholds
Write-Host "Testing threshold sensitivity..." -ForegroundColor Cyan
$testQuery = "pricing"
$thresholds = @(0.5, 0.6, 0.7, 0.8, 0.9)

foreach ($threshold in $thresholds) {
    try {
        $searchBody = @{
            query = $testQuery
            limit = 5
            threshold = $threshold
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge/search" `
            -Method POST `
            -Headers @{
                Authorization="Bearer $TOKEN"
                "Content-Type"="application/json"
            } `
            -Body $searchBody

        Write-Host "  Threshold $threshold : $($response.count) results" -ForegroundColor Yellow
    } catch {
        Write-Host "  Threshold $threshold : Error" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Adjust threshold based on results quality"
Write-Host "2. Test with WhatsApp messages"
Write-Host "3. Monitor performance with more documents"
