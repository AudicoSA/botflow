/**
 * Check if a specific bot exists
 */

import { supabaseAdmin } from '../config/supabase.js';

async function checkBot() {
    const botId = 'a25b17b2-dea7-456e-af8d-bb5807e613d0';

    console.log('========================================');
    console.log('Check Specific Bot');
    console.log('========================================\n');

    const { data: bot, error } = await supabaseAdmin
        .from('bots')
        .select('*')
        .eq('id', botId)
        .single();

    if (error || !bot) {
        console.log('❌ Bot does not exist in database');
        console.log('This is why you get 404 error\n');
        return;
    }

    console.log('✅ Bot exists!');
    console.log(`  ID: ${bot.id}`);
    console.log(`  Name: ${bot.name}`);
    console.log(`  User ID: ${bot.user_id}`);
    console.log(`  Created: ${bot.created_at}\n`);
}

checkBot()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
