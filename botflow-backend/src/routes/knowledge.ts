/**
 * Phase 2 Knowledge Base Routes
 *
 * Handles document upload, embedding generation, and RAG (Retrieval-Augmented Generation).
 * Uses pgvector for semantic search with OpenAI embeddings.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';

// ============================================
// Schemas
// ============================================

const uploadInitSchema = z.object({
    file_name: z.string().min(1),
    file_size: z.number().max(10 * 1024 * 1024), // 10MB max
    file_type: z.enum([
        'application/pdf',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ])
});

const createSourceSchema = z.object({
    sourceType: z.enum(['file', 'url', 'text']),
    content: z.string(),
    metadata: z.record(z.any()).default({}),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Generate HMAC signature for webhook authentication
 */
function generateWebhookSignature(payload: any): string {
    if (!env.N8N_WEBHOOK_SECRET) {
        throw new Error('N8N_WEBHOOK_SECRET not configured');
    }

    const payloadString = JSON.stringify(payload);
    return crypto
        .createHmac('sha256', env.N8N_WEBHOOK_SECRET)
        .update(payloadString)
        .digest('hex');
}

/**
 * Process text source - chunk and generate embeddings
 */
async function processTextSource(articleId: string, botId: string, content: string, log: any): Promise<void> {
    try {
        log.info({ articleId, botId, contentLength: content.length }, 'Starting text source processing');

        // Update status to processing
        await supabaseAdmin
            .from('knowledge_base_articles')
            .update({
                metadata: {
                    status: 'processing',
                    processing_started: new Date().toISOString()
                }
            })
            .eq('id', articleId);

        // Simple chunking: split by paragraphs, then by sentences if too long
        const chunks = chunkText(content, 1000, 100); // 1000 chars per chunk, 100 char overlap

        log.info({ articleId, chunkCount: chunks.length }, 'Text chunked');

        // Generate embeddings for each chunk
        let successCount = 0;
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            try {
                // Generate embedding via OpenAI
                const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'text-embedding-3-small',
                        input: chunk
                    })
                });

                if (!embeddingResponse.ok) {
                    log.error({ status: embeddingResponse.status }, 'OpenAI embedding failed');
                    continue;
                }

                const embedData = await embeddingResponse.json() as { data: Array<{ embedding: number[] }> };
                const embedding = embedData.data[0].embedding;

                // Store embedding in database
                const { error: embedError } = await supabaseAdmin
                    .from('knowledge_embeddings')
                    .insert({
                        source_id: articleId,
                        bot_id: botId,
                        chunk_text: chunk,
                        chunk_index: i,
                        embedding: embedding,
                        metadata: {
                            chunk_size: chunk.length,
                            model: 'text-embedding-3-small'
                        }
                    });

                if (embedError) {
                    log.error({ embedError, chunkIndex: i }, 'Failed to store embedding');
                } else {
                    successCount++;
                }
            } catch (chunkError) {
                log.error({ chunkError, chunkIndex: i }, 'Failed to process chunk');
            }
        }

        // Update article status
        await supabaseAdmin
            .from('knowledge_base_articles')
            .update({
                metadata: {
                    status: successCount > 0 ? 'indexed' : 'failed',
                    chunks_created: successCount,
                    processing_completed: new Date().toISOString()
                }
            })
            .eq('id', articleId);

        log.info({ articleId, successCount, totalChunks: chunks.length }, 'Text source processing completed');
    } catch (error) {
        log.error({ error, articleId }, 'Text source processing failed');

        // Update status to failed
        await supabaseAdmin
            .from('knowledge_base_articles')
            .update({
                metadata: {
                    status: 'failed',
                    error_message: error instanceof Error ? error.message : 'Unknown error',
                    processing_completed: new Date().toISOString()
                }
            })
            .eq('id', articleId);
    }
}

/**
 * Process URL source - fetch, scrape, and generate embeddings
 */
async function processUrlSource(articleId: string, botId: string, url: string, log: any): Promise<void> {
    try {
        log.info({ articleId, botId, url }, 'Starting URL source processing');

        // Update status to processing
        await supabaseAdmin
            .from('knowledge_base_articles')
            .update({
                metadata: {
                    status: 'processing',
                    url,
                    processing_started: new Date().toISOString()
                }
            })
            .eq('id', articleId);

        // Fetch the URL content with better headers to avoid blocks
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        let response;
        try {
            response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1'
                },
                signal: controller.signal,
                redirect: 'follow'
            });
        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('Request timeout: Website took too long to respond (30s limit)');
            }
            if (fetchError.cause?.code === 'ENOTFOUND') {
                throw new Error(`DNS lookup failed: Could not find website "${new URL(url).hostname}"`);
            }
            if (fetchError.cause?.code === 'ECONNREFUSED') {
                throw new Error('Connection refused: Website server is not accepting connections');
            }
            if (fetchError.cause?.code === 'CERT_HAS_EXPIRED' || fetchError.message?.includes('certificate')) {
                throw new Error('SSL certificate error: Website has an invalid or expired certificate');
            }
            throw new Error(`Network error: ${fetchError.message || 'Failed to connect to website'}`);
        }
        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error(`Access denied (403): Website is blocking automated access`);
            }
            if (response.status === 404) {
                throw new Error(`Page not found (404): The URL does not exist`);
            }
            if (response.status === 500 || response.status === 502 || response.status === 503) {
                throw new Error(`Server error (${response.status}): Website is having issues`);
            }
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
            log.warn({ contentType, url }, 'Non-HTML content type, attempting to process anyway');
        }

        const html = await response.text();
        log.info({ articleId, htmlLength: html.length }, 'URL content fetched');

        if (!html || html.length < 100) {
            throw new Error('Website returned empty or very short content');
        }

        // Simple HTML to text conversion (strip tags, decode entities)
        const textContent = extractTextFromHtml(html);

        log.info({ articleId, textLength: textContent.length }, 'Text extracted from HTML');

        if (!textContent || textContent.length < 50) {
            throw new Error('Could not extract meaningful text content from the page (too short or no readable text found)');
        }

        // Update article with extracted content
        await supabaseAdmin
            .from('knowledge_base_articles')
            .update({
                content: textContent.substring(0, 50000) // Limit to 50k chars
            })
            .eq('id', articleId);

        // Process the text content
        await processTextSource(articleId, botId, textContent, log);

    } catch (error: any) {
        log.error({ error: error.message, stack: error.stack, articleId, url }, 'URL source processing failed');

        // Update status to failed with detailed error message
        await supabaseAdmin
            .from('knowledge_base_articles')
            .update({
                metadata: {
                    status: 'failed',
                    url,
                    error_message: error instanceof Error ? error.message : 'Unknown error',
                    error_type: error.name || 'Error',
                    processing_completed: new Date().toISOString()
                }
            })
            .eq('id', articleId);
    }
}

/**
 * Simple text chunking with overlap
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).length > chunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            // Keep last part for overlap
            const words = currentChunk.split(' ');
            const overlapWords = Math.ceil(overlap / 5); // Roughly 5 chars per word
            currentChunk = words.slice(-overlapWords).join(' ') + ' ' + sentence;
        } else {
            currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
}

/**
 * Extract text content from HTML
 */
function extractTextFromHtml(html: string): string {
    // Remove script and style tags with their content
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

    // Remove HTML comments
    text = text.replace(/<!--[\s\S]*?-->/g, '');

    // Replace common block elements with newlines
    text = text.replace(/<\/(p|div|h[1-6]|li|tr|br)[^>]*>/gi, '\n');

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode common HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");

    // Clean up whitespace
    text = text.replace(/\s+/g, ' ');
    text = text.replace(/\n\s+/g, '\n');
    text = text.replace(/\n+/g, '\n');

    return text.trim();
}

/**
 * Verify user owns the bot (via organization membership)
 */
async function verifyBotOwnership(botId: string, userId: string): Promise<boolean> {
    const { data: bot } = await supabaseAdmin
        .from('bots')
        .select('organization_id')
        .eq('id', botId)
        .single();

    if (!bot) return false;

    const { data: member } = await supabaseAdmin
        .from('organization_members')
        .select('id')
        .eq('organization_id', bot.organization_id)
        .eq('user_id', userId)
        .single();

    return !!member;
}

/**
 * Get user ID (with dev fallback for testing)
 */
async function getUserId(request: any, fastify: FastifyInstance): Promise<string> {
    // Try to get userId from JWT token
    const user = request.user as any;
    fastify.log.info({ user }, 'JWT user object');

    let userId = user?.userId || user?.sub || user?.id;

    if (!userId) {
        fastify.log.warn('No userId found in JWT, falling back to dev user');
        try {
            const { getDevUser } = await import('../utils/dev-user.js');
            const devUser = await getDevUser(fastify.log);
            userId = devUser.id;
        } catch (error) {
            throw new Error('Authentication required');
        }
    }

    return userId;
}

// ============================================
// Routes
// ============================================

export default async function knowledgeRoutes(fastify: FastifyInstance) {

    /**
     * GET /bots/:botId/knowledge
     * List all knowledge sources for a bot
     */
    fastify.get('/bots/:botId/knowledge', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { botId } = request.params as { botId: string };

        try {
            const userId = await getUserId(request, fastify);

            // Verify ownership
            const hasAccess = await verifyBotOwnership(botId, userId);
            if (!hasAccess) {
                return reply.code(403).send({ error: 'Unauthorized' });
            }

            // Get articles from new knowledge_base_articles table
            const { data: articles, error } = await supabaseAdmin
                .from('knowledge_base_articles')
                .select('id, title, category, metadata, created_at')
                .eq('bot_id', botId)
                .order('created_at', { ascending: false });

            if (error) {
                fastify.log.error(error, 'Failed to fetch knowledge articles');
                return reply.code(500).send({ error: 'Failed to fetch knowledge sources' });
            }

            // Get embedding counts per article
            const articlesWithCounts = await Promise.all(
                (articles || []).map(async (article) => {
                    const { count } = await supabaseAdmin
                        .from('knowledge_embeddings')
                        .select('*', { count: 'exact', head: true })
                        .eq('source_id', article.id);

                    return {
                        ...article,
                        chunk_count: count || 0
                    };
                })
            );

            return { articles: articlesWithCounts };
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    /**
     * POST /bots/:botId/knowledge
     * Initialize file upload (returns signed upload URL)
     */
    fastify.post('/bots/:botId/knowledge', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { botId } = request.params as { botId: string };

        try {
            const userId = await getUserId(request, fastify);

            // Verify ownership
            const hasAccess = await verifyBotOwnership(botId, userId);
            if (!hasAccess) {
                return reply.code(403).send({ error: 'Unauthorized' });
            }

            // Validate request body
            const validation = uploadInitSchema.safeParse(request.body);
            if (!validation.success) {
                return reply.code(400).send({
                    error: 'Invalid request',
                    details: validation.error.errors
                });
            }

            const { file_name, file_size, file_type } = validation.data;

            // Create knowledge_base_articles record
            const { data: article, error: articleError } = await supabaseAdmin
                .from('knowledge_base_articles')
                .insert({
                    bot_id: botId,
                    title: file_name,
                    content: '', // Will be populated during processing
                    category: 'uploaded_document',
                    metadata: {
                        file_name,
                        file_size,
                        file_type,
                        status: 'pending',
                        uploaded_by: userId,
                        upload_date: new Date().toISOString()
                    }
                })
                .select()
                .single();

            if (articleError) {
                fastify.log.error(articleError, 'Failed to create article record');
                return reply.code(500).send({ error: 'Failed to create article record' });
            }

            // Generate signed upload URL for Supabase Storage
            const filePath = `knowledge/${botId}/${article.id}/${file_name}`;
            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                .from('knowledge-files')
                .createSignedUploadUrl(filePath);

            if (uploadError) {
                fastify.log.error(uploadError, 'Failed to generate upload URL');

                // Clean up article record
                await supabaseAdmin
                    .from('knowledge_base_articles')
                    .delete()
                    .eq('id', article.id);

                return reply.code(500).send({ error: 'Failed to generate upload URL' });
            }

            return {
                article_id: article.id,
                upload_url: uploadData.signedUrl,
                file_path: filePath
            };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message || 'Internal server error' });
        }
    });

    /**
     * POST /bots/:botId/knowledge/:articleId/process
     * Trigger n8n workflow to process uploaded file
     */
    fastify.post('/bots/:botId/knowledge/:articleId/process', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { botId, articleId } = request.params as { botId: string, articleId: string };

        try {
            const userId = await getUserId(request, fastify);

            // Verify ownership
            const hasAccess = await verifyBotOwnership(botId, userId);
            if (!hasAccess) {
                return reply.code(403).send({ error: 'Unauthorized' });
            }

            // Get article metadata
            const { data: article, error: articleError } = await supabaseAdmin
                .from('knowledge_base_articles')
                .select('metadata')
                .eq('id', articleId)
                .eq('bot_id', botId)
                .single();

            if (articleError || !article) {
                return reply.code(404).send({ error: 'Article not found' });
            }

            // Generate signed download URL for n8n to fetch
            const filePath = `knowledge/${botId}/${articleId}/${article.metadata.file_name}`;
            const { data: urlData, error: urlError } = await supabaseAdmin.storage
                .from('knowledge-files')
                .createSignedUrl(filePath, 3600); // 1 hour expiry

            if (urlError || !urlData) {
                fastify.log.error(urlError, 'Failed to generate download URL');
                return reply.code(500).send({ error: 'Failed to generate download URL' });
            }

            // Update status to processing
            await supabaseAdmin
                .from('knowledge_base_articles')
                .update({
                    metadata: {
                        ...article.metadata,
                        status: 'processing',
                        processing_started: new Date().toISOString()
                    }
                })
                .eq('id', articleId);

            // Process PDF directly in backend (no n8n needed!)
            fastify.log.info({ articleId, botId }, 'Starting PDF processing in backend');

            // Import and instantiate PDF processor
            const { PDFProcessorService } = await import('../services/pdf-processor.service.js');
            const processor = new PDFProcessorService();

            // Process asynchronously (don't block the response)
            processor.processPDF(
                articleId,
                botId,
                urlData.signedUrl,
                article.metadata.file_name
            ).catch(error => {
                fastify.log.error({ error, articleId }, 'PDF processing failed');
            });

            return { status: 'processing' };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message || 'Internal server error' });
        }
    });

    /**
     * POST /bots/:botId/knowledge/:articleId/complete
     * Webhook endpoint for n8n to report processing completion
     */
    fastify.post('/bots/:botId/knowledge/:articleId/complete', async (request, reply) => {
        const { botId, articleId } = request.params as { botId: string, articleId: string };

        try {
            // Verify webhook signature
            const receivedSignature = request.headers['x-webhook-signature'] as string;
            const expectedSignature = generateWebhookSignature(request.body);

            if (receivedSignature !== expectedSignature) {
                fastify.log.warn({ botId, articleId }, 'Invalid webhook signature');
                return reply.code(403).send({ error: 'Invalid signature' });
            }

            const { status, chunks_created, error_message } = request.body as {
                status: 'success' | 'failed',
                chunks_created?: number,
                error_message?: string
            };

            // Update article status
            const { data: article } = await supabaseAdmin
                .from('knowledge_base_articles')
                .select('metadata')
                .eq('id', articleId)
                .single();

            if (!article) {
                return reply.code(404).send({ error: 'Article not found' });
            }

            await supabaseAdmin
                .from('knowledge_base_articles')
                .update({
                    metadata: {
                        ...article.metadata,
                        status: status === 'success' ? 'indexed' : 'failed',
                        chunks_created,
                        error_message,
                        processing_completed: new Date().toISOString()
                    }
                })
                .eq('id', articleId);

            fastify.log.info({ articleId, status, chunks_created }, 'Knowledge processing completed');

            return { success: true };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message || 'Internal server error' });
        }
    });

    /**
     * GET /bots/:botId/knowledge/stats
     * Get knowledge base statistics
     */
    fastify.get('/bots/:botId/knowledge/stats', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { botId } = request.params as { botId: string };

        try {
            const userId = await getUserId(request, fastify);

            // Verify ownership
            const hasAccess = await verifyBotOwnership(botId, userId);
            if (!hasAccess) {
                return reply.code(403).send({ error: 'Unauthorized' });
            }

            // Call the get_knowledge_stats PostgreSQL function
            const { data, error } = await supabaseAdmin
                .rpc('get_knowledge_stats', { bot_text_id: botId });

            if (error) {
                fastify.log.error(error, 'Failed to get knowledge stats');
                return reply.code(500).send({ error: 'Failed to get statistics' });
            }

            return data && data.length > 0 ? data[0] : {
                total_articles: 0,
                total_chunks: 0,
                total_size_bytes: 0,
                avg_chunks_per_article: 0,
                indexed_articles: 0,
                processing_articles: 0,
                failed_articles: 0
            };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message || 'Internal server error' });
        }
    });

    /**
     * POST /bots/:botId/knowledge/search
     * Search knowledge base with semantic vector search
     */
    fastify.post('/bots/:botId/knowledge/search', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { botId } = request.params as { botId: string };
        const { query, limit = 5, threshold = 0.7 } = request.body as {
            query: string;
            limit?: number;
            threshold?: number;
        };

        try {
            const userId = await getUserId(request, fastify);

            // Verify ownership
            const hasAccess = await verifyBotOwnership(botId, userId);
            if (!hasAccess) {
                return reply.code(403).send({ error: 'Unauthorized' });
            }

            if (!query || typeof query !== 'string') {
                return reply.code(400).send({ error: 'Query string is required' });
            }

            // Generate embedding for query via OpenAI
            const openaiResponse = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'text-embedding-3-small',
                    input: query
                })
            });

            if (!openaiResponse.ok) {
                const errorText = await openaiResponse.text();
                fastify.log.error({ status: openaiResponse.status, error: errorText }, 'OpenAI embedding failed');
                return reply.code(500).send({ error: 'Failed to generate query embedding' });
            }

            const embedData = await openaiResponse.json() as { data: Array<{ embedding: number[] }> };
            const queryEmbedding = embedData.data[0].embedding;

            // Search knowledge base using PostgreSQL function
            const { data: results, error } = await supabaseAdmin.rpc('search_knowledge', {
                query_embedding: queryEmbedding,
                match_bot_id: botId,
                match_threshold: threshold,
                match_count: limit
            });

            if (error) {
                fastify.log.error(error, 'Failed to search knowledge');
                return reply.code(500).send({ error: 'Search failed' });
            }

            return {
                query,
                results: results || [],
                count: results?.length || 0
            };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message || 'Internal server error' });
        }
    });

    /**
     * DELETE /bots/:botId/knowledge/:articleId
     * Delete knowledge source (cascades to embeddings)
     */
    fastify.delete('/bots/:botId/knowledge/:articleId', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { botId, articleId } = request.params as { botId: string, articleId: string };

        try {
            const userId = await getUserId(request, fastify);

            // Verify ownership
            const hasAccess = await verifyBotOwnership(botId, userId);
            if (!hasAccess) {
                return reply.code(403).send({ error: 'Unauthorized' });
            }

            // Get file path before deletion
            const { data: article } = await supabaseAdmin
                .from('knowledge_base_articles')
                .select('metadata')
                .eq('id', articleId)
                .eq('bot_id', botId)
                .single();

            if (article && article.metadata.file_name) {
                // Delete file from storage
                const filePath = `knowledge/${botId}/${articleId}/${article.metadata.file_name}`;
                await supabaseAdmin.storage
                    .from('knowledge-files')
                    .remove([filePath]);
            }

            // Delete article (cascades to embeddings via ON DELETE CASCADE)
            const { error } = await supabaseAdmin
                .from('knowledge_base_articles')
                .delete()
                .eq('id', articleId)
                .eq('bot_id', botId);

            if (error) {
                fastify.log.error(error, 'Failed to delete article');
                return reply.code(500).send({ error: 'Failed to delete knowledge source' });
            }

            return { success: true };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message || 'Internal server error' });
        }
    });

    // ============================================
    // URL and Text Sources (Simple Knowledge)
    // ============================================

    /**
     * POST /bots/:botId/knowledge/source
     * Add a URL or text-based knowledge source
     * These are processed immediately (no file upload needed)
     */
    fastify.post('/bots/:botId/knowledge/source', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { botId } = request.params as { botId: string };

        try {
            const userId = await getUserId(request, fastify);

            // Verify ownership
            const hasAccess = await verifyBotOwnership(botId, userId);
            if (!hasAccess) {
                return reply.code(403).send({ error: 'Unauthorized' });
            }

            const { source_type, content, title } = request.body as {
                source_type: 'url' | 'text';
                content: string;
                title?: string;
            };

            if (!source_type || !content) {
                return reply.code(400).send({ error: 'source_type and content are required' });
            }

            if (!['url', 'text'].includes(source_type)) {
                return reply.code(400).send({ error: 'source_type must be "url" or "text"' });
            }

            // Validate and normalize URL format if it's a URL source
            let normalizedContent = content;
            if (source_type === 'url') {
                // Add https:// if no protocol specified
                if (!content.startsWith('http://') && !content.startsWith('https://')) {
                    normalizedContent = 'https://' + content;
                }
                try {
                    new URL(normalizedContent);
                } catch {
                    return reply.code(400).send({ error: 'Invalid URL format' });
                }
            }

            // Create knowledge_base_articles record
            const category = source_type === 'url' ? 'website' : 'manual_text';
            const { data: article, error: articleError } = await supabaseAdmin
                .from('knowledge_base_articles')
                .insert({
                    bot_id: botId,
                    title: title || normalizedContent.substring(0, 100),
                    content: source_type === 'text' ? normalizedContent : '', // Store text content directly
                    category: category,
                    metadata: {
                        source_type,
                        url: source_type === 'url' ? normalizedContent : undefined,
                        status: 'pending',
                        added_by: userId,
                        added_at: new Date().toISOString()
                    }
                })
                .select()
                .single();

            if (articleError) {
                fastify.log.error(articleError, 'Failed to create article record');
                return reply.code(500).send({ error: 'Failed to create knowledge source' });
            }

            // For text sources, generate embeddings immediately
            if (source_type === 'text' && normalizedContent.length > 0) {
                // Process text asynchronously
                processTextSource(article.id, botId, normalizedContent, fastify.log).catch(error => {
                    fastify.log.error({ error, articleId: article.id }, 'Text processing failed');
                });
            }

            // For URL sources, scrape and process
            if (source_type === 'url') {
                // Scrape and process URL asynchronously
                processUrlSource(article.id, botId, normalizedContent, fastify.log).catch(error => {
                    fastify.log.error({ error, articleId: article.id }, 'URL processing failed');
                });
            }

            return {
                article: {
                    id: article.id,
                    title: article.title,
                    category: article.category,
                    metadata: article.metadata,
                    created_at: article.created_at
                }
            };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message || 'Internal server error' });
        }
    });

    // ============================================
    // Legacy Routes (for backward compatibility)
    // ============================================

    /**
     * Legacy: Add knowledge source (old format)
     * Kept for backward compatibility with Phase 1
     */
    fastify.post('/bots/:botId/knowledge/legacy', {
        onRequest: [fastify.authenticate],
    }, async (request, reply) => {
        const { botId } = request.params as { botId: string };

        try {
            const userId = await getUserId(request, fastify);

            // Verify ownership
            const hasAccess = await verifyBotOwnership(botId, userId);
            if (!hasAccess) {
                return reply.code(403).send({ error: 'Unauthorized' });
            }

            const validation = createSourceSchema.safeParse(request.body);
            if (!validation.success) {
                return reply.code(400).send({ error: 'Invalid request', details: validation.error.errors });
            }

            const { sourceType, content, metadata } = validation.data;

            // Check if knowledge_sources table exists (Phase 1)
            const { data: source, error } = await supabaseAdmin
                .from('knowledge_sources')
                .insert({
                    bot_id: botId,
                    source_type: sourceType,
                    content: content,
                    metadata: metadata,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) {
                fastify.log.error(error);
                return reply.code(500).send({ error: 'Failed to create knowledge source' });
            }

            return { source };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message || 'Internal server error' });
        }
    });
}
