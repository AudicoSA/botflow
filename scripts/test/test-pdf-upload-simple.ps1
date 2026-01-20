# Simple PDF Upload Test Script
param(
    [Parameter(Mandatory=$true)]
    [string]$PdfPath
)

$EMAIL = "kenny@audico.co.za"
$PASSWORD = "Apwd4me-1"
$BACKEND_URL = "http://localhost:3002"
$BOT_ID = "8982d756-3cd0-4e2b-bf20-396e919cb354"

Write-Host "=== PDF Upload Test ===" -ForegroundColor Cyan
Write-Host ""

# Check PDF exists
if (-not (Test-Path $PdfPath)) {
    Write-Host "[ERROR] PDF file not found: $PdfPath" -ForegroundColor Red
    exit 1
}

$fileName = [System.IO.Path]::GetFileName($PdfPath)
Write-Host "[OK] Found PDF: $fileName" -ForegroundColor Green
Write-Host ""

# Step 1: Login
Write-Host "[1/4] Logging in..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body (@{email=$EMAIL; password=$PASSWORD} | ConvertTo-Json)

    $TOKEN = $loginResponse.token
    Write-Host "[OK] Login successful" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Login failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Initialize upload
Write-Host "[2/4] Initializing upload..." -ForegroundColor Yellow
try {
    $fileInfo = Get-Item $PdfPath
    $fileSize = $fileInfo.Length

    $initBody = @{
        title = $fileName
        file_name = $fileName
        file_type = "application/pdf"
        file_size = $fileSize
    } | ConvertTo-Json

    $initResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge" `
        -Method POST `
        -Headers @{Authorization="Bearer $TOKEN"; "Content-Type"="application/json"} `
        -Body $initBody

    $articleId = $initResponse.article_id
    $uploadUrl = $initResponse.upload_url

    Write-Host "[OK] Upload initialized" -ForegroundColor Green
    Write-Host "    Article ID: $articleId" -ForegroundColor Cyan
} catch {
    Write-Host "[ERROR] Init failed: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Upload PDF to Supabase
Write-Host "[3/4] Uploading PDF to storage..." -ForegroundColor Yellow
try {
    $pdfBytes = [System.IO.File]::ReadAllBytes($PdfPath)

    $response = Invoke-RestMethod -Uri $uploadUrl `
        -Method PUT `
        -Headers @{"Content-Type"="application/pdf"} `
        -Body $pdfBytes

    Write-Host "[OK] PDF uploaded" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Upload failed: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Trigger processing
Write-Host "[4/4] Triggering n8n processing..." -ForegroundColor Yellow
try {
    $processResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots/$BOT_ID/knowledge/$articleId/process" `
        -Method POST `
        -Headers @{Authorization="Bearer $TOKEN"}

    Write-Host "[OK] Processing triggered" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Upload Complete ===" -ForegroundColor Cyan
    Write-Host "Article ID: $articleId" -ForegroundColor White
    Write-Host "Status: processing" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "1. Monitor n8n dashboard for workflow execution" -ForegroundColor Gray
    Write-Host "2. Check Supabase for embeddings (may take 30-60s)" -ForegroundColor Gray
    Write-Host "3. Run test-performance.ps1 again to see search results" -ForegroundColor Gray
    Write-Host ""

    # Save article ID for later
    $articleId | Out-File -FilePath "article-id.txt" -Encoding UTF8 -NoNewline

} catch {
    Write-Host "[ERROR] Processing trigger failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Note: PDF is uploaded to storage, but processing not started" -ForegroundColor Yellow
    exit 1
}
