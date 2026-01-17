// Quick test of PDF processor service
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

async function testPDFParse() {
  try {
    console.log('🧪 Testing pdf-parse with test-document.pdf...\n');

    // Read PDF file
    const buffer = readFileSync('./test-document.pdf');
    console.log(`✅ Loaded PDF (${buffer.length} bytes)`);

    // Parse with pdf-parse v2
    console.log('📄 Parsing PDF...');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();

    console.log(`\n✅ Successfully extracted text!`);
    console.log(`   Result keys: ${Object.keys(result)}`);
    console.log(`   Pages: ${result.numpages || result.numPages || result.total || 'unknown'}`);
    console.log(`   Characters: ${result.text.length}`);
    console.log(`\n--- Full text content ---`);
    console.log(JSON.stringify(result.text));
    console.log(`\n--- First 500 characters ---`);
    console.log(result.text.substring(0, 500));
    console.log('---\n');

    // Test chunking logic
    const chunkSize = 2000;
    const overlap = 200;
    let chunks = 0;
    let start = 0;
    const text = result.text;

    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);

      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastPeriod, lastNewline);

        if (breakPoint > start + overlap) {
          end = breakPoint + 1;
        }
      }

      const chunk = text.slice(start, end).trim();
      if (chunk.length > 50) {
        chunks++;
      }

      start = end - overlap;
    }

    console.log(`✅ Would create ${chunks} chunks (size=${chunkSize}, overlap=${overlap})`);
    console.log('\n🎉 PDF processor test PASSED!\n');

  } catch (error) {
    console.error('❌ Test FAILED:', error);
    process.exit(1);
  }
}

testPDFParse();
