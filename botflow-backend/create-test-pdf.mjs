// Create a simple text-based PDF for testing
// Uses PDFKit to generate a PDF with actual text content

import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';

const doc = new PDFDocument();
const stream = createWriteStream('./test-document.pdf');

doc.pipe(stream);

// Page 1
doc.fontSize(20).text('BotFlow Knowledge Base Test Document', { align: 'center' });
doc.moveDown();
doc.fontSize(12).text('This is a test document for the BotFlow PDF knowledge base system.');
doc.moveDown();
doc.text('It contains actual text content (not images) so pdf-parse can extract the text successfully.');
doc.moveDown();
doc.text('Key Features of BotFlow:');
doc.list([
  'AI-powered WhatsApp automation',
  'Template-based bot creation',
  'Knowledge base with vector search',
  'RAG (Retrieval-Augmented Generation)',
  'Multi-tenant SaaS platform'
]);
doc.moveDown();
doc.text('This paragraph contains information about South African businesses. BotFlow is designed specifically for South African SMEs who want to automate their WhatsApp customer service. The platform supports multiple languages, handles load shedding mentions, and includes local payment integrations like Paystack.');

// Page 2
doc.addPage();
doc.fontSize(16).text('Technical Architecture', { underline: true });
doc.moveDown();
doc.fontSize(12).text('Backend Stack:');
doc.list([
  'Fastify API server with TypeScript',
  'Supabase PostgreSQL with pgvector',
  'OpenAI GPT-4 and text-embedding-3-small',
  'BullMQ message queue with Redis'
]);
doc.moveDown();
doc.text('Knowledge Base Features:');
doc.moveDown();
doc.text('The knowledge base uses vector embeddings to enable semantic search. When a PDF is uploaded, it is chunked into 2000-character segments with 200-character overlap. Each chunk is then embedded using OpenAI text-embedding-3-small model, creating 1536-dimensional vectors. These vectors are stored in PostgreSQL using the pgvector extension for efficient similarity search.');
doc.moveDown();
doc.text('RAG Implementation:');
doc.moveDown();
doc.text('During conversations, the bot retrieves relevant knowledge chunks using cosine similarity search. The top matching chunks are included in the AI context, allowing the bot to answer questions based on the uploaded documents. This retrieval-augmented generation approach ensures accurate, source-based responses.');

// Page 3
doc.addPage();
doc.fontSize(16).text('Testing Guide', { underline: true });
doc.moveDown();
doc.fontSize(12).text('To test PDF processing:');
doc.list([
  'Upload a PDF via /api/bots/:botId/knowledge',
  'The backend downloads the PDF from Supabase Storage',
  'pdf-parse extracts the text content',
  'Text is chunked into overlapping segments',
  'OpenAI generates embeddings for each chunk',
  'Embeddings are stored in knowledge_embeddings table',
  'Article status updates to "indexed"'
]);
doc.moveDown();
doc.text('Expected Results:');
doc.moveDown();
doc.text('This 3-page document should generate approximately 2-3 chunks, depending on the exact character count. The first chunk will contain the introduction and features list. The second chunk will cover the technical architecture. The third chunk will include the testing guide. Each chunk overlaps with adjacent chunks to maintain context continuity.');
doc.moveDown();
doc.text('Success Criteria:');
doc.text('✓ PDF text extracted successfully');
doc.text('✓ Multiple chunks created with overlap');
doc.text('✓ Embeddings generated for all chunks');
doc.text('✓ Searchable via semantic similarity');
doc.text('✓ Article marked as indexed');

doc.end();

stream.on('finish', () => {
  console.log('✅ Created test-document.pdf');
  console.log('   This is a text-based PDF that pdf-parse can process.');
  console.log('\n📄 Run: node test-pdf-processor.mjs');
});
