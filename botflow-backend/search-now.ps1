# Quick Knowledge Search Test
# Tests vector similarity search with OpenAI embeddings

$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:3002"
$botId = "8982d756-3cd0-4e2b-bf20-396e919cb354"

Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host "  BotFlow Knowledge Search Test" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Step 1: Login
Write-Host "`n[1/3] Logging in..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"email":"kenny@audico.co.za","password":"Apwd4me-1"}'

    $token = $loginResponse.token
    Write-Host "      ✅ Login successful" -ForegroundColor Green
} catch {
    Write-Host "      ❌ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Check knowledge base stats
Write-Host "`n[2/3] Checking knowledge base..." -ForegroundColor Yellow
try {
    $statsResponse = Invoke-RestMethod -Uri "$baseUrl/api/bots/$botId/knowledge/stats" `
        -Method GET `
        -Headers @{Authorization="Bearer $token"}

    if ($statsResponse.stats) {
        Write-Host "      Total articles: $($statsResponse.stats.total_articles)" -ForegroundColor Cyan
        Write-Host "      Total embeddings: $($statsResponse.stats.total_embeddings)" -ForegroundColor Cyan

        if ($statsResponse.stats.total_embeddings -eq 0) {
            Write-Host "`n      ⚠️  No embeddings found in knowledge base" -ForegroundColor Yellow
            Write-Host "      Run .\test-now.ps1 first to upload and process a PDF" -ForegroundColor Gray
            exit 1
        }
    }
} catch {
    Write-Host "      ⚠️  Could not fetch stats: $_" -ForegroundColor Yellow
    Write-Host "      Continuing anyway..." -ForegroundColor Gray
}

# Step 3: Perform searches
Write-Host "`n[3/3] Searching knowledge base..." -ForegroundColor Yellow

$queries = @(
    "What is this document about?",
    "What is the main topic?",
    "Give me a summary"
)

foreach ($query in $queries) {
    Write-Host "`n  Query: ""$query""" -ForegroundColor Cyan

    try {
        $searchResponse = Invoke-RestMethod -Uri "$baseUrl/api/bots/$botId/knowledge/search" `
            -Method POST `
            -Headers @{Authorization="Bearer $token"} `
            -ContentType "application/json" `
            -Body (@{
                query = $query
                limit = 3
                threshold = 0.7
            } | ConvertTo-Json)

        if ($searchResponse.results.Count -gt 0) {
            Write-Host "  ✅ Found $($searchResponse.results.Count) results" -ForegroundColor Green

            $searchResponse.results | ForEach-Object {
                $similarity = [math]::Round($_.similarity, 3)
                $preview = $_.content.Substring(0, [Math]::Min(120, $_.content.Length))

                Write-Host "`n    📄 $($_.source_title)" -ForegroundColor Yellow
                Write-Host "    Similarity: $similarity" -ForegroundColor Cyan
                Write-Host "    Content: $preview..." -ForegroundColor White
            }
        } else {
            Write-Host "  ⚠️  No results found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ❌ Search failed: $_" -ForegroundColor Red
    }
}

Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host "  Search Test Complete" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

Write-Host "`nInterpretation:" -ForegroundColor Yellow
Write-Host "  • Similarity > 0.8 = Highly relevant" -ForegroundColor Green
Write-Host "  • Similarity 0.7-0.8 = Relevant" -ForegroundColor Cyan
Write-Host "  • Similarity 0.6-0.7 = Somewhat relevant" -ForegroundColor Yellow
Write-Host "  • Similarity < 0.6 = Not very relevant" -ForegroundColor Gray

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Try different queries related to your PDF content" -ForegroundColor White
Write-Host "  2. Test WhatsApp RAG integration" -ForegroundColor White
Write-Host "  3. Verify search results are accurate" -ForegroundColor White
