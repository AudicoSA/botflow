/**
 * Verify all bots for Kenny's account
 */

import { supabaseAdmin } from '../config/supabase.js';

async function verifyAllBots() {
    const kennyUserId = 'dbcf4fcf-5680-4400-b2a4-8bbb65ab34c6';

    console.log('========================================');
    console.log('All Bots for Kenny');
    console.log('========================================\n');

    // Get ALL bots (no filter)
    const { data: allBots, error: allError } = await supabaseAdmin
        .from('bots')
        .select('*')
        .order('created_at', { ascending: false });

    if (allError) {
        console.error('❌ Error fetching all bots:', allError.message);
        return;
    }

    console.log(`Total bots in database: ${allBots.length}\n`);

    // Get Kenny's bots
    const { data: kennyBots, error: kennyError } = await supabaseAdmin
        .from('bots')
        .select('*')
        .eq('user_id', kennyUserId)
        .order('created_at', { ascending: false });

    if (kennyError) {
        console.error('❌ Error fetching Kenny bots:', kennyError.message);
        return;
    }

    console.log(`Kenny's bots: ${kennyBots.length}\n`);

    if (kennyBots.length > 0) {
        console.log('Details:');
        kennyBots.forEach((bot, index) => {
            console.log(`\n${index + 1}. ${bot.name}`);
            console.log(`   ID: ${bot.id}`);
            console.log(`   Type: ${bot.type}`);
            console.log(`   User ID: ${bot.user_id}`);
            console.log(`   Created: ${bot.created_at}`);
            console.log(`   Organization: ${bot.organization_id}`);
        });
    }

    // Show bots NOT belonging to Kenny
    const otherBots = allBots.filter(b => b.user_id !== kennyUserId);
    if (otherBots.length > 0) {
        console.log(`\n\nBots belonging to OTHER users: ${otherBots.length}`);
        otherBots.forEach((bot) => {
            console.log(`  - ${bot.name} (user_id: ${bot.user_id})`);
        });
    }
}

verifyAllBots()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
