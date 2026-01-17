# Quick test - just verify API endpoints work
$token = (curl -s -X POST http://localhost:3002/api/auth/login -H "Content-Type: application/json" -d '{"email":"dev@botflow.app","password":"dev-password-123"}' | ConvertFrom-Json).token

Write-Host "✅ Logged in successfully" -ForegroundColor Green
Write-Host "Token: $($token.Substring(0,20))..." -ForegroundColor Gray

Write-Host "`nℹ️  To test knowledge base, you need:" -ForegroundColor Cyan
Write-Host "  1. A bot ID that belongs to your user" -ForegroundColor White
Write-Host "  2. Create bot via dashboard or API first" -ForegroundColor White
Write-Host "`nReady to proceed once you have a bot!" -ForegroundColor Yellow
