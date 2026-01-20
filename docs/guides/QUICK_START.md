# Quick Start: Import n8n Workflow Now! ⚡

## Answer to Your Question

**Q: Do we need n8n on our own infrastructure? Or is cloud OK?**

**A: n8n Cloud is perfect!** ✅ You don't need enterprise plan.

We solved the environment variables issue by configuring credentials directly in the nodes!

---

## What to Do Right Now (10 minutes)

### 1. Import Workflow
- File: `n8n-knowledge-ingestion-workflow-no-env.json`
- Login: https://botflowsa.app.n8n.cloud
- Import → Use this file

### 2. Configure 3 Things
1. **OpenAI:** Add credential in Settings
2. **Supabase:** Replace keys in 2 nodes (from your `.env` file)
3. **Activate:** Turn workflow ON

### 3. Get Webhook URL
- Copy: `https://botflowsa.app.n8n.cloud/webhook/knowledge-ingestion`
- Add to backend `.env`:
  ```
  N8N_WEBHOOK_URL=https://botflowsa.app.n8n.cloud/webhook/knowledge-ingestion
  ```

### 4. Test
```powershell
.\test-knowledge-workflow.ps1
```

---

## Files You Need

✅ **Use this:** `n8n-knowledge-ingestion-workflow-no-env.json`

📖 **Read this:** `N8N_CLOUD_SETUP.md` (detailed steps)

🧪 **Test with:** `test-knowledge-workflow.ps1`

---

## Why n8n Cloud is Fine

✅ No server management
✅ Auto-scaling
✅ SSL included
✅ Free tier: 5,000 executions/month
✅ Works without enterprise plan
✅ Can migrate to self-hosted anytime

Your use case: ~1000 executions/month = **well within free tier!**

---

## Next Steps After Import

1. Test with sample PDF
2. Integrate RAG into chat (Day 3)
3. Build frontend upload UI (Days 4-5)

---

**Ready?** Import the workflow now! 🚀

See `N8N_CLOUD_SETUP.md` for detailed instructions.
