/**
 * Manually create/update WhatsApp account for kenny@audico.co.za
 * Use this as a workaround if the integration endpoint isn't working
 */

import { supabaseAdmin } from '../config/supabase.js';

async function createDevWhatsapp() {
    const email = 'kenny@audico.co.za';

    console.log('========================================');
    console.log('Create WhatsApp Account for Kenny');
    console.log('========================================\n');

    try {
        // Step 1: Find user
        console.log('[1/3] Looking up user...');
        const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
        const user = userData.users.find((u: any) => u.email === email);

        if (!user) {
            console.error(`❌ User not found: ${email}`);
            return;
        }

        console.log(`✓ User found: ${user.id}\n`);

        // Step 2: Find organization
        console.log('[2/3] Looking up organization...');
        const { data: memberData, error: memberError } = await supabaseAdmin
            .from('organization_members')
            .select('organization_id, organizations(*)')
            .eq('user_id', user.id);

        if (memberError || !memberData || memberData.length === 0) {
            console.error('❌ Organization not found:', memberError?.message || 'No organizations');
            return;
        }

        // Take the first organization
        const member = memberData[0];
        const orgId = member.organization_id;
        console.log(`✓ Organization found: ${orgId}`);
        console.log(`  Name: ${(member.organizations as any).name}\n`);

        // Step 3: Create/Update WhatsApp account
        console.log('[3/3] Creating/updating WhatsApp account...');

        // Check if one already exists
        const { data: existingAccounts } = await supabaseAdmin
            .from('whatsapp_accounts')
            .select('*')
            .eq('organization_id', orgId);

        const whatsappData = {
            organization_id: orgId,
            phone_number: '+15551234567', // Placeholder - you can update this later
            display_name: 'Kenny WhatsApp Business',
            status: 'active',
            provider: 'twilio',
        };

        if (existingAccounts && existingAccounts.length > 0) {
            // Update existing
            const existing = existingAccounts[0];
            const { data: updated, error: updateError } = await supabaseAdmin
                .from('whatsapp_accounts')
                .update(whatsappData)
                .eq('id', existing.id)
                .select()
                .single();

            if (updateError) {
                console.error('❌ Failed to update:', updateError.message);
                return;
            }

            console.log('✓ Updated existing WhatsApp account');
            console.log(`  ID: ${updated.id}`);
            console.log(`  Phone: ${updated.phone_number}`);
            console.log(`  Status: ${updated.status}`);
            console.log(`  Provider: ${updated.provider}\n`);
        } else {
            // Create new
            const { data: created, error: insertError } = await supabaseAdmin
                .from('whatsapp_accounts')
                .insert(whatsappData)
                .select()
                .single();

            if (insertError) {
                console.error('❌ Failed to create:', insertError.message);
                return;
            }

            console.log('✓ Created new WhatsApp account');
            console.log(`  ID: ${created.id}`);
            console.log(`  Phone: ${created.phone_number}`);
            console.log(`  Status: ${created.status}`);
            console.log(`  Provider: ${created.provider}\n`);
        }

        // Step 4: Test login endpoint simulation
        console.log('[4/4] Testing login query...');
        const { data: waData, error: waError } = await supabaseAdmin
            .from('whatsapp_accounts')
            .select('*')
            .eq('organization_id', orgId)
            .eq('status', 'active')
            .limit(1);

        if (waError) {
            console.error('❌ Query failed:', waError.message);
            return;
        }

        if (waData && waData.length > 0) {
            console.log('✓ Login endpoint will return:');
            console.log(`  whatsappAccount.id: ${waData[0].id}`);
            console.log(`  whatsappAccount.phone_number: ${waData[0].phone_number}`);
            console.log(`  whatsappAccount.status: ${waData[0].status}\n`);
        } else {
            console.error('❌ No active WhatsApp account found\n');
        }

        console.log('========================================');
        console.log('SUCCESS!');
        console.log('========================================\n');
        console.log('Next steps:');
        console.log('1. Clear browser cache (Ctrl+Shift+Delete)');
        console.log('2. Open incognito window (Ctrl+Shift+N)');
        console.log('3. Login at https://botflow-r9q3.vercel.app/login');
        console.log('4. Check console: localStorage.getItem("botflow_whatsappAccountId")');
        console.log('5. Should see:', waData && waData.length > 0 ? waData[0].id : 'a UUID');
        console.log('6. Try creating a bot!\n');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run
createDevWhatsapp()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
