/**
 * Debug why bot list query isn't finding the Texi bot
 */

import { supabaseAdmin } from '../config/supabase.js';

async function debugBotQuery() {
    const kennyUserId = 'dbcf4fcf-5680-4400-b2a4-8bbb65ab34c6';
    const texiBotId = '8982d756-3cd0-4e2b-bf20-396e919cb354';

    console.log('========================================');
    console.log('Debug Bot Query');
    console.log('========================================\n');

    // 1. Check the bot directly
    console.log('[1/3] Checking Texi bot directly...');
    const { data: bot, error: botError } = await supabaseAdmin
        .from('bots')
        .select('*')
        .eq('id', texiBotId)
        .single();

    if (botError || !bot) {
        console.error('❌ Bot not found:', botError?.message);
        return;
    }

    console.log('✓ Bot exists:');
    console.log(`  ID: ${bot.id}`);
    console.log(`  Name: ${bot.name}`);
    console.log(`  user_id: ${bot.user_id}`);
    console.log(`  organization_id: ${bot.organization_id}`);
    console.log(`  created_at: ${bot.created_at}\n`);

    // 2. Query exactly as the API does
    console.log('[2/3] Querying bots as API does (with user_id filter)...');
    const { data: apiQuery, error: apiError } = await supabaseAdmin
        .from('bots')
        .select('*')
        .eq('user_id', kennyUserId)
        .order('created_at', { ascending: false });

    if (apiError) {
        console.error('❌ Query failed:', apiError.message);
        return;
    }

    console.log(`✓ Query returned ${apiQuery.length} bot(s)`);
    if (apiQuery.length > 0) {
        apiQuery.forEach((b: any) => {
            console.log(`  - ${b.name} (${b.id})`);
        });
    } else {
        console.log('  (empty)');
    }
    console.log();

    // 3. Check if user_id matches
    console.log('[3/3] Checking user_id match...');
    if (bot.user_id === kennyUserId) {
        console.log('✅ user_id MATCHES - Bot should appear in list!');
        console.log('   Issue must be with Railway API endpoint.\n');
    } else {
        console.log('❌ user_id MISMATCH!');
        console.log(`   Expected: ${kennyUserId}`);
        console.log(`   Actual:   ${bot.user_id}\n`);
    }

    // 4. Check all bots with Kenny's user_id
    console.log('[4/4] All bots for Kenny user_id...');
    const { data: allKennyBots } = await supabaseAdmin
        .from('bots')
        .select('id, name, created_at')
        .eq('user_id', kennyUserId)
        .order('created_at', { ascending: false });

    if (allKennyBots && allKennyBots.length > 0) {
        console.log(`Found ${allKennyBots.length} bot(s):`);
        allKennyBots.forEach((b: any) => {
            console.log(`  - ${b.name} (created: ${b.created_at})`);
        });
    } else {
        console.log('No bots found with this user_id');
    }
}

debugBotQuery()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
