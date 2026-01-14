/**
 * Check Kenny's user account details
 */

import { supabaseAdmin } from '../config/supabase.js';

async function checkKennyUser() {
    const email = 'kenny@audico.co.za';

    console.log('========================================');
    console.log('Check Kenny User Account');
    console.log('========================================\n');

    // Get all users with this email (should be only 1)
    const { data: userData, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
        console.error('❌ Error listing users:', error.message);
        return;
    }

    const kennyUsers = userData.users.filter((u: any) => u.email === email);

    console.log(`Found ${kennyUsers.length} user(s) with email: ${email}\n`);

    kennyUsers.forEach((user: any, index: number) => {
        console.log(`User ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Created: ${user.created_at}`);
        console.log(`  Last Sign In: ${user.last_sign_in_at}`);
        console.log(`  Confirmed: ${user.confirmed_at ? 'Yes' : 'No'}`);
        console.log(`  Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log();
    });

    if (kennyUsers.length > 1) {
        console.log('⚠️  WARNING: Multiple users with same email found!');
        console.log('This can happen if deletion didnt complete properly.');
        console.log('Supabase should prevent this, but sometimes it happens.\n');
    }

    // Check organization for the user
    if (kennyUsers.length > 0) {
        const userId = kennyUsers[0].id;

        const { data: memberData } = await supabaseAdmin
            .from('organization_members')
            .select('organization_id, organizations(name)')
            .eq('user_id', userId);

        if (memberData && memberData.length > 0) {
            console.log('Organization:');
            memberData.forEach((m: any) => {
                console.log(`  - ${m.organizations.name} (${m.organization_id})`);
            });
        } else {
            console.log('Organization: None');
        }

        console.log();

        // Check WhatsApp accounts
        const { data: orgs } = await supabaseAdmin
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', userId);

        if (orgs && orgs.length > 0) {
            const orgId = orgs[0].organization_id;
            const { data: waData } = await supabaseAdmin
                .from('whatsapp_accounts')
                .select('*')
                .eq('organization_id', orgId);

            if (waData && waData.length > 0) {
                console.log('WhatsApp Accounts:');
                waData.forEach((wa: any) => {
                    console.log(`  - ${wa.display_name}`);
                    console.log(`    ID: ${wa.id}`);
                    console.log(`    Phone: ${wa.phone_number}`);
                    console.log(`    Status: ${wa.status}`);
                });
            } else {
                console.log('WhatsApp Accounts: None');
            }
        }
    }
}

checkKennyUser()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
