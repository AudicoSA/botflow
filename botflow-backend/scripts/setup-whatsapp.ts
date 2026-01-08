
import { supabaseAdmin } from '../src/config/supabase.js';
import { getDevUser } from '../src/utils/dev-user.js';
import { logger } from '../src/config/logger.js';

const DATA = {
    phoneNumber: '+27631443274',
    channelId: 'e605685',
    // workspaceId: process.env.BIRD_WORKSPACE_ID // Will use from env
};

async function setupWhatsApp() {
    try {
        logger.info('Starting WhatsApp Setup...');

        // 1. Get Dev User
        const user = await getDevUser(logger);
        logger.info({ userId: user.id }, 'Got Dev User');

        // 2. Find or Create Organization
        let { data: orgMember } = await supabaseAdmin
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)
            .single();

        let orgId = orgMember?.organization_id;

        if (!orgId) {
            logger.info('No organization found for dev user. Creating one...');

            // Create Org
            const { data: newOrg, error: orgError } = await supabaseAdmin
                .from('organizations')
                .insert({
                    name: 'Dev Organization',
                    slug: `dev-org-${Date.now()}`,
                    plan: 'growth'
                })
                .select()
                .single();

            if (orgError) throw orgError;
            orgId = newOrg.id;

            // Link User
            const { error: memberError } = await supabaseAdmin
                .from('organization_members')
                .insert({
                    organization_id: orgId,
                    user_id: user.id,
                    role: 'owner'
                });

            if (memberError) throw memberError;
            logger.info({ orgId }, 'Created Dev Organization');
        } else {
            logger.info({ orgId }, 'Found existing Organization');
        }

        // 3. Create/Update WhatsApp Account
        // Check if exists
        const { data: existingAccount } = await supabaseAdmin
            .from('whatsapp_accounts')
            .select('*')
            .eq('bird_channel_id', DATA.channelId)
            .single();

        let accountId;

        if (existingAccount) {
            logger.info({ accountId: existingAccount.id }, 'WhatsApp account already exists. Updating...');
            const { data: updated, error: updateError } = await supabaseAdmin
                .from('whatsapp_accounts')
                .update({
                    phone_number: DATA.phoneNumber,
                    organization_id: orgId, // Ensure it's linked to our org
                    status: 'active'
                })
                .eq('id', existingAccount.id)
                .select()
                .single();

            if (updateError) throw updateError;
            accountId = updated.id;
        } else {
            logger.info('Creating new WhatsApp account...');
            const { data: newAccount, error: createError } = await supabaseAdmin
                .from('whatsapp_accounts')
                .insert({
                    organization_id: orgId,
                    phone_number: DATA.phoneNumber,
                    bird_channel_id: DATA.channelId,
                    bird_workspace_id: process.env.BIRD_WORKSPACE_ID,
                    status: 'active',
                    display_name: 'Dev WhatsApp'
                })
                .select()
                .single();

            if (createError) throw createError;
            accountId = newAccount.id;
        }

        logger.info({ accountId }, '✅ WhatsApp Setup Complete');

        // 4. Update latest Bot to use this account?
        // Let's just print the ID so we can use it manually or let the user know.
        console.log('\n---------------------------------------------------');
        console.log('WHATSAPP ACCOUNT ID:', accountId);
        console.log('ORGANIZATION ID:', orgId);
        console.log('---------------------------------------------------\n');

    } catch (error) {
        logger.error({ error }, 'Setup failed');
        process.exit(1);
    }
}

setupWhatsApp();
