import { supabaseAdmin } from '../config/supabase.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedTemplates() {
  console.log('🌱 Seeding templates...\n');

  // Get all JSON files from data directory
  const dataDir = path.join(__dirname, '../data');

  if (!fs.existsSync(dataDir)) {
    console.error('❌ Data directory not found:', dataDir);
    throw new Error('Data directory not found');
  }

  const templateFiles = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));

  if (templateFiles.length === 0) {
    console.log('⚠️  No template files found in data directory');
    return;
  }

  console.log(`📁 Found ${templateFiles.length} template file(s)\n`);

  const results = [];

  try {
    for (const templateFile of templateFiles) {
      const templatePath = path.join(dataDir, templateFile);
      const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));

      console.log(`Processing: ${templateFile}`);

      // Check if template already exists
      const { data: existing } = await supabaseAdmin
        .from('bot_templates')
        .select('id, name')
        .eq('vertical', template.vertical)
        .eq('name', template.name)
        .single();

      if (existing) {
        console.log(`ℹ️  Template already exists: ${existing.name}`);
        console.log(`   ID: ${existing.id}`);
        console.log('   ✨ Updating existing template...');

        const { data: updated, error: updateError } = await supabaseAdmin
          .from('bot_templates')
          .update(template)
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          console.error(`❌ Error updating template ${template.name}:`, updateError);
          throw updateError;
        }

        console.log(`✅ Successfully updated: ${updated.name}`);
        console.log(`   Vertical: ${updated.vertical} | Tier: ${updated.tier} | Published: ${updated.is_published}\n`);
        results.push({ action: 'updated', template: updated });
      } else {
        // Insert new template
        const { data, error } = await supabaseAdmin
          .from('bot_templates')
          .insert(template)
          .select()
          .single();

        if (error) {
          console.error(`❌ Error seeding template ${template.name}:`, error);
          throw error;
        }

        console.log(`✅ Successfully created: ${data.name}`);
        console.log(`   ID: ${data.id}`);
        console.log(`   Vertical: ${data.vertical} | Tier: ${data.tier} | Published: ${data.is_published}\n`);
        results.push({ action: 'created', template: data });
      }
    }

    return results;
  } catch (error) {
    console.error('❌ Failed to seed templates:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTemplates()
    .then(() => {
      console.log('\n✅ Template seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Template seeding failed:', error);
      process.exit(1);
    });
}

export { seedTemplates };
