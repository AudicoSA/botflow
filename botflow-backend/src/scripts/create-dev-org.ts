/**
 * Create organization for kenny@audico.co.za and link WhatsApp account
 */

import { supabaseAdmin } from '../config/supabase.js';

async function createDevOrg() {
    const email = 'kenny@audico.co.za';

    console.log('========================================');
    console.log('Setup Kenny Account');
    console.log('========================================\n');

    try {
        // Step 1: Find user
        console.log('[1/4] Looking up user...');
        const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
        const user = userData.users.find((u: any) => u.email === email);

        if (!user) {
            console.error(`❌ User not found: ${email}`);
            return;
        }

        console.log(`✓ User found: ${user.id}\n`);

        // Step 2: Check for existing organization
        console.log('[2/4] Checking for existing organization...');
        const { data: existingMembers } = await supabaseAdmin
            .from('organization_members')
            .select('organization_id, organizations(*)')
            .eq('user_id', user.id);

        let orgId: string;

        if (existingMembers && existingMembers.length > 0) {
            orgId = existingMembers[0].organization_id;
            console.log(`✓ Organization already exists: ${orgId}`);
            console.log(`  Name: ${(existingMembers[0].organizations as any).name}\n`);
        } else {
            // Create new organization
            console.log('Creating new organization...');
            const { data: newOrg, error: orgError } = await supabaseAdmin
                .from('organizations')
                .insert({
                    name: 'Kenny Organization',
                    slug: 'kenny-org',
                    plan: 'starter',
                })
                .select()
                .single();

            if (orgError || !newOrg) {
                console.error('❌ Failed to create organization:', orgError?.message);
                return;
            }

            orgId = newOrg.id;
            console.log(`✓ Organization created: ${orgId}`);
            console.log(`  Name: ${newOrg.name}\n`);

            // Add user as organization owner
            console.log('Adding user as organization owner...');
            const { error: memberError } = await supabaseAdmin
                .from('organization_members')
                .insert({
                    organization_id: orgId,
                    user_id: user.id,
                    role: 'owner',
                });

            if (memberError) {
                console.error('❌ Failed to add user to organization:', memberError.message);
                return;
            }

            console.log('✓ User added as owner\n');
        }

        // Step 3: Check for WhatsApp account
        console.log('[3/4] Checking for WhatsApp account...');
        const { data: existingWA } = await supabaseAdmin
            .from('whatsapp_accounts')
            .select('*')
            .eq('organization_id', orgId);

        const waData = {
            organization_id: orgId,
            phone_number: '+15551234567',
            display_name: 'Kenny WhatsApp Business',
            status: 'active',
            provider: 'twilio',
        };

        if (existingWA && existingWA.length > 0) {
            // Update existing
            const { data: updated, error: updateError } = await supabaseAdmin
                .from('whatsapp_accounts')
                .update(waData)
                .eq('id', existingWA[0].id)
                .select()
                .single();

            if (updateError) {
                console.error('❌ Failed to update WhatsApp account:', updateError.message);
                return;
            }

            console.log('✓ Updated existing WhatsApp account');
            console.log(`  ID: ${updated.id}`);
            console.log(`  Phone: ${updated.phone_number}`);
            console.log(`  Status: ${updated.status}\n`);
        } else {
            // Create new
            const { data: created, error: insertError } = await supabaseAdmin
                .from('whatsapp_accounts')
                .insert(waData)
                .select()
                .single();

            if (insertError) {
                console.error('❌ Failed to create WhatsApp account:', insertError.message);
                return;
            }

            console.log('✓ Created new WhatsApp account');
            console.log(`  ID: ${created.id}`);
            console.log(`  Phone: ${created.phone_number}`);
            console.log(`  Status: ${created.status}\n`);
        }

        // Step 4: Verify login query
        console.log('[4/4] Verifying login query...');
        const { data: waData2 } = await supabaseAdmin
            .from('whatsapp_accounts')
            .select('*')
            .eq('organization_id', orgId)
            .eq('status', 'active')
            .limit(1);

        if (waData2 && waData2.length > 0) {
            console.log('✓ Login will return WhatsApp account:');
            console.log(`  ID: ${waData2[0].id}`);
            console.log(`  Phone: ${waData2[0].phone_number}\n`);
        }

        console.log('========================================');
        console.log('SUCCESS! Account is ready!');
        console.log('========================================\n');
        console.log('Next steps:');
        console.log('1. Clear browser cache (Ctrl+Shift+Delete)');
        console.log('2. Open incognito window (Ctrl+Shift+N)');
        console.log('3. Login at https://botflow-r9q3.vercel.app/login');
        console.log('4. Try creating a bot!\n');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run
createDevOrg()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
