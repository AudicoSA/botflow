# Quick Test Guide - Backend PDF Processing

## ✅ What's Ready

Backend PDF processing is **complete and working** for text-based PDFs!

## Quick Test (Standalone)

Test the PDF processor directly without needing authentication:

```bash
cd botflow-backend
node test-pdf-processor.mjs
```

**Expected Output:**
```
🧪 Testing pdf-parse with test-document.pdf...

✅ Loaded PDF (5455 bytes)
📄 Parsing PDF...

✅ Successfully extracted text!
   Result keys: pages,text,total
   Pages: 3
   Characters: 2537

--- First 500 characters ---
BotFlow Knowledge Base Test Document
This is a test document for the BotFlow PDF knowledge base system...
```

## Full API Test

Test the complete upload → process → embed → store flow:

```bash
cd botflow-backend
./test-knowledge-api.ps1
```

This will prompt for login credentials and test:
1. Authentication
2. PDF upload to Supabase Storage
3. Backend PDF processing
4. Embedding generation
5. Database storage
6. Status verification

## Create Your Own Test PDF

Want to test with your own content?

```bash
cd botflow-backend
node create-test-pdf.mjs
```

This creates `test-document.pdf` with sample content.

## Important: PDF Types

### ✅ Works With (Text-Based PDFs)
- PDFs exported from Word, Google Docs, Pages
- Web-generated PDFs (print to PDF)
- PDFs with selectable/copyable text
- E-books and digital documents

### ❌ Doesn't Work (Image-Based PDFs)
- Scanned documents
- Photos saved as PDF
- Screenshots saved as PDF
- PDFs without text layers

**How to Check:** Open the PDF and try to select/copy text. If you can't select text, it won't work with this backend processor.

## Cost per Document

- **Text-based PDFs (backend)**: ~$0.001 (embeddings only)
- **Image-based PDFs (Vision API)**: ~$0.01-0.05 (vision + embeddings)

## Architecture

```
POST /api/bots/:botId/knowledge
  ↓
Upload PDF → Supabase Storage
  ↓
Backend Processor:
  1. Download PDF
  2. Extract text (pdf-parse)
  3. Chunk (2000 chars, 200 overlap)
  4. Generate embeddings (OpenAI)
  5. Store in database
  6. Update status → 'indexed'
```

## Backend Logs

Watch the processing in real-time:

The backend (running in background task b88294c) will show:
```
[PDF Processor] Starting processing for article abc-123
[PDF Processor] Downloading PDF from: https://...
[PDF Processor] Parsing PDF...
[PDF Processor] Extracted 2537 characters from 3 pages
[PDF Processor] Created 2 chunks
[PDF Processor] Processing chunk 1/2
[PDF Processor] Processing chunk 2/2
[PDF Processor] ✅ Processing complete! 2 chunks indexed
```

## Files You Need

1. **Test Script**: `test-pdf-processor.mjs` - Standalone test
2. **Test PDF**: `test-document.pdf` - 3-page sample
3. **PDF Service**: `src/services/pdf-processor.service.ts` - Main processor
4. **API Route**: `src/routes/knowledge.ts` - Upload endpoint

## Troubleshooting

### "PDF contains no text content"
- Your PDF is image-based (scanned document)
- Solution: Use text-based PDF or implement Vision API fallback

### Backend not processing
- Check backend logs (task b88294c output)
- Verify OpenAI API key is configured
- Check Supabase connection

### Test hanging
- Some PDFs take longer to process
- Check if OpenAI API is responding
- Monitor backend logs for errors

## Next Steps

### Option 1: Deploy as-is
- Works great for text-based PDFs
- 10x cheaper than Vision API
- Fast processing

### Option 2: Add Vision API fallback
- Handles both text and image PDFs
- Automatic detection and routing
- See `FIX_OPTIONS.md` for implementation

### Option 3: Offer both options
- Let users choose processing method
- "Fast & Cheap" vs "Universal"
- Different pricing tiers

## Quick Reference

| Command | Purpose |
|---------|---------|
| `node test-pdf-processor.mjs` | Test PDF extraction |
| `node create-test-pdf.mjs` | Generate test PDF |
| `./test-knowledge-api.ps1` | Full API test |
| `curl localhost:3002/health` | Check backend status |

## Documentation

- [PDF_PROCESSING_COMPLETE.md](PDF_PROCESSING_COMPLETE.md) - Full summary
- [BACKEND_PDF_SUCCESS.md](BACKEND_PDF_SUCCESS.md) - Implementation details
- [BACKEND_PDF_PROCESSING.md](BACKEND_PDF_PROCESSING.md) - Architecture
- [FIX_OPTIONS.md](FIX_OPTIONS.md) - Alternative approaches

---

**Status**: ✅ Production-ready for text-based PDFs!

**Backend**: Running on http://localhost:3002
**Test PDF**: `botflow-backend/test-document.pdf`
**Cost**: $0.001 per document (embeddings only)
