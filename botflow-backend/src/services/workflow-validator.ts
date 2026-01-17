/**
 * Workflow Validator Service (Phase 2 Week 2 Day 3)
 *
 * Additional validation utilities for workflows
 */

import { Blueprint, ValidationResult, ValidationError, ValidationWarning } from '../types/workflow.js';
import { getWorkflowCompiler } from './workflow-compiler.js';

export class WorkflowValidator {
  /**
   * Perform comprehensive validation on a Blueprint
   */
  async validateBlueprint(blueprint: Blueprint): Promise<ValidationResult> {
    const compiler = getWorkflowCompiler();
    const result = await compiler.validate(blueprint);

    // Add additional business logic validations
    const additionalErrors: ValidationError[] = [];
    const additionalWarnings: ValidationWarning[] = [];

    // Check for required trigger node
    const hasTrigger = blueprint.nodes.some(node =>
      node.type === 'whatsapp_trigger' || node.type.includes('trigger')
    );

    if (!hasTrigger) {
      additionalWarnings.push({
        message: 'Workflow has no trigger node. It may not be executable.'
      });
    }

    // Check for dead ends (nodes with no outgoing edges)
    const nodesWithOutgoingEdges = new Set(blueprint.edges.map(e => e.source));
    const deadEndNodes = blueprint.nodes.filter(node =>
      !nodesWithOutgoingEdges.has(node.id) && node.type !== 'whatsapp_reply'
    );

    if (deadEndNodes.length > 0) {
      for (const node of deadEndNodes) {
        additionalWarnings.push({
          node_id: node.id,
          message: `Node ${node.id} has no outgoing connections`
        });
      }
    }

    // Check for excessive complexity
    if (blueprint.nodes.length > 50) {
      additionalWarnings.push({
        message: 'Workflow has more than 50 nodes. Consider breaking it into smaller workflows.'
      });
    }

    return {
      valid: result.valid && additionalErrors.length === 0,
      errors: [...result.errors, ...additionalErrors],
      warnings: [...result.warnings, ...additionalWarnings]
    };
  }

  /**
   * Check if a workflow is executable
   */
  isExecutable(blueprint: Blueprint): boolean {
    const hasTrigger = blueprint.nodes.some(node =>
      node.type.includes('trigger')
    );

    const hasAction = blueprint.nodes.some(node =>
      node.type.includes('reply') || node.type.includes('request')
    );

    return hasTrigger && hasAction && blueprint.nodes.length > 0;
  }

  /**
   * Estimate workflow complexity score (0-100)
   */
  calculateComplexity(blueprint: Blueprint): number {
    let score = 0;

    // Base score from node count
    score += Math.min(blueprint.nodes.length * 2, 40);

    // Add points for edges (connections)
    score += Math.min(blueprint.edges.length * 1, 20);

    // Add points for conditional logic
    const conditions = blueprint.nodes.filter(n =>
      n.type === 'if_condition' || n.type === 'switch_case'
    ).length;
    score += conditions * 5;

    // Add points for loops
    const loops = blueprint.nodes.filter(n => n.type === 'loop').length;
    score += loops * 10;

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Suggest optimizations for a workflow
   */
  suggestOptimizations(blueprint: Blueprint): string[] {
    const suggestions: string[] = [];

    // Check for sequential variable assignments
    const setNodes = blueprint.nodes.filter(n => n.type === 'store_variable');
    if (setNodes.length > 3) {
      suggestions.push('Consider combining multiple variable assignments into a single Code node');
    }

    // Check for repeated patterns
    const nodeTypes = blueprint.nodes.map(n => n.type);
    const typeCount = new Map<string, number>();
    for (const type of nodeTypes) {
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    }

    for (const [type, count] of typeCount.entries()) {
      if (count > 5 && type === 'http_request') {
        suggestions.push('Consider batching HTTP requests or using a loop node');
      }
    }

    return suggestions;
  }
}

// Singleton instance
let instance: WorkflowValidator | null = null;

/**
 * Get the singleton WorkflowValidator instance
 */
export function getWorkflowValidator(): WorkflowValidator {
  if (!instance) {
    instance = new WorkflowValidator();
  }
  return instance;
}
