# Get Bot ID or Create One
$EMAIL = "kenny@audico.co.za"
$PASSWORD = "Apwd4me-1"
$BACKEND_URL = "http://localhost:3002"

Write-Host "Logging in..." -ForegroundColor Cyan

# Login
$loginResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{email=$EMAIL; password=$PASSWORD} | ConvertTo-Json)

$TOKEN = $loginResponse.token
Write-Host "Logged in successfully!" -ForegroundColor Green
Write-Host ""

# Get bots
Write-Host "Fetching your bots..." -ForegroundColor Cyan
try {
    $botsResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots" `
        -Method GET `
        -Headers @{Authorization="Bearer $TOKEN"}

    if ($botsResponse.bots.Count -gt 0) {
        Write-Host "Found $($botsResponse.bots.Count) bot(s):" -ForegroundColor Green
        $botsResponse.bots | ForEach-Object {
            Write-Host ""
            Write-Host "Bot ID: $($_.id)" -ForegroundColor Yellow
            Write-Host "Name: $($_.name)" -ForegroundColor White
            Write-Host "Type: $($_.type)" -ForegroundColor Gray
        }

        # Save first bot ID to use
        $FIRST_BOT_ID = $botsResponse.bots[0].id
        Write-Host ""
        Write-Host "Using Bot ID: $FIRST_BOT_ID" -ForegroundColor Cyan

        # Export for use in other scripts
        $FIRST_BOT_ID | Out-File -FilePath "bot-id.txt"
        Write-Host "Saved to bot-id.txt" -ForegroundColor Gray

    } else {
        Write-Host "No bots found. Let's create one!" -ForegroundColor Yellow
        Write-Host ""

        # Create a test bot
        $newBot = @{
            name = "Test Knowledge Bot"
            type = "faq"
            description = "Test bot for knowledge base"
            ai_model = "gpt-4o"
            temperature = 0.7
            system_prompt = "You are a helpful assistant."
        } | ConvertTo-Json

        $createResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/bots" `
            -Method POST `
            -Headers @{Authorization="Bearer $TOKEN"} `
            -ContentType "application/json" `
            -Body $newBot

        Write-Host "Created new bot!" -ForegroundColor Green
        Write-Host "Bot ID: $($createResponse.bot.id)" -ForegroundColor Yellow

        # Save bot ID
        $createResponse.bot.id | Out-File -FilePath "bot-id.txt"
        Write-Host "Saved to bot-id.txt" -ForegroundColor Gray
    }

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error details:" -ForegroundColor Yellow
    Write-Host $_.ErrorDetails.Message -ForegroundColor Gray
}
