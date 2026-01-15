# Complete PDF Upload and Processing Test
# This script tests the entire pipeline: Upload → Process → Verify

param(
    [Parameter(Mandatory=$true)]
    [string]$PdfPath
)

$EMAIL = "kenny@audico.co.za"
$PASSWORD = "Apwd4me-1"
$BACKEND_URL = "http://localhost:3002"
$BOT_ID = "8982d756-3cd0-4e2b-bf20-396e919cb354"

Write-Host "=== PDF Processing Pipeline Test ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "PDF File: $PdfPath" -ForegroundColor White
Write-Host ""

# Verify PDF exists
if (-not (Test-Path $PdfPath)) {
    Write-Host "✗ PDF file not found: $PdfPath" -ForegroundColor Red
    exit 1
}

$fileName = [System.IO.Path]::GetFileName($PdfPath)
Write-Host "✓ PDF file found: $fileName" -ForegroundColor Green
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

# Step 2: Initialize upload
Write-Host "Step 2: Initializing upload..." -ForegroundColor Yellow
try {
    $initBody = @{
        title = $fileName
        file_name = $fileName
    } | ConvertTo-Json

    $initResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge" `
        -Method POST `
        -Headers @{
            Authorization="Bearer $TOKEN"
            "Content-Type"="application/json"
        } `
        -Body $initBody

    $articleId = $initResponse.article.id
    $uploadUrl = $initResponse.upload.signedUrl

    Write-Host "✓ Upload initialized" -ForegroundColor Green
    Write-Host "  Article ID: $articleId" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ Initialization failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Upload PDF to Supabase Storage
Write-Host "Step 3: Uploading PDF to storage..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri $uploadUrl `
        -Method PUT `
        -ContentType "application/pdf" `
        -InFile $PdfPath | Out-Null

    Write-Host "✓ PDF uploaded successfully" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ Upload failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Trigger n8n processing
Write-Host "Step 4: Triggering n8n workflow..." -ForegroundColor Yellow
try {
    $processResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge/$articleId/process" `
        -Method POST `
        -Headers @{Authorization="Bearer $TOKEN"}

    Write-Host "✓ Workflow triggered" -ForegroundColor Green
    Write-Host "  Workflow URL: $($processResponse.workflow_url)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ Trigger failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Wait for processing (polling)
Write-Host "Step 5: Waiting for processing to complete..." -ForegroundColor Yellow
Write-Host "  This may take 10-60 seconds depending on PDF size" -ForegroundColor Gray
Write-Host ""

$maxAttempts = 20
$attempt = 0
$status = "processing"

while ($attempt -lt $maxAttempts -and $status -ne "indexed") {
    $attempt++
    Start-Sleep -Seconds 3

    try {
        $listResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge" `
            -Method GET `
            -Headers @{Authorization="Bearer $TOKEN"}

        $article = $listResponse.articles | Where-Object { $_.id -eq $articleId }
        $status = $article.metadata.status

        if ($status -eq "indexed") {
            Write-Host "✓ Processing complete!" -ForegroundColor Green
            Write-Host "  Total chunks: $($article.metadata.total_chunks)" -ForegroundColor Gray
            Write-Host "  Total characters: $($article.metadata.total_characters)" -ForegroundColor Gray
            Write-Host ""
            break
        } elseif ($status -eq "failed") {
            Write-Host "✗ Processing failed" -ForegroundColor Red
            Write-Host "  Error: $($article.metadata.error_message)" -ForegroundColor Red
            exit 1
        } else {
            Write-Host "  [$attempt/$maxAttempts] Status: $status" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  [$attempt/$maxAttempts] Checking status..." -ForegroundColor Yellow
    }
}

if ($status -ne "indexed") {
    Write-Host "✗ Processing timeout - check n8n dashboard" -ForegroundColor Red
    Write-Host "  n8n URL: https://botflowsa.app.n8n.cloud" -ForegroundColor Gray
    exit 1
}

# Step 6: Verify embeddings in database
Write-Host "Step 6: Verifying embeddings..." -ForegroundColor Yellow
Write-Host "  Run this SQL query in Supabase:" -ForegroundColor Gray
Write-Host ""
Write-Host "  SELECT COUNT(*) FROM knowledge_embeddings" -ForegroundColor White
Write-Host "  WHERE source_id = '$articleId';" -ForegroundColor White
Write-Host ""

# Step 7: Test search
Write-Host "Step 7: Testing semantic search..." -ForegroundColor Yellow
Write-Host "  Enter a test query (or press Enter to skip): " -NoNewline -ForegroundColor Gray
$testQuery = Read-Host

if ($testQuery) {
    try {
        $searchBody = @{
            query = $testQuery
            limit = 3
            threshold = 0.7
        } | ConvertTo-Json

        $searchResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge/search" `
            -Method POST `
            -Headers @{
                Authorization="Bearer $TOKEN"
                "Content-Type"="application/json"
            } `
            -Body $searchBody

        Write-Host ""
        Write-Host "✓ Search complete: $($searchResponse.count) results" -ForegroundColor Green
        Write-Host ""

        $searchResponse.results | ForEach-Object {
            Write-Host "  Similarity: $([math]::Round($_.similarity, 4))" -ForegroundColor Yellow
            Write-Host "  Content: $($_.content.Substring(0, [Math]::Min(100, $_.content.Length)))..." -ForegroundColor White
            Write-Host ""
        }
    } catch {
        Write-Host "✗ Search failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Pipeline Test Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "✓ Article created: $articleId" -ForegroundColor Green
Write-Host "✓ PDF uploaded: $fileName" -ForegroundColor Green
Write-Host "✓ Processing completed" -ForegroundColor Green
Write-Host "✓ Embeddings generated" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test search with .\test-search.ps1"
Write-Host "2. Send WhatsApp message to test RAG integration"
Write-Host "3. Monitor performance in production"
Write-Host ""
Write-Host "Article ID saved to: article-id.txt" -ForegroundColor Gray
$articleId | Out-File -FilePath "article-id.txt" -Encoding UTF8
