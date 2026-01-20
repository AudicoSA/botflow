$response = Invoke-WebRequest -Uri 'http://localhost:3001/api/templates' -Method GET -UseBasicParsing
$templates = ($response.Content | ConvertFrom-Json).templates
$taxi = $templates | Where-Object { $_.vertical -eq 'taxi' }

# Save to file
$taxi | ConvertTo-Json -Depth 10 | Out-File -FilePath "taxi-template-debug.json" -Encoding UTF8

Write-Host "Saved taxi template to taxi-template-debug.json"
