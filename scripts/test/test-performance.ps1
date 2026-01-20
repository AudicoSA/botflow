# Performance Benchmark Test for RAG System

$EMAIL = "kenny@audico.co.za"
$PASSWORD = "Apwd4me-1"
$BACKEND_URL = "http://localhost:3002"
$BOT_ID = "8982d756-3cd0-4e2b-bf20-396e919cb354"

Write-Host "=== RAG System Performance Benchmark ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend: $BACKEND_URL" -ForegroundColor Gray
Write-Host "Bot ID: $BOT_ID" -ForegroundColor Gray
Write-Host ""

# Test 1: Login Performance
Write-Host "Test 1: Authentication" -ForegroundColor Yellow
$loginStart = Get-Date

try {
    $loginResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body (@{email=$EMAIL; password=$PASSWORD} | ConvertTo-Json)

    $loginEnd = Get-Date
    $loginTime = ($loginEnd - $loginStart).TotalMilliseconds
    $TOKEN = $loginResponse.token

    Write-Host "  Login time: ${loginTime}ms" -ForegroundColor $(if ($loginTime -lt 1000) {"Green"} else {"Yellow"})
    Write-Host ""
} catch {
    Write-Host "  ✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Knowledge Base Stats
Write-Host "Test 2: Knowledge Base Status" -ForegroundColor Yellow

try {
    $statsStart = Get-Date
    $statsResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge/stats" `
        -Method GET `
        -Headers @{Authorization="Bearer $TOKEN"}
    $statsEnd = Get-Date
    $statsTime = ($statsEnd - $statsStart).TotalMilliseconds

    Write-Host "  Stats query time: ${statsTime}ms" -ForegroundColor Green
    Write-Host "  Total articles: $($statsResponse.total_articles)" -ForegroundColor White
    Write-Host "  Total chunks: $($statsResponse.total_chunks)" -ForegroundColor White
    Write-Host "  Indexed articles: $($statsResponse.indexed_articles)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "  ✗ Stats query failed" -ForegroundColor Red
    Write-Host ""
}

# Test 3: Search Performance (Multiple Queries)
Write-Host "Test 3: Search Performance (10 queries)" -ForegroundColor Yellow

$queries = @(
    "What are your business hours?",
    "How do I contact support?",
    "What is BotFlow?",
    "Tell me about pricing",
    "How does it work?",
    "What features are included?",
    "Do you offer refunds?",
    "How do I reset my password?",
    "What payment methods do you accept?",
    "Is there a free trial?"
)

$searchTimes = @()
$totalResults = 0

foreach ($query in $queries) {
    $searchStart = Get-Date

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

        $searchEnd = Get-Date
        $searchTime = ($searchEnd - $searchStart).TotalMilliseconds
        $searchTimes += $searchTime
        $totalResults += $response.count

        $color = if ($searchTime -lt 500) {"Green"} elseif ($searchTime -lt 1000) {"Yellow"} else {"Red"}
        Write-Host "  Query ${queries.IndexOf($query) + 1}: ${searchTime}ms (found $($response.count))" -ForegroundColor $color

    } catch {
        Write-Host "  Query ${queries.IndexOf($query) + 1}: FAILED" -ForegroundColor Red
    }
}

Write-Host ""

# Calculate statistics
if ($searchTimes.Count -gt 0) {
    $avgSearchTime = ($searchTimes | Measure-Object -Average).Average
    $minSearchTime = ($searchTimes | Measure-Object -Minimum).Minimum
    $maxSearchTime = ($searchTimes | Measure-Object -Maximum).Maximum
    $medianSearchTime = ($searchTimes | Sort-Object)[[Math]::Floor($searchTimes.Count / 2)]

    Write-Host "Search Statistics:" -ForegroundColor Cyan
    Write-Host "  Average: ${avgSearchTime}ms" -ForegroundColor $(if ($avgSearchTime -lt 500) {"Green"} else {"Yellow"})
    Write-Host "  Median:  ${medianSearchTime}ms" -ForegroundColor White
    Write-Host "  Min:     ${minSearchTime}ms" -ForegroundColor Green
    Write-Host "  Max:     ${maxSearchTime}ms" -ForegroundColor $(if ($maxSearchTime -gt 1000) {"Red"} else {"White"})
    Write-Host "  Total results: $totalResults" -ForegroundColor White
    Write-Host ""
}

# Test 4: Concurrent Search Performance
Write-Host "Test 4: Concurrent Searches (5 simultaneous)" -ForegroundColor Yellow

$concurrentStart = Get-Date
$jobs = @()

for ($i = 1; $i -le 5; $i++) {
    $job = Start-Job -ScriptBlock {
        param($url, $token, $botId, $query)

        $searchBody = @{
            query = $query
            limit = 3
            threshold = 0.7
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$url/api/bots/$botId/knowledge/search" `
            -Method POST `
            -Headers @{
                Authorization="Bearer $token"
                "Content-Type"="application/json"
            } `
            -Body $searchBody

        return $response
    } -ArgumentList $BACKEND_URL, $TOKEN, $BOT_ID, $queries[$i % $queries.Count]

    $jobs += $job
}

# Wait for all jobs
$jobs | Wait-Job | Out-Null
$concurrentEnd = Get-Date
$concurrentTime = ($concurrentEnd - $concurrentStart).TotalMilliseconds

Write-Host "  Concurrent execution time: ${concurrentTime}ms" -ForegroundColor $(if ($concurrentTime -lt 2000) {"Green"} else {"Yellow"})
Write-Host "  Average per query: $([Math]::Round($concurrentTime / 5, 2))ms" -ForegroundColor White

# Clean up jobs
$jobs | Remove-Job

Write-Host ""

# Test 5: List Knowledge Articles Performance
Write-Host "Test 5: List Articles" -ForegroundColor Yellow

try {
    $listStart = Get-Date
    $listResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge" `
        -Method GET `
        -Headers @{Authorization="Bearer $TOKEN"}
    $listEnd = Get-Date
    $listTime = ($listEnd - $listStart).TotalMilliseconds

    Write-Host "  List time: ${listTime}ms" -ForegroundColor $(if ($listTime -lt 500) {"Green"} else {"Yellow"})
    Write-Host "  Articles found: $($listResponse.articles.Count)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "  ✗ List failed" -ForegroundColor Red
    Write-Host ""
}

# Performance Summary
Write-Host "=== Performance Summary ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Component Performance:" -ForegroundColor White
Write-Host "  Authentication:    ${loginTime}ms" -ForegroundColor $(if ($loginTime -lt 1000) {"Green"} else {"Yellow"})
Write-Host "  Stats Query:       ${statsTime}ms" -ForegroundColor $(if ($statsTime -lt 500) {"Green"} else {"Yellow"})
if ($searchTimes.Count -gt 0) {
    Write-Host "  Avg Search:        ${avgSearchTime}ms" -ForegroundColor $(if ($avgSearchTime -lt 500) {"Green"} else {"Yellow"})
    Write-Host "  Max Search:        ${maxSearchTime}ms" -ForegroundColor $(if ($maxSearchTime -lt 1000) {"Green"} else {"Red"})
}
Write-Host "  Concurrent (5x):   ${concurrentTime}ms" -ForegroundColor $(if ($concurrentTime -lt 2000) {"Green"} else {"Yellow"})
Write-Host "  List Articles:     ${listTime}ms" -ForegroundColor $(if ($listTime -lt 500) {"Green"} else {"Yellow"})
Write-Host ""

# Target Comparison
Write-Host "Target Comparison:" -ForegroundColor White
Write-Host "  Target: Login less than 1000ms" -ForegroundColor $(if ($loginTime -lt 1000) {"Green"} else {"Red"})
Write-Host "  Target: Search less than 500ms" -ForegroundColor $(if ($avgSearchTime -lt 500) {"Green"} else {"Red"})
Write-Host "  Target: Stats less than 500ms" -ForegroundColor $(if ($statsTime -lt 500) {"Green"} else {"Red"})
Write-Host ""

# Overall Assessment
$allTargetsMet = ($loginTime -lt 1000) -and ($avgSearchTime -lt 500) -and ($statsTime -lt 500)

if ($allTargetsMet) {
    Write-Host "[PASS] All performance targets met!" -ForegroundColor Green
    Write-Host "  System is ready for production load." -ForegroundColor White
} else {
    Write-Host "[WARN] Some performance targets not met" -ForegroundColor Yellow
    Write-Host "  Consider optimization before production." -ForegroundColor White
}

Write-Host ""
Write-Host "Performance test complete!" -ForegroundColor Cyan
Write-Host "Date: 2025-01-15" -ForegroundColor Gray
