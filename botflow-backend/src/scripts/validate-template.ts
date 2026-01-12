/**
 * Template Validation Script
 *
 * Validates that template JSON files match the TypeScript type definitions.
 * Run this before seeding templates to catch errors early.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { CreateTemplatePayload, TemplateField, ConversationFlow } from '../types/template.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validate a template field definition
 */
function validateField(fieldName: string, field: any): string[] {
  const errors: string[] = [];

  if (!field.type) {
    errors.push(`Field "${fieldName}": missing "type" property`);
  } else {
    const validTypes = ['text', 'textarea', 'number', 'select', 'multiselect', 'time', 'json'];
    if (!validTypes.includes(field.type)) {
      errors.push(`Field "${fieldName}": invalid type "${field.type}". Must be one of: ${validTypes.join(', ')}`);
    }
  }

  if (!field.label) {
    errors.push(`Field "${fieldName}": missing "label" property`);
  }

  if (field.required === undefined) {
    errors.push(`Field "${fieldName}": missing "required" property`);
  }

  // Validate select/multiselect have options
  if ((field.type === 'select' || field.type === 'multiselect') &&
      (!field.validation || !field.validation.options || !Array.isArray(field.validation.options))) {
    errors.push(`Field "${fieldName}": select/multiselect fields must have validation.options array`);
  }

  return errors;
}

/**
 * Validate conversation flow structure
 */
function validateConversationFlow(flow: any): string[] {
  const errors: string[] = [];

  if (!flow.systemPrompt || typeof flow.systemPrompt !== 'string') {
    errors.push('conversation_flow: missing or invalid "systemPrompt"');
  }

  if (flow.welcomeMessage && typeof flow.welcomeMessage !== 'string') {
    errors.push('conversation_flow: "welcomeMessage" must be a string');
  }

  if (flow.exampleConversations) {
    if (!Array.isArray(flow.exampleConversations)) {
      errors.push('conversation_flow: "exampleConversations" must be an array');
    } else {
      flow.exampleConversations.forEach((conv: any, index: number) => {
        if (!conv.customer || !conv.bot) {
          errors.push(`conversation_flow: exampleConversations[${index}] must have "customer" and "bot" properties`);
        }
      });
    }
  }

  if (flow.rules && !Array.isArray(flow.rules)) {
    errors.push('conversation_flow: "rules" must be an array');
  }

  if (flow.intents && typeof flow.intents !== 'object') {
    errors.push('conversation_flow: "intents" must be an object');
  } else if (flow.intents) {
    Object.entries(flow.intents).forEach(([intentName, intent]: [string, any]) => {
      if (!intent.triggers || !Array.isArray(intent.triggers)) {
        errors.push(`conversation_flow: intent "${intentName}" must have "triggers" array`);
      }
      if (!intent.response || typeof intent.response !== 'string') {
        errors.push(`conversation_flow: intent "${intentName}" must have "response" string`);
      }
    });
  }

  if (flow.handoffConditions && !Array.isArray(flow.handoffConditions)) {
    errors.push('conversation_flow: "handoffConditions" must be an array');
  }

  return errors;
}

/**
 * Validate a template JSON file
 */
function validateTemplate(templatePath: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check file exists
  if (!fs.existsSync(templatePath)) {
    return { valid: false, errors: [`File not found: ${templatePath}`] };
  }

  // Parse JSON
  let template: any;
  try {
    const content = fs.readFileSync(templatePath, 'utf-8');
    template = JSON.parse(content);
  } catch (error) {
    return { valid: false, errors: [`Invalid JSON: ${error}`] };
  }

  // Validate required top-level fields
  const requiredFields = ['name', 'vertical', 'tier', 'description', 'required_fields', 'conversation_flow'];
  for (const field of requiredFields) {
    if (!template[field]) {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  // Validate tier
  if (template.tier && ![1, 2, 3].includes(template.tier)) {
    errors.push(`Invalid tier: ${template.tier}. Must be 1, 2, or 3`);
  }

  // Validate required_fields
  if (template.required_fields) {
    if (typeof template.required_fields !== 'object') {
      errors.push('required_fields must be an object');
    } else {
      Object.entries(template.required_fields).forEach(([fieldName, field]) => {
        const fieldErrors = validateField(fieldName, field);
        errors.push(...fieldErrors);
      });
    }
  }

  // Validate conversation_flow
  if (template.conversation_flow) {
    const flowErrors = validateConversationFlow(template.conversation_flow);
    errors.push(...flowErrors);
  }

  // Validate example_prompts
  if (template.example_prompts && !Array.isArray(template.example_prompts)) {
    errors.push('example_prompts must be an array');
  }

  // Validate integrations
  if (template.integrations && !Array.isArray(template.integrations)) {
    errors.push('integrations must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Main validation function
 */
async function validateTemplates() {
  console.log('🔍 Validating template files...\n');

  const dataDir = path.join(__dirname, '../data');
  const templateFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

  if (templateFiles.length === 0) {
    console.log('⚠️  No template JSON files found in src/data/');
    return;
  }

  let allValid = true;

  for (const file of templateFiles) {
    const templatePath = path.join(dataDir, file);
    console.log(`Validating: ${file}`);

    const result = validateTemplate(templatePath);

    if (result.valid) {
      console.log('✅ Valid\n');
    } else {
      console.log('❌ Invalid:');
      result.errors.forEach(error => console.log(`   - ${error}`));
      console.log('');
      allValid = false;
    }
  }

  if (allValid) {
    console.log('✅ All templates are valid!');
  } else {
    console.log('❌ Some templates have errors. Please fix them before seeding.');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validateTemplates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

export { validateTemplates, validateTemplate };
