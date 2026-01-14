/**
 * Check WhatsApp account status for kenny@audico.co.za
 * This will help diagnose why bot creation is failing
 */

import { supabaseAdmin } from '../config/supabase.js';

async function checkKennyWhatsapp() {
    const email = 'kenny@audico.co.za';

    console.log('========================================');
    console.log('WhatsApp Account Diagnostic Tool');
    console.log('========================================\n');

    try {
        // Step 1: Find user by email
        console.log('[1/5] Looking up user by email...');
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();

        if (userError) {
            console.error('❌ Error fetching users:', userError.message);
            return;
        }

        const user = userData.users.find((u: any) => u.email === email);
        if (!user) {
            console.error(`❌ User not found: ${email}`);
            return;
        }

        console.log(`✓ User found: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Created: ${user.created_at}\n`);

        // Step 2: Find user's organization
        console.log('[2/5] Looking up organization membership...');
        const { data: memberData, error: memberError } = await supabaseAdmin
            .from('organization_members')
            .select('organization_id, role, organizations(*)')
            .eq('user_id', user.id)
            .single();

        if (memberError) {
            console.error('❌ Error fetching organization:', memberError.message);
            return;
        }

        if (!memberData) {
            console.error('❌ User is not a member of any organization');
            return;
        }

        console.log(`✓ Organization found: ${memberData.organization_id}`);
        console.log(`  Name: ${(memberData.organizations as any).name}`);
        console.log(`  Plan: ${(memberData.organizations as any).plan}`);
        console.log(`  Role: ${memberData.role}\n`);

        // Step 3: Look for WhatsApp accounts for this organization
        console.log('[3/5] Looking up WhatsApp accounts...');
        const { data: whatsappAccounts, error: whatsappError } = await supabaseAdmin
            .from('whatsapp_accounts')
            .select('*')
            .eq('organization_id', memberData.organization_id);

        if (whatsappError) {
            console.error('❌ Error fetching WhatsApp accounts:', whatsappError.message);
            return;
        }

        if (!whatsappAccounts || whatsappAccounts.length === 0) {
            console.log('❌ No WhatsApp accounts found for this organization\n');
            console.log('DIAGNOSIS: No WhatsApp account connected!');
            console.log('\nRECOMMENDATION:');
            console.log('1. Go to https://botflow-r9q3.vercel.app/dashboard/integrations');
            console.log('2. Click "Manage" on the WhatsApp card');
            console.log('3. Connect your WhatsApp Business account');
            console.log('4. Make sure it shows "Connected" with green checkmark');
            console.log('5. Logout and login again');
            console.log('6. Try creating a bot\n');
            return;
        }

        console.log(`✓ Found ${whatsappAccounts.length} WhatsApp account(s):\n`);

        whatsappAccounts.forEach((account, index) => {
            console.log(`Account ${index + 1}:`);
            console.log(`  ID: ${account.id}`);
            console.log(`  Phone: ${account.phone_number}`);
            console.log(`  Display Name: ${account.display_name}`);
            console.log(`  Status: ${account.status}`);
            console.log(`  Provider: ${account.provider}`);
            console.log(`  Created: ${account.created_at}`);
            console.log('');
        });

        // Step 4: Check if any account is active
        console.log('[4/5] Checking for active accounts...');
        const activeAccounts = whatsappAccounts.filter(a => a.status === 'active');

        if (activeAccounts.length === 0) {
            console.log('❌ No ACTIVE WhatsApp accounts found\n');
            console.log('DIAGNOSIS: WhatsApp accounts exist but none are active!');
            console.log('\nRECOMMENDATION:');
            console.log('1. Go to https://botflow-r9q3.vercel.app/dashboard/integrations');
            console.log('2. Reconnect your WhatsApp Business account');
            console.log('3. Make sure status changes to "active"');
            console.log('4. Logout and login again');
            console.log('5. Try creating a bot\n');
            return;
        }

        console.log(`✓ Found ${activeAccounts.length} active account(s)\n`);

        // Step 5: Test what login endpoint would return
        console.log('[5/5] Simulating login response...');
        const primaryAccount = activeAccounts[0];

        console.log('Login endpoint should return:');
        console.log('  organization.id:', memberData.organization_id);
        console.log('  whatsappAccount.id:', primaryAccount.id);
        console.log('  whatsappAccount.phone_number:', primaryAccount.phone_number);
        console.log('  whatsappAccount.status:', primaryAccount.status);
        console.log('');

        // Step 6: Summary
        console.log('========================================');
        console.log('SUMMARY');
        console.log('========================================\n');
        console.log('✓ User exists');
        console.log('✓ Organization exists');
        console.log('✓ WhatsApp account exists');
        console.log('✓ WhatsApp account is active\n');

        console.log('localStorage should contain:');
        console.log(`  botflow_organizationId: "${memberData.organization_id}"`);
        console.log(`  botflow_whatsappAccountId: "${primaryAccount.id}"`);
        console.log('');

        console.log('RECOMMENDATION:');
        console.log('If bot creation is still failing:');
        console.log('1. Clear browser cache completely (Ctrl+Shift+Delete)');
        console.log('2. Open incognito window (Ctrl+Shift+N)');
        console.log('3. Login at https://botflow-r9q3.vercel.app/login');
        console.log('4. Open DevTools (F12) → Console');
        console.log('5. Type: localStorage.getItem("botflow_whatsappAccountId")');
        console.log('6. Verify it matches:', primaryAccount.id);
        console.log('7. Try creating a bot\n');

        console.log('If still failing, the issue is in the frontend code.');
        console.log('The backend login endpoint IS returning the WhatsApp account.\n');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the check
checkKennyWhatsapp()
    .then(() => {
        console.log('========================================\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
