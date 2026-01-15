/**
 * Raw SQL utility for bypassing PostgREST schema cache issues
 *
 * When PostgREST schema cache is stale, we can use the PostgreSQL
 * REST API directly with raw SQL queries.
 */

import { supabaseAdmin } from '../config/supabase.js';

export interface KnowledgeArticle {
    id: string;
    bot_id: string;
    title: string;
    content: string;
    category: string;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

/**
 * Insert a knowledge article using raw SQL
 * Bypasses PostgREST schema cache
 */
export async function insertKnowledgeArticle(params: {
    bot_id: string;
    title: string;
    content: string;
    category: string;
    metadata: Record<string, any>;
}): Promise<KnowledgeArticle> {
    const { bot_id, title, content, category, metadata } = params;

    // Use Supabase RPC to execute raw SQL
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
        query: `
            INSERT INTO knowledge_base_articles (
                bot_id, title, content, category, metadata
            ) VALUES (
                $1, $2, $3, $4, $5::jsonb
            )
            RETURNING *
        `,
        params: [bot_id, title, content, category, JSON.stringify(metadata)]
    });

    if (error) {
        throw new Error(`Failed to insert article: ${error.message}`);
    }

    return data[0];
}
