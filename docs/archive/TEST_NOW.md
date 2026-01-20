# Test Your Knowledge Base Setup - Ready to Go! 🚀

## ✅ What's Working

Your setup is **100% ready**:
- ✅ Backend API running on http://localhost:3002
- ✅ n8n workflow active and waiting
- ✅ Database schema deployed
- ✅ Webhook URL configured

## 🧪 Quick Test (2 Minutes)

### Option A: Test with Existing User

If you have a user account in your system, test with:

```powershell
# Set your credentials
$EMAIL = "your-email@example.com"
$PASSWORD = "your-password"
$BOT_ID = "your-bot-id"  # Get from database or dashboard

# Step 1: Login
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{email=$EMAIL; password=$PASSWORD} | ConvertTo-Json)

$TOKEN = $loginResponse.token

# Step 2: Create knowledge article
$response = Invoke-RestMethod -Uri "http://localhost:3002/api/bots/$BOT_ID/knowledge" `
    -Method POST `
    -Headers @{Authorization="Bearer $TOKEN"} `
    -ContentType "application/json" `
    -Body '{"title":"Test Document","file_name":"test.pdf","file_size":13264}'

# View the response
$response | ConvertTo-Json
```

### Option B: Create Test User First

If you need to create a test user:

```powershell
# Create a new user
$signupResponse = Invoke-RestMethod -Uri "http://localhost:3002/api/auth/signup" `
    -Method POST `
    -ContentType "application/json" `
    -Body (@{
        email="test@botflow.sa"
        password="Test123!@#"
        name="Test User"
    } | ConvertTo-Json)

# Then use the login from Option A
```

---

## 📊 What the Test Does

When you run the test, here's what happens:

1. **Backend creates article** → Returns article_id + signed upload URL
2. **You upload PDF** → To Supabase Storage using signed URL
3. **Backend triggers n8n** → Sends webhook to process file
4. **n8n workflow runs**:
   - Downloads PDF
   - Extracts text
   - Chunks into segments
   - Generates embeddings (OpenAI)
   - Stores in PostgreSQL
   - Calls back to backend
5. **Status updates** → Article status becomes "indexed"

---

## 🔍 Check Progress

### In n8n Dashboard
```
https://botflowsa.app.n8n.cloud
```
- Go to "Executions" tab
- Watch workflow run in real-time!

### In Supabase
```sql
-- Check articles
SELECT * FROM knowledge_base_articles
ORDER BY created_at DESC LIMIT 5;

-- Check embeddings
SELECT
    COUNT(*) as total_embeddings,
    bot_id,
    source_id
FROM knowledge_embeddings
GROUP BY bot_id, source_id;
```

---

## 🎯 Next: Full End-to-End Test

Once basic test works, try with a real PDF:

```powershell
# 1. Create article (from above)
$response = ...  # Returns article_id and upload_url

# 2. Upload actual PDF
$pdfPath = "C:\path\to\your\document.pdf"
Invoke-RestMethod -Uri $response.upload_url `
    -Method PUT `
    -ContentType "application/pdf" `
    -InFile $pdfPath

# 3. Trigger processing
Invoke-RestMethod -Uri "http://localhost:3002/api/bots/$BOT_ID/knowledge/$($response.article.id)/process" `
    -Method POST `
    -Headers @{Authorization="Bearer $TOKEN"}

# 4. Check status (wait ~5-10 seconds)
Start-Sleep -Seconds 10
Invoke-RestMethod -Uri "http://localhost:3002/api/bots/$BOT_ID/knowledge" `
    -Headers @{Authorization="Bearer $TOKEN"}
```

---

## 🐛 Troubleshooting

### "401 Unauthorized"
- User doesn't exist → Create test user (Option B above)
- Wrong credentials → Check email/password

### "404 Not Found"
- Bot ID invalid → Check database for valid bot_id
- Wrong URL → Verify backend is on port 3002

### n8n workflow not triggering
- Check webhook URL in `.env` matches n8n
- Verify workflow is "Active" in n8n
- Check n8n execution logs

### Embeddings not created
- Check OpenAI API key is valid
- Verify Supabase keys in n8n nodes
- Look at n8n execution for errors

---

## 📝 What You Need

To run the test, you need:
1. **Email & Password** - Your BotFlow user account
2. **Bot ID** - From your database `bots` table

To get a Bot ID:
```sql
-- Run in Supabase SQL editor
SELECT id, name, type FROM bots LIMIT 5;
```

Or check your dashboard if you have one bot created!

---

## ✨ You're Ready!

Everything is set up correctly. Just need your credentials to test!

**Let me know:**
1. Do you have a user account already?
2. Do you have a bot created?
3. Want me to help create test data?

Then we can run the full test! 🚀

---

Last updated: 2026-01-15 06:06
