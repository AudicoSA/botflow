#!/usr/bin/env node
/**
 * Seed Integration Marketplace Data
 *
 * This script populates the integration_marketplace table with 30+ pre-configured integrations.
 *
 * Usage:
 *   npm run build && node dist/scripts/seed-integrations.js
 */

import { supabaseAdmin } from '../config/supabase.js';
import { integrationsSeedData } from '../data/integrations-seed-data.js';

async function seedIntegrations() {
  console.log('🌱 Seeding Integration Marketplace...\n');
  console.log(`Total integrations to seed: ${integrationsSeedData.length}\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const integration of integrationsSeedData) {
    try {
      // Check if integration already exists
      const { data: existing } = await supabaseAdmin
        .from('integration_marketplace')
        .select('id, name')
        .eq('slug', integration.slug)
        .single();

      if (existing) {
        console.log(`⏭️  Skipping "${integration.name}" - already exists`);
        skipCount++;
        continue;
      }

      // Insert integration (using supabaseAdmin to bypass RLS)
      const { error } = await supabaseAdmin
        .from('integration_marketplace')
        .insert({
          name: integration.name,
          slug: integration.slug,
          category: integration.category,
          description: integration.description,
          long_description: integration.long_description,
          icon_url: integration.icon_url,
          requires_auth: integration.requires_auth,
          auth_type: integration.auth_type,
          n8n_workflow_template: integration.n8n_workflow_template || null,
          recommended_for_verticals: integration.recommended_for_verticals,
          pricing_model: integration.pricing_model || 'free',
          popularity_score: 0,
          is_featured: integration.is_featured || false,
          is_direct_integration: false,
          documentation_url: integration.documentation_url,
          setup_instructions: integration.setup_instructions,
          webhook_url: integration.webhook_url,
          supported_features: integration.supported_features || [],
        });

      if (error) {
        console.error(`❌ Error seeding "${integration.name}":`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Seeded "${integration.name}" (${integration.category})`);
        successCount++;
      }
    } catch (error: any) {
      console.error(`❌ Error seeding "${integration.name}":`, error.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Seeding Summary:');
  console.log(`   ✅ Successfully seeded: ${successCount}`);
  console.log(`   ⏭️  Skipped (already exist): ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📦 Total processed: ${integrationsSeedData.length}`);
  console.log('='.repeat(60) + '\n');

  if (errorCount > 0) {
    console.log('⚠️  Some integrations failed to seed. Check errors above.');
    process.exit(1);
  } else {
    console.log('🎉 All integrations seeded successfully!');
    process.exit(0);
  }
}

// Run the seed script
seedIntegrations().catch((error) => {
  console.error('💥 Fatal error during seeding:', error);
  process.exit(1);
});
