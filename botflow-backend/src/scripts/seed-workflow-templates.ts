/**
 * Seed Workflow Templates Script (Phase 3 Week 3)
 *
 * Seeds the workflow_templates table with pre-built templates.
 * Run with: npx tsx src/scripts/seed-workflow-templates.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Path to templates directory
const TEMPLATES_DIR = join(__dirname, '../data/workflow-templates');

interface TemplateFile {
  slug: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  trigger_phrases: string[];
  keywords: string[];
  required_integrations: string[];
  vertical: string | null;
  blueprint: object;
  variables: object[];
  configurable_fields: object[];
}

/**
 * Load all template JSON files from the templates directory
 */
function loadTemplates(): TemplateFile[] {
  const templates: TemplateFile[] = [];

  // Get all category directories
  const categories = readdirSync(TEMPLATES_DIR).filter(dir => {
    const fullPath = join(TEMPLATES_DIR, dir);
    return statSync(fullPath).isDirectory();
  });

  console.log(`Found categories: ${categories.join(', ')}`);

  // Load templates from each category
  for (const category of categories) {
    const categoryPath = join(TEMPLATES_DIR, category);
    const files = readdirSync(categoryPath).filter(file => file.endsWith('.json'));

    for (const file of files) {
      const filePath = join(categoryPath, file);
      try {
        const content = readFileSync(filePath, 'utf-8');
        const template = JSON.parse(content) as TemplateFile;

        // Validate required fields
        if (!template.slug || !template.name || !template.blueprint) {
          console.warn(`  Skipping ${file}: Missing required fields`);
          continue;
        }

        templates.push(template);
        console.log(`  Loaded: ${template.slug} (${template.name})`);
      } catch (error) {
        console.error(`  Error loading ${file}:`, error);
      }
    }
  }

  return templates;
}

/**
 * Seed templates to database
 */
async function seedTemplates(templates: TemplateFile[]): Promise<void> {
  console.log(`\nSeeding ${templates.length} templates to database...`);

  let successCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  for (const template of templates) {
    try {
      // Check if template already exists
      const { data: existing } = await supabase
        .from('workflow_templates')
        .select('id, slug')
        .eq('slug', template.slug)
        .single();

      const templateData = {
        slug: template.slug,
        name: template.name,
        category: template.category,
        description: template.description || null,
        icon: template.icon || 'workflow',
        trigger_phrases: template.trigger_phrases || [],
        keywords: template.keywords || [],
        required_integrations: template.required_integrations || [],
        vertical: template.vertical || null,
        blueprint: template.blueprint,
        variables: template.variables || [],
        configurable_fields: template.configurable_fields || [],
        is_public: true
      };

      if (existing) {
        // Update existing template
        const { error } = await supabase
          .from('workflow_templates')
          .update(templateData)
          .eq('slug', template.slug);

        if (error) {
          console.error(`  Error updating ${template.slug}:`, error.message);
          errorCount++;
        } else {
          console.log(`  Updated: ${template.slug}`);
          updateCount++;
        }
      } else {
        // Insert new template
        const { error } = await supabase
          .from('workflow_templates')
          .insert(templateData);

        if (error) {
          console.error(`  Error inserting ${template.slug}:`, error.message);
          errorCount++;
        } else {
          console.log(`  Inserted: ${template.slug}`);
          successCount++;
        }
      }
    } catch (error) {
      console.error(`  Error processing ${template.slug}:`, error);
      errorCount++;
    }
  }

  console.log('\n--- Seed Summary ---');
  console.log(`New templates: ${successCount}`);
  console.log(`Updated: ${updateCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total processed: ${templates.length}`);
}

/**
 * Verify seeded templates
 */
async function verifyTemplates(): Promise<void> {
  console.log('\nVerifying templates in database...');

  const { data, error, count } = await supabase
    .from('workflow_templates')
    .select('slug, name, category, is_public', { count: 'exact' })
    .eq('is_public', true)
    .order('category')
    .order('name');

  if (error) {
    console.error('Error verifying templates:', error.message);
    return;
  }

  console.log(`\nFound ${count} public templates:\n`);

  // Group by category
  const byCategory: Record<string, typeof data> = {};
  for (const template of data || []) {
    if (!byCategory[template.category]) {
      byCategory[template.category] = [];
    }
    byCategory[template.category].push(template);
  }

  for (const [category, templates] of Object.entries(byCategory)) {
    console.log(`${category.toUpperCase()} (${templates.length}):`);
    for (const t of templates) {
      console.log(`  - ${t.name} (${t.slug})`);
    }
    console.log('');
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('=== Workflow Templates Seed Script ===\n');

  // Check if templates table exists
  const { error: tableError } = await supabase
    .from('workflow_templates')
    .select('id')
    .limit(1);

  if (tableError && tableError.message.includes('does not exist')) {
    console.error('Error: workflow_templates table does not exist.');
    console.error('Please run the migration first:');
    console.error('  SQL file: src/migrations/003_workflow_templates.sql');
    process.exit(1);
  }

  // Load templates from files
  console.log('Loading templates from:', TEMPLATES_DIR);
  const templates = loadTemplates();

  if (templates.length === 0) {
    console.error('No templates found to seed');
    process.exit(1);
  }

  // Seed to database
  await seedTemplates(templates);

  // Verify
  await verifyTemplates();

  console.log('\nDone!');
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
