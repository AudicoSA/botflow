# Check if Railway is responding

$railwayUrl = "https://botflow-production.up.railway.app"

Write-Host "`nChecking Railway status...`n" -ForegroundColor Cyan

try {
    $health = Invoke-RestMethod -Uri "$railwayUrl/health" -Method GET -ErrorAction Stop
    Write-Host "SUCCESS - Railway is responding!" -ForegroundColor Green
    Write-Host "Health check: $($health | ConvertTo-Json)`n" -ForegroundColor White
} catch {
    Write-Host "FAILED - Railway is not responding:" -ForegroundColor Red
    Write-Host "$($_.Exception.Message)`n" -ForegroundColor Red
    exit 1
}

Write-Host "Trying debug endpoint...`n" -ForegroundColor Cyan

try {
    $debug = Invoke-RestMethod -Uri "$railwayUrl/debug/supabase" -Method GET -ErrorAction Stop
    Write-Host "SUCCESS - Debug endpoint is available!" -ForegroundColor Green
    Write-Host "$($debug | ConvertTo-Json -Depth 3)`n" -ForegroundColor White
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "FAILED - Status Code: $statusCode" -ForegroundColor Red

    if ($statusCode -eq 404) {
        Write-Host "`nThe debug endpoint doesn't exist. This means:" -ForegroundColor Yellow
        Write-Host "- Railway deployment might have failed" -ForegroundColor White
        Write-Host "- Or the build didn't include the new debug routes" -ForegroundColor White
        Write-Host "`nPlease check Railway logs at:" -ForegroundColor Yellow
        Write-Host "https://railway.app/dashboard`n" -ForegroundColor Cyan
    }
}
