/**
 * Verify that Kenny's organization and WhatsApp account exist in Supabase
 */

import { supabaseAdmin } from '../config/supabase.js';

async function verifyProductionData() {
    const email = 'kenny@audico.co.za';

    console.log('========================================');
    console.log('Verify Production Data');
    console.log('========================================\n');

    try {
        // Step 1: Find user
        console.log('[1/4] Looking up user...');
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();

        if (userError) {
            console.error('❌ Failed to list users:', userError.message);
            return;
        }

        const user = userData.users.find((u: any) => u.email === email);

        if (!user) {
            console.error(`❌ User not found: ${email}`);
            return;
        }

        console.log(`✓ User found: ${user.id}\n`);

        // Step 2: Check organization membership
        console.log('[2/4] Checking organization membership...');
        const { data: memberData, error: memberError } = await supabaseAdmin
            .from('organization_members')
            .select('organization_id, role, organizations(id, name, slug, plan)')
            .eq('user_id', user.id);

        if (memberError) {
            console.error('❌ Query failed:', memberError.message);
            return;
        }

        if (!memberData || memberData.length === 0) {
            console.error('❌ No organization membership found');
            return;
        }

        const member = memberData[0];
        console.log('✓ Organization membership found:');
        console.log(`  Organization ID: ${member.organization_id}`);
        console.log(`  Role: ${member.role}`);
        console.log(`  Org Name: ${(member.organizations as any).name}\n`);

        // Step 3: Check WhatsApp account
        console.log('[3/4] Checking WhatsApp account...');
        const { data: waData, error: waError } = await supabaseAdmin
            .from('whatsapp_accounts')
            .select('*')
            .eq('organization_id', member.organization_id);

        if (waError) {
            console.error('❌ Query failed:', waError.message);
            return;
        }

        console.log(`Found ${waData?.length || 0} WhatsApp account(s):\n`);

        if (!waData || waData.length === 0) {
            console.error('❌ No WhatsApp accounts found for this organization');
            return;
        }

        waData.forEach((wa: any, index: number) => {
            console.log(`Account ${index + 1}:`);
            console.log(`  ID: ${wa.id}`);
            console.log(`  Phone: ${wa.phone_number}`);
            console.log(`  Display Name: ${wa.display_name}`);
            console.log(`  Status: ${wa.status}`);
            console.log(`  Provider: ${wa.provider || 'NOT SET'}`);
            console.log(`  Created: ${wa.created_at}`);
            console.log();
        });

        // Step 4: Test login query
        console.log('[4/4] Testing login query (exactly as login endpoint does)...');
        const { data: loginWaData, error: loginWaError } = await supabaseAdmin
            .from('whatsapp_accounts')
            .select('*')
            .eq('organization_id', member.organization_id)
            .eq('status', 'active')
            .limit(1);

        if (loginWaError) {
            console.error('❌ Login query failed:', loginWaError.message);
            return;
        }

        if (loginWaData && loginWaData.length > 0) {
            console.log('✓ Login query SUCCESS - would return:');
            console.log(`  ID: ${loginWaData[0].id}`);
            console.log(`  Phone: ${loginWaData[0].phone_number}`);
            console.log(`  Status: ${loginWaData[0].status}\n`);
        } else {
            console.error('❌ Login query returned NO RESULTS');
            console.error('   This explains why whatsappAccount is null in login response\n');

            // Debug why
            const activeAccounts = waData.filter((wa: any) => wa.status === 'active');
            if (activeAccounts.length === 0) {
                console.error('   Reason: No accounts have status="active"');
                console.error('   Current statuses:', waData.map((wa: any) => wa.status).join(', '));
            }
        }

        console.log('========================================');
        console.log('Verification Complete');
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run
verifyProductionData()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
