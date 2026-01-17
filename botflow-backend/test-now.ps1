# Quick Knowledge Upload Test for Week 1.5
# Tests the complete flow: Upload → Process → Index

$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:3002"
$botId = "8982d756-3cd0-4e2b-bf20-396e919cb354"

Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host "  BotFlow Knowledge Upload Test" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Step 1: Login
Write-Host "`n[1/5] Logging in..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"email":"kenny@audico.co.za","password":"Apwd4me-1"}'

    $token = $loginResponse.token
    Write-Host "      ✅ Login successful" -ForegroundColor Green
} catch {
    Write-Host "      ❌ Login failed: $_" -ForegroundColor Red
    Write-Host "`n💡 Make sure backend is running on port 3002" -ForegroundColor Yellow
    exit 1
}

# Step 2: Initialize upload
Write-Host "`n[2/5] Initializing file upload..." -ForegroundColor Yellow

$pdfPath = "MAG2107C.pdf"
if (-not (Test-Path $pdfPath)) {
    Write-Host "      ❌ PDF not found: $pdfPath" -ForegroundColor Red
    Write-Host "`n💡 Place a test PDF file in botflow-backend/ directory" -ForegroundColor Yellow
    Write-Host "   You can use any PDF file for testing" -ForegroundColor Gray
    exit 1
}

$fileInfo = Get-Item $pdfPath
$fileSize = $fileInfo.Length
Write-Host "      File: $($fileInfo.Name)" -ForegroundColor Gray
Write-Host "      Size: $([math]::Round($fileSize / 1KB, 2)) KB" -ForegroundColor Gray

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
    Write-Host "      Article ID: $($initResponse.article_id)" -ForegroundColor Cyan

    $articleId = $initResponse.article_id
    $uploadUrl = $initResponse.upload_url
} catch {
    Write-Host "      ❌ Failed to initialize: $_" -ForegroundColor Red
    Write-Host "`n💡 Check that knowledge routes are registered in backend" -ForegroundColor Yellow
    exit 1
}

# Step 3: Upload file to storage
Write-Host "`n[3/5] Uploading file to Supabase Storage..." -ForegroundColor Yellow

try {
    $fileBytes = [System.IO.File]::ReadAllBytes($pdfPath)
    $uploadResponse = Invoke-RestMethod -Uri $uploadUrl `
        -Method PUT `
        -Body $fileBytes `
        -ContentType "application/pdf"

    Write-Host "      ✅ File uploaded to storage" -ForegroundColor Green
} catch {
    Write-Host "      ❌ Upload failed: $_" -ForegroundColor Red
    Write-Host "`n💡 Check Supabase storage bucket 'knowledge-files' exists and has correct RLS policies" -ForegroundColor Yellow
    exit 1
}

# Step 4: Trigger processing
Write-Host "`n[4/5] Triggering n8n workflow..." -ForegroundColor Yellow

try {
    $processResponse = Invoke-RestMethod -Uri "$baseUrl/api/bots/$botId/knowledge/$articleId/process" `
        -Method POST `
        -Headers @{Authorization="Bearer $token"}

    Write-Host "      ✅ Workflow triggered successfully" -ForegroundColor Green
    Write-Host "      n8n should now be processing the PDF..." -ForegroundColor Cyan
    Write-Host "      (Check n8n dashboard: https://botflowsa.app.n8n.cloud)" -ForegroundColor Gray
} catch {
    Write-Host "      ❌ Failed to trigger workflow: $_" -ForegroundColor Red
    Write-Host "`n💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check n8n workflow is Active (green toggle)" -ForegroundColor Gray
    Write-Host "   2. Verify N8N_WEBHOOK_URL in backend .env is correct" -ForegroundColor Gray
    Write-Host "   3. Restart backend after changing .env" -ForegroundColor Gray
    exit 1
}

# Step 5: Wait and check status
Write-Host "`n[5/5] Waiting for processing to complete..." -ForegroundColor Yellow
Write-Host "      This typically takes 30-60 seconds" -ForegroundColor Gray

Start-Sleep -Seconds 10

$maxAttempts = 12
$attemptDelay = 5

for ($i = 0; $i -lt $maxAttempts; $i++) {
    try {
        $listResponse = Invoke-RestMethod -Uri "$baseUrl/api/bots/$botId/knowledge" `
            -Method GET `
            -Headers @{Authorization="Bearer $token"}

        $article = $listResponse.articles | Where-Object { $_.id -eq $articleId } | Select-Object -First 1

        if ($article) {
            $status = $article.metadata.status
            $elapsed = ($i + 2) * $attemptDelay
            Write-Host "      Status: $status (${elapsed}s elapsed)" -ForegroundColor Cyan

            if ($status -eq "indexed") {
                Write-Host "`n      ✅ Processing complete!" -ForegroundColor Green
                Write-Host "      Total chunks: $($article.metadata.total_chunks)" -ForegroundColor Cyan
                Write-Host "      Processed at: $($article.metadata.processed_at)" -ForegroundColor Gray

                Write-Host "`n=======================================" -ForegroundColor Green
                Write-Host "  🎉 TEST PASSED!" -ForegroundColor Green
                Write-Host "=======================================" -ForegroundColor Green

                Write-Host "`nNext steps:" -ForegroundColor Yellow
                Write-Host "  1. Run .\search-now.ps1 to test search" -ForegroundColor White
                Write-Host "  2. Check embeddings in Supabase database" -ForegroundColor White
                Write-Host "  3. Test WhatsApp RAG integration" -ForegroundColor White

                exit 0
            }
            elseif ($status -eq "failed") {
                Write-Host "`n      ❌ Processing failed!" -ForegroundColor Red
                Write-Host "      Error: $($article.metadata.error_message)" -ForegroundColor Yellow

                Write-Host "`n💡 Check n8n execution logs for details" -ForegroundColor Yellow
                Write-Host "   https://botflowsa.app.n8n.cloud/executions" -ForegroundColor Gray

                exit 1
            }
        }

        Start-Sleep -Seconds $attemptDelay
    } catch {
        Write-Host "      ⚠️  Error checking status: $_" -ForegroundColor Yellow
        Start-Sleep -Seconds $attemptDelay
    }
}

Write-Host "`n      ⚠️  Timeout waiting for completion" -ForegroundColor Yellow
Write-Host "      The workflow may still be running" -ForegroundColor Gray
Write-Host "`n💡 Check:" -ForegroundColor Yellow
Write-Host "   1. n8n executions: https://botflowsa.app.n8n.cloud/executions" -ForegroundColor Gray
Write-Host "   2. Backend logs for errors" -ForegroundColor Gray
Write-Host "   3. Supabase database for article status" -ForegroundColor Gray

Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host "  Test completed (with timeout)" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
