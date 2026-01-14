/**
 * Check what user_id the created bot has
 */

import { supabaseAdmin } from '../config/supabase.js';

async function checkBotUser() {
    const botId = 'b153e508-2f4e-4d8a-b17f-64ff15acf4cc';
    const kennyUserId = 'dbcf4fcf-5680-4400-b2a4-8bbb65ab34c6';

    console.log('========================================');
    console.log('Check Bot User ID');
    console.log('========================================\n');

    // Get the bot
    const { data: bot, error } = await supabaseAdmin
        .from('bots')
        .select('*')
        .eq('id', botId)
        .single();

    if (error) {
        console.error('❌ Bot not found:', error.message);
        return;
    }

    console.log('✅ Bot found!');
    console.log(`  ID: ${bot.id}`);
    console.log(`  Name: ${bot.name}`);
    console.log(`  User ID: ${bot.user_id}`);
    console.log(`  Organization ID: ${bot.organization_id}`);
    console.log(`  Created: ${bot.created_at}\n`);

    console.log('Expected User ID:', kennyUserId);
    console.log('Actual User ID:  ', bot.user_id);
    console.log('Match:', bot.user_id === kennyUserId ? '✅ YES' : '❌ NO\n');

    if (bot.user_id !== kennyUserId) {
        console.log('❌ USER ID MISMATCH!');
        console.log('This is why the bot list is empty.\n');
        console.log('Solution: Update bot user_id to correct value\n');

        // Offer to fix it
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('bots')
            .update({ user_id: kennyUserId })
            .eq('id', botId)
            .select()
            .single();

        if (updateError) {
            console.error('❌ Failed to update:', updateError.message);
        } else {
            console.log('✅ Bot user_id updated successfully!');
            console.log(`  New user_id: ${updated.user_id}\n`);
        }
    }
}

checkBotUser()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
