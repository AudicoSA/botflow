/**
 * Knowledge Search Service
 *
 * Provides semantic search functionality for the knowledge base using OpenAI embeddings
 * and pgvector similarity search.
 */

import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';

export interface SearchOptions {
    botId: string;
    query: string;
    limit?: number;
    threshold?: number;
}

export interface SearchResult {
    id: string;
    content: string;
    similarity: number;
    source_id: string;
    source_title?: string;
    metadata: Record<string, any>;
}

/**
 * Search the knowledge base using semantic vector search
 *
 * @param options - Search configuration
 * @returns Array of relevant knowledge chunks with similarity scores
 */
export async function searchKnowledge(options: SearchOptions): Promise<SearchResult[]> {
    const { botId, query, limit = 5, threshold = 0.7 } = options;

    try {
        // 1. Generate query embedding via OpenAI
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
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

        if (!embeddingResponse.ok) {
            throw new Error(`OpenAI API error: ${embeddingResponse.status}`);
        }

        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.data[0].embedding;

        // 2. Search knowledge base using PostgreSQL function
        const { data, error } = await supabaseAdmin.rpc('search_knowledge', {
            query_embedding: queryEmbedding,
            match_bot_id: botId,
            match_threshold: threshold,
            match_count: limit
        });

        if (error) {
            console.error('Knowledge search error:', error);
            throw error;
        }

        return data || [];
    } catch (error) {
        console.error('Knowledge search failed:', error);
        // Return empty array as graceful fallback
        return [];
    }
}

/**
 * Build context string from search results for GPT-4 system prompt
 *
 * @param results - Search results from searchKnowledge()
 * @returns Formatted context string
 */
export function buildKnowledgeContext(results: SearchResult[]): string {
    if (results.length === 0) {
        return '';
    }

    let context = '\n\n📚 Relevant Knowledge from uploaded documents:\n';

    results.forEach((result, idx) => {
        context += `\n[${idx + 1}] ${result.content}\n`;
        if (result.source_title) {
            context += `(Source: ${result.source_title})\n`;
        }
    });

    context += '\nInstructions: Use the above information to answer the question accurately. If the answer is in the knowledge base, cite it. If not, use your general knowledge but mention that the information is not in the uploaded documents.';

    return context;
}

/**
 * Check if knowledge base has any indexed content for a bot
 *
 * @param botId - Bot identifier
 * @returns True if knowledge base has content
 */
export async function hasKnowledgeBase(botId: string): Promise<boolean> {
    try {
        const { count, error } = await supabaseAdmin
            .from('knowledge_embeddings')
            .select('*', { count: 'exact', head: true })
            .eq('bot_id', botId);

        if (error) {
            console.error('Error checking knowledge base:', error);
            return false;
        }

        return (count || 0) > 0;
    } catch (error) {
        console.error('Error checking knowledge base:', error);
        return false;
    }
}
