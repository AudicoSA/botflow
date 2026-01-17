# n8n Workflow Fix - pdf-parse Module Issue

## Problem
The original n8n workflow was failing with error: **"Module 'pdf-parse' is disallowed [line 2]"**

n8n Cloud restricts certain npm modules for security reasons, and `pdf-parse` is not available.

## Solution
Replaced the custom Code node that used `require('pdf-parse')` with n8n's built-in **"Extract from File"** node.

## Changes Made

### Old Workflow (Lines 45-54)
```javascript
// Code node using pdf-parse
const pdf = require('pdf-parse');  // ❌ Not allowed in n8n Cloud
const binaryData = await this.helpers.getBinaryDataBuffer(0);
const data = await pdf(binaryData);
```

### New Workflow (Lines 62-67)
```json
{
  "name": "Extract from File",
  "type": "n8n-nodes-base.extractFromFile"  // ✅ Built-in n8n node
}
```

### Additional Node Added
**"Prepare Text"** node (Lines 75-101) - Combines extracted text with metadata from HMAC Verify step.

## Updated Workflow Structure

1. **Webhook Trigger** - Receives POST from backend
2. **HMAC Verify** - Validates webhook signature
3. **Download PDF** - Fetches PDF from Supabase Storage
4. **Extract from File** ✨ NEW - Extracts text (replaces pdf-parse)
5. **Prepare Text** ✨ NEW - Combines text with metadata
6. **Chunk Text** - Splits into 2000-char chunks
7. **Split In Batches** - Process 10 chunks at a time
8. **Generate Embedding (OpenAI)** - Creates vectors
9. **Format Embedding** - Prepares for database
10. **Insert Embedding to Supabase** - Stores vectors
11. **Loop Back** - Processes all chunks
12. **Aggregate Results** - Collects totals
13. **Update Status to Indexed** - Updates article
14. **Generate Callback Signature** - HMAC for callback
15. **Callback to Backend** - Notifies completion

## Testing

The workflow is now active and ready to test. Run:

```powershell
cd botflow-backend
.\test-now.ps1
```

Expected result: PDF should be processed successfully without the pdf-parse error.

## Status
✅ Workflow imported and active
✅ Native n8n nodes only (no restricted modules)
✅ Ready for testing
