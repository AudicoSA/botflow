# Test Railway debug endpoints to diagnose database connection

$railwayUrl = "https://botflow-production.up.railway.app"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Railway Debug Endpoint Tests" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Waiting 30 seconds for Railway to redeploy..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host "`n[Test 1] Checking Supabase connection..." -ForegroundColor Cyan

try {
    $supabaseDebug = Invoke-RestMethod `
        -Uri "$railwayUrl/debug/supabase" `
        -Method GET `
        -ErrorAction Stop

    Write-Host "SUCCESS - Supabase Connection Info:" -ForegroundColor Green
    Write-Host "  Project Ref: $($supabaseDebug.supabase.projectRef)" -ForegroundColor White
    Write-Host "  Connected: $($supabaseDebug.supabase.connected)" -ForegroundColor White
    Write-Host "`nDatabase Counts:" -ForegroundColor Yellow
    Write-Host "  Users: $($supabaseDebug.counts.users)" -ForegroundColor White
    Write-Host "  Organizations: $($supabaseDebug.counts.organizations)" -ForegroundColor White
    Write-Host "  WhatsApp Accounts: $($supabaseDebug.counts.whatsapp_accounts)`n" -ForegroundColor White

} catch {
    Write-Host "FAILED - Debug endpoint not available yet or error:" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nIf you see 404, Railway hasn't finished deploying. Wait another minute and try again.`n" -ForegroundColor Yellow
}

Write-Host "[Test 2] Checking Kenny's account data..." -ForegroundColor Cyan

try {
    $userDebug = Invoke-RestMethod `
        -Uri "$railwayUrl/debug/user/kenny@audico.co.za" `
        -Method GET `
        -ErrorAction Stop

    Write-Host "SUCCESS - User Data:" -ForegroundColor Green
    Write-Host "  User ID: $($userDebug.user.id)" -ForegroundColor White
    Write-Host "  Email: $($userDebug.user.email)" -ForegroundColor White

    if ($userDebug.organization) {
        Write-Host "`nOrganization:" -ForegroundColor Yellow
        Write-Host "  ID: $($userDebug.organization.id)" -ForegroundColor White
        Write-Host "  Name: $($userDebug.organization.name)" -ForegroundColor White
    } else {
        Write-Host "`nOrganization: NULL" -ForegroundColor Red
    }

    if ($userDebug.whatsappAccount) {
        Write-Host "`nWhatsApp Account:" -ForegroundColor Yellow
        Write-Host "  ID: $($userDebug.whatsappAccount.id)" -ForegroundColor White
        Write-Host "  Phone: $($userDebug.whatsappAccount.phone_number)" -ForegroundColor White
        Write-Host "  Status: $($userDebug.whatsappAccount.status)" -ForegroundColor White
        Write-Host "`nSUCCESS - WhatsApp account found!" -ForegroundColor Green
    } else {
        Write-Host "`nWhatsApp Account: NULL" -ForegroundColor Red
        Write-Host "Issue: $($userDebug.issue)" -ForegroundColor Red
    }

} catch {
    Write-Host "FAILED - User debug endpoint error:" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)`n" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Debug Tests Complete" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Expected Results:" -ForegroundColor Yellow
Write-Host "- Project Ref should be: ajtnixmnfuqtrgrakxss" -ForegroundColor White
Write-Host "- WhatsApp Accounts count should be > 0" -ForegroundColor White
Write-Host "- Kenny's WhatsApp Account should NOT be NULL`n" -ForegroundColor White
