/**
 * Transfer the old Taxi bot to Kenny's current account
 */

import { supabaseAdmin } from '../config/supabase.js';

async function transferTaxiBot() {
    const oldUserId = '63a41d2c-057b-4fda-8eac-257f7278fba4';
    const newUserId = 'dbcf4fcf-5680-4400-b2a4-8bbb65ab34c6'; // Kenny's current user_id
    const kennyOrgId = 'd6c7bc1b-9c84-406a-a18d-1106a25ddf6f';

    console.log('========================================');
    console.log('Transfer Taxi Bot to Current Account');
    console.log('========================================\n');

    // Find the Taxi bot
    const { data: taxiBots, error: findError } = await supabaseAdmin
        .from('bots')
        .select('*')
        .eq('user_id', oldUserId)
        .ilike('name', '%taxi%');

    if (findError || !taxiBots || taxiBots.length === 0) {
        console.error('❌ Taxi bot not found');
        return;
    }

    console.log(`Found ${taxiBots.length} taxi bot(s):\n`);

    for (const bot of taxiBots) {
        console.log(`Bot: ${bot.name}`);
        console.log(`  ID: ${bot.id}`);
        console.log(`  Current user_id: ${bot.user_id}`);
        console.log(`  Current org_id: ${bot.organization_id}`);

        // Update to new user_id and org_id
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('bots')
            .update({
                user_id: newUserId,
                organization_id: kennyOrgId
            })
            .eq('id', bot.id)
            .select()
            .single();

        if (updateError) {
            console.error(`  ❌ Failed to update: ${updateError.message}\n`);
        } else {
            console.log(`  ✅ Updated successfully!`);
            console.log(`  New user_id: ${updated.user_id}`);
            console.log(`  New org_id: ${updated.organization_id}\n`);
        }
    }

    console.log('========================================');
    console.log('Transfer Complete!');
    console.log('========================================\n');
    console.log('Now refresh your browser at /dashboard/bots');
    console.log('You should see all 3 bots:\n');
    console.log('  1. Taxi bot (from 2 days ago)');
    console.log('  2. Car Hire Test (from today)');
    console.log('  3. Doc Bot test (from today)\n');
}

transferTaxiBot()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
