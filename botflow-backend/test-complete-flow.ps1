# Complete Knowledge Base Test - Creates Bot, Uploads PDF, Tests Search
# This test runs the full flow from scratch

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3002"

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  BotFlow Complete Knowledge Base Test" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Step 1: Login
Write-Host "`n[1/7] Logging in..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"email":"dev@botflow.app","password":"dev-password-123"}'

    $token = $loginResponse.token
    $userId = $loginResponse.user.id
    Write-Host "      ✅ Login successful" -ForegroundColor Green
    Write-Host "      User ID: $userId" -ForegroundColor Gray
} catch {
    Write-Host "      ❌ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Check for existing bots or create one
Write-Host "`n[2/7] Getting or creating test bot..." -ForegroundColor Yellow
try {
    $botsResponse = Invoke-RestMethod -Uri "$baseUrl/api/bots" `
        -Method GET `
        -Headers @{Authorization="Bearer $token"}

    if ($botsResponse.bots.Count -gt 0) {
        $botId = $botsResponse.bots[0].id
        Write-Host "      ✅ Using existing bot" -ForegroundColor Green
        Write-Host "      Bot ID: $botId" -ForegroundColor Gray
    } else {
        Write-Host "      Creating new bot..." -ForegroundColor Gray
        $createBotResponse = Invoke-RestMethod -Uri "$baseUrl/api/bots" `
            -Method POST `
            -Headers @{Authorization="Bearer $token"} `
            -ContentType "application/json" `
            -Body (@{
                name = "Test Knowledge Bot"
                type = "faq"
                welcome_message = "Hello! I can answer questions about your documents."
            } | ConvertTo-Json)

        $botId = $createBotResponse.bot.id
        Write-Host "      ✅ Created new bot" -ForegroundColor Green
        Write-Host "      Bot ID: $botId" -ForegroundColor Gray
    }
} catch {
    Write-Host "      ❌ Failed to get/create bot: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Check PDF exists
Write-Host "`n[3/7] Checking for test PDF..." -ForegroundColor Yellow
$pdfPath = "MAG2107C.pdf"
if (-not (Test-Path $pdfPath)) {
    Write-Host "      ❌ PDF not found: $pdfPath" -ForegroundColor Red
    Write-Host "      Please place MAG2107C.pdf in botflow-backend/ directory" -ForegroundColor Yellow
    exit 1
}

$fileInfo = Get-Item $pdfPath
$fileSize = $fileInfo.Length
Write-Host "      ✅ Found PDF" -ForegroundColor Green
Write-Host "      File: $($fileInfo.Name)" -ForegroundColor Gray
Write-Host "      Size: $([math]::Round($fileSize / 1KB, 2)) KB" -ForegroundColor Gray

# Step 4: Initialize upload
Write-Host "`n[4/7] Initializing file upload..." -ForegroundColor Yellow
try {
    $initResponse = Invoke-RestMethod -Uri "$baseUrl/api/bots/$botId/knowledge" `
        -Method POST `
        -Headers @{Authorization="Bearer $token"} `
        -ContentType "application/json" `
        -Body (@{
            file_name = $fileInfo.Name
            file_size = $fileSize
            file_type = "application/pdf"
        } | ConvertTo-Json)

    Write-Host "      ✅ Upload initialized" -ForegroundColor Green
    Write-Host "      Article ID: $($initResponse.article_id)" -ForegroundColor Gray

    $articleId = $initResponse.article_id
    $uploadUrl = $initResponse.upload_url
} catch {
    Write-Host "      ❌ Failed to initialize: $_" -ForegroundColor Red
    exit 1
}

# Step 5: Upload file to storage
Write-Host "`n[5/7] Uploading file to Supabase Storage..." -ForegroundColor Yellow
try {
    $fileBytes = [System.IO.File]::ReadAllBytes($pdfPath)
    Invoke-RestMethod -Uri $uploadUrl `
        -Method PUT `
        -Body $fileBytes `
        -ContentType "application/pdf" | Out-Null

    Write-Host "      ✅ File uploaded to storage" -ForegroundColor Green
} catch {
    Write-Host "      ❌ Upload failed: $_" -ForegroundColor Red
    exit 1
}

# Step 6: Trigger processing
Write-Host "`n[6/7] Triggering n8n workflow..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$baseUrl/api/bots/$botId/knowledge/$articleId/process" `
        -Method POST `
        -Headers @{Authorization="Bearer $token"} | Out-Null

    Write-Host "      ✅ Workflow triggered" -ForegroundColor Green
    Write-Host "      n8n should now be processing..." -ForegroundColor Cyan
    Write-Host "      Monitor at: https://botflowsa.app.n8n.cloud" -ForegroundColor Gray
} catch {
    Write-Host "      ❌ Failed to trigger workflow: $_" -ForegroundColor Red
    Write-Host "`n💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check n8n workflow is Active" -ForegroundColor Gray
    Write-Host "   2. Verify N8N_WEBHOOK_URL in .env" -ForegroundColor Gray
    Write-Host "   3. Check n8n executions tab for errors" -ForegroundColor Gray
    exit 1
}

# Step 7: Wait and check status
Write-Host "`n[7/7] Waiting for processing (60 seconds)..." -ForegroundColor Yellow
Write-Host "      This can take 30-60 seconds for a PDF" -ForegroundColor Gray

Start-Sleep -Seconds 10

for ($i = 0; $i -lt 10; $i++) {
    try {
        $listResponse = Invoke-RestMethod -Uri "$baseUrl/api/bots/$botId/knowledge" `
            -Method GET `
            -Headers @{Authorization="Bearer $token"}

        $article = $listResponse.articles | Where-Object { $_.id -eq $articleId } | Select-Object -First 1

        if ($article) {
            $status = $article.metadata.status
            $elapsed = ($i + 2) * 5
            Write-Host "      Status: $status (${elapsed}s elapsed)" -ForegroundColor Cyan

            if ($status -eq "indexed") {
                Write-Host "`n      ✅ Processing complete!" -ForegroundColor Green
                Write-Host "      Total chunks: $($article.metadata.total_chunks)" -ForegroundColor Cyan

                Write-Host "`n=========================================" -ForegroundColor Green
                Write-Host "  🎉 TEST PASSED!" -ForegroundColor Green
                Write-Host "=========================================" -ForegroundColor Green

                Write-Host "`nNext: Test search with this command:" -ForegroundColor Yellow
                Write-Host "  .\search-now.ps1" -ForegroundColor White
                Write-Host "`nOr try a quick search:" -ForegroundColor Yellow
                Write-Host "  curl -X POST http://localhost:3002/api/bots/$botId/knowledge/search \" -ForegroundColor White
                Write-Host "    -H 'Authorization: Bearer $token' \" -ForegroundColor White
                Write-Host "    -H 'Content-Type: application/json' \" -ForegroundColor White
                Write-Host "    -d '{\"query\":\"What is this document about?\",\"limit\":3}'" -ForegroundColor White

                exit 0
            }
            elseif ($status -eq "failed") {
                Write-Host "`n      ❌ Processing failed!" -ForegroundColor Red
                Write-Host "      Error: $($article.metadata.error_message)" -ForegroundColor Yellow
                Write-Host "`n💡 Check n8n execution logs:" -ForegroundColor Yellow
                Write-Host "   https://botflowsa.app.n8n.cloud/executions" -ForegroundColor Gray
                exit 1
            }
        }

        Start-Sleep -Seconds 5
    } catch {
        Write-Host "      ⚠️  Error checking status: $_" -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
}

Write-Host "`n      ⚠️  Timeout after 60 seconds" -ForegroundColor Yellow
Write-Host "      The workflow may still be running..." -ForegroundColor Gray
Write-Host "`n💡 Check:" -ForegroundColor Yellow
Write-Host "   1. n8n executions: https://botflowsa.app.n8n.cloud/executions" -ForegroundColor Gray
Write-Host "   2. Backend logs for webhook errors" -ForegroundColor Gray
Write-Host "   3. Supabase database for article status" -ForegroundColor Gray

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "  Test completed (with timeout)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
