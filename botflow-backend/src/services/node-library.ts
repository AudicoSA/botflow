/**
 * Node Library Service (Phase 2 Week 2)
 *
 * This service manages the library of reusable workflow nodes.
 * Each node is a building block that can be used in workflows.
 *
 * Responsibilities:
 * - Load node definitions from JSON
 * - Provide node lookup by type
 * - Validate node configurations
 * - List available nodes by category
 */

import { NodeDefinition, NodeCategory, BlueprintNode, ValidationResult, ValidationError } from '../types/workflow.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class NodeLibrary {
  private nodes: Map<string, NodeDefinition> = new Map();
  private loaded: boolean = false;

  /**
   * Load node definitions from JSON file
   */
  async loadNodes(filePath?: string): Promise<void> {
    const defaultPath = join(__dirname, '../data/node-library.json');
    const path = filePath || defaultPath;

    try {
      const content = await readFile(path, 'utf-8');
      const data = JSON.parse(content);

      // Load nodes into memory
      for (const [type, definition] of Object.entries(data.nodes)) {
        this.nodes.set(type, definition as NodeDefinition);
      }

      this.loaded = true;
      console.log(`✅ Node Library loaded: ${this.nodes.size} nodes`);
    } catch (error) {
      console.error('Failed to load node library:', error);
      throw new Error('Node library initialization failed');
    }
  }

  /**
   * Get a node definition by type
   */
  getNode(type: string): NodeDefinition | undefined {
    this.ensureLoaded();
    return this.nodes.get(type);
  }

  /**
   * List all nodes, optionally filtered by category
   */
  listNodes(category?: NodeCategory): NodeDefinition[] {
    this.ensureLoaded();
    const allNodes = Array.from(this.nodes.values());

    if (category) {
      return allNodes.filter(node => node.category === category);
    }

    return allNodes;
  }

  /**
   * Check if a node type exists
   */
  hasNode(type: string): boolean {
    this.ensureLoaded();
    return this.nodes.has(type);
  }

  /**
   * Validate a Blueprint node against its definition
   */
  validateNode(node: BlueprintNode): ValidationResult {
    this.ensureLoaded();

    const errors: ValidationError[] = [];
    const warnings: any[] = [];

    // Check if node type exists
    const definition = this.nodes.get(node.type);
    if (!definition) {
      errors.push({
        node_id: node.id,
        message: `Unknown node type: ${node.type}`,
        code: 'UNKNOWN_NODE_TYPE'
      });
      return { valid: false, errors, warnings };
    }

    // Validate required inputs
    for (const input of definition.inputs) {
      if (input.required && !(input.name in node.config)) {
        errors.push({
          node_id: node.id,
          field: input.name,
          message: `Missing required field: ${input.label}`,
          code: 'MISSING_REQUIRED_FIELD'
        });
      }

      // Validate input type
      const value = node.config[input.name];
      if (value !== undefined) {
        const typeError = this.validateInputType(input.type, value, input.name);
        if (typeError) {
          errors.push({
            node_id: node.id,
            field: input.name,
            ...typeError
          });
        }
      }

      // Validate against rules
      if (input.validation && value !== undefined) {
        for (const rule of input.validation) {
          const ruleError = this.validateRule(rule, value, input.name);
          if (ruleError) {
            errors.push({
              node_id: node.id,
              field: input.name,
              ...ruleError
            });
          }
        }
      }

      // Validate enum options
      if (input.options && value !== undefined) {
        if (input.type === 'select' && !input.options.includes(value)) {
          errors.push({
            node_id: node.id,
            field: input.name,
            message: `Invalid option for ${input.label}. Must be one of: ${input.options.join(', ')}`,
            code: 'INVALID_OPTION'
          });
        }

        if (input.type === 'multiselect' && Array.isArray(value)) {
          const invalidOptions = value.filter(v => !input.options!.includes(v));
          if (invalidOptions.length > 0) {
            errors.push({
              node_id: node.id,
              field: input.name,
              message: `Invalid options for ${input.label}: ${invalidOptions.join(', ')}`,
              code: 'INVALID_OPTION'
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate input type
   */
  private validateInputType(
    expectedType: string,
    value: any,
    fieldName: string
  ): { message: string; code: string } | null {
    switch (expectedType) {
      case 'string':
        if (typeof value !== 'string') {
          return {
            message: `${fieldName} must be a string`,
            code: 'INVALID_TYPE'
          };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return {
            message: `${fieldName} must be a number`,
            code: 'INVALID_TYPE'
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            message: `${fieldName} must be a boolean`,
            code: 'INVALID_TYPE'
          };
        }
        break;

      case 'json':
        if (typeof value !== 'object' || value === null) {
          return {
            message: `${fieldName} must be a valid JSON object`,
            code: 'INVALID_TYPE'
          };
        }
        break;

      case 'multiselect':
        if (!Array.isArray(value)) {
          return {
            message: `${fieldName} must be an array`,
            code: 'INVALID_TYPE'
          };
        }
        break;
    }

    return null;
  }

  /**
   * Validate against a validation rule
   */
  private validateRule(
    rule: any,
    value: any,
    fieldName: string
  ): { message: string; code: string } | null {
    switch (rule.type) {
      case 'min':
        if (typeof value === 'number' && value < rule.value) {
          return {
            message: rule.message || `${fieldName} must be at least ${rule.value}`,
            code: 'VALIDATION_FAILED'
          };
        }
        if (typeof value === 'string' && value.length < rule.value) {
          return {
            message: rule.message || `${fieldName} must be at least ${rule.value} characters`,
            code: 'VALIDATION_FAILED'
          };
        }
        break;

      case 'max':
        if (typeof value === 'number' && value > rule.value) {
          return {
            message: rule.message || `${fieldName} must be at most ${rule.value}`,
            code: 'VALIDATION_FAILED'
          };
        }
        if (typeof value === 'string' && value.length > rule.value) {
          return {
            message: rule.message || `${fieldName} must be at most ${rule.value} characters`,
            code: 'VALIDATION_FAILED'
          };
        }
        break;

      case 'pattern':
        if (typeof value === 'string') {
          const regex = new RegExp(rule.value);
          if (!regex.test(value)) {
            return {
              message: rule.message || `${fieldName} format is invalid`,
              code: 'VALIDATION_FAILED'
            };
          }
        }
        break;
    }

    return null;
  }

  /**
   * Get node categories
   */
  getCategories(): NodeCategory[] {
    return ['trigger', 'action', 'condition', 'integration', 'utility'];
  }

  /**
   * Get statistics about the node library
   */
  getStats(): {
    total: number;
    by_category: Record<NodeCategory, number>;
  } {
    this.ensureLoaded();

    const categories = this.getCategories();
    const by_category = {} as Record<NodeCategory, number>;

    for (const category of categories) {
      by_category[category] = this.listNodes(category).length;
    }

    return {
      total: this.nodes.size,
      by_category
    };
  }

  /**
   * Ensure nodes are loaded
   */
  private ensureLoaded(): void {
    if (!this.loaded) {
      throw new Error('Node library not loaded. Call loadNodes() first.');
    }
  }
}

// Singleton instance
let instance: NodeLibrary | null = null;

/**
 * Get the singleton NodeLibrary instance
 */
export async function getNodeLibrary(): Promise<NodeLibrary> {
  if (!instance) {
    instance = new NodeLibrary();
    await instance.loadNodes();
  }
  return instance;
}
