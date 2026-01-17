import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { createRequire } from 'module';

// Use CommonJS require for pdf-parse (it's a CJS module)
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface ChunkResult {
  content: string;
  chunk_index: number;
  char_start: number;
  char_end: number;
}

interface ProcessingResult {
  success: boolean;
  total_chunks?: number;
  error?: string;
}

export class PDFProcessorService {
  /**
   * Chunk text into overlapping segments
   */
  private chunkText(text: string, chunkSize = 2000, overlap = 200): ChunkResult[] {
    const chunks: ChunkResult[] = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);

      // Don't cut mid-sentence - find last period or newline
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
        chunks.push({
          content: chunk,
          chunk_index: chunks.length,
          char_start: start,
          char_end: end,
        });
      }

      start = end - overlap;
    }

    return chunks;
  }

  /**
   * Generate embedding using OpenAI API
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Process PDF: download, parse, chunk, embed, and store
   */
  async processPDF(articleId: string, botId: string, fileUrl: string, fileName: string): Promise<ProcessingResult> {
    try {
      console.log(`[PDF Processor] Starting processing for article ${articleId}`);

      // Step 1: Download PDF from Supabase Storage
      console.log(`[PDF Processor] Downloading PDF from: ${fileUrl}`);
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to download PDF: ${fileResponse.statusText}`);
      }

      const arrayBuffer = await fileResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Step 2: Parse PDF with pdf-parse v2
      console.log(`[PDF Processor] Parsing PDF...`);
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy(); // Free memory
      const text = result.text;

      if (!text || text.trim().length === 0) {
        throw new Error('PDF contains no text content');
      }

      console.log(`[PDF Processor] Extracted ${text.length} characters from ${result.total} pages`);

      // Step 3: Chunk text
      const chunks = this.chunkText(text);
      console.log(`[PDF Processor] Created ${chunks.length} chunks`);

      // Step 4: Generate embeddings and store each chunk
      console.log(`[PDF Processor] Generating embeddings and storing...`);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`[PDF Processor] Processing chunk ${i + 1}/${chunks.length}`);

        // Generate embedding
        const embedding = await this.generateEmbedding(chunk.content);

        // Store in database
        const { error: insertError } = await supabase
          .from('knowledge_embeddings')
          .insert({
            bot_id: botId,
            source_id: articleId,
            content: chunk.content,
            embedding: embedding,
            metadata: {
              chunk_index: chunk.chunk_index,
              file_name: fileName,
              char_start: chunk.char_start,
              char_end: chunk.char_end,
            },
          });

        if (insertError) {
          console.error(`[PDF Processor] Error inserting chunk ${i}:`, insertError);
          throw insertError;
        }
      }

      // Step 5: Update article status to indexed
      console.log(`[PDF Processor] Updating article status to indexed`);
      const { error: updateError } = await supabase
        .from('knowledge_base_articles')
        .update({
          metadata: {
            status: 'indexed',
            total_chunks: chunks.length,
            processed_at: new Date().toISOString(),
          },
        })
        .eq('id', articleId);

      if (updateError) {
        console.error(`[PDF Processor] Error updating article status:`, updateError);
        throw updateError;
      }

      console.log(`[PDF Processor] ✅ Processing complete! ${chunks.length} chunks indexed`);

      return {
        success: true,
        total_chunks: chunks.length,
      };
    } catch (error: any) {
      console.error(`[PDF Processor] ❌ Processing failed:`, error);

      // Update article status to failed
      await supabase
        .from('knowledge_base_articles')
        .update({
          metadata: {
            status: 'failed',
            error_message: error.message,
            processed_at: new Date().toISOString(),
          },
        })
        .eq('id', articleId);

      return {
        success: false,
        error: error.message,
      };
    }
  }
}
