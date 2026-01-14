$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/templates' -Method GET -UseBasicParsing
$templates = ($response.Content | ConvertFrom-Json).templates
$taxi = $templates | Where-Object { $_.vertical -eq 'taxi' }

Write-Host "Taxi Template Required Fields:" -ForegroundColor Cyan
Write-Host ""

foreach ($field in $taxi.required_fields) {
    Write-Host "- $($field.key): $($field.label)" -ForegroundColor Yellow
    Write-Host "  Type: $($field.type)" -ForegroundColor Gray
    if ($field.required) {
        Write-Host "  Required: YES" -ForegroundColor Red
    }
    Write-Host ""
}
