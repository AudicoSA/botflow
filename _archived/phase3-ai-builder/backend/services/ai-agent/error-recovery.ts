/**
 * Error Recovery Service (Phase 3 Week 4)
 *
 * AI-powered error detection and automatic fix capabilities for workflows.
 * Analyzes workflow errors and suggests or applies fixes automatically.
 *
 * Responsibilities:
 * - Validate workflows and detect issues
 * - Suggest fixes for common problems
 * - Auto-fix simple issues without user intervention
 * - Log errors for pattern learning
 * - Provide detailed error explanations
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { Blueprint, BlueprintNode, BlueprintEdge } from '../../types/workflow.js';
import {
  ValidationIssue,
  AutoFixSuggestion,
  WorkflowModification
} from '../../types/ai-agent.js';

/**
 * Error types that can be detected
 */
export type ErrorType =
  | 'validation'
  | 'generation'
  | 'execution'
  | 'integration'
  | 'configuration';

/**
 * Recovery suggestion with fix details
 */
export interface RecoverySuggestion {
  issue: ValidationIssue;
  fix: WorkflowModification;
  confidence: number;
  explanation: string;
  requiresUserConfirmation: boolean;
  impact: 'low' | 'medium' | 'high';
}

/**
 * Validation result containing all issues and potential fixes
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
  autoFixable: RecoverySuggestion[];
  requiresManualFix: ValidationIssue[];
}

/**
 * Auto-fix result
 */
export interface AutoFixResult {
  fixed: Blueprint;
  appliedFixes: string[];
  remainingIssues: ValidationIssue[];
  success: boolean;
}

/**
 * Error log entry
 */
export interface ErrorLogEntry {
  workflowId?: string;
  botId?: string;
  organizationId?: string;
  sessionId?: string;
  errorType: ErrorType;
  errorCode?: string;
  errorMessage: string;
  errorContext?: Record<string, unknown>;
  workflowState?: Blueprint;
  intentSignature?: string;
  wasAutoFixed?: boolean;
  autoFixApplied?: string;
}

/**
 * Common validation rules and their fix strategies
 */
const VALIDATION_RULES: Array<{
  code: string;
  check: (workflow: Blueprint) => ValidationIssue | null;
  fix: (workflow: Blueprint, issue: ValidationIssue) => WorkflowModification | null;
  autoFixable: boolean;
  impact: 'low' | 'medium' | 'high';
}> = [
  // Missing trigger node
  {
    code: 'MISSING_TRIGGER',
    check: (workflow) => {
      const hasTrigger = workflow.nodes.some(n => n.type === 'trigger');
      if (!hasTrigger) {
        return {
          type: 'error',
          code: 'MISSING_TRIGGER',
          message: 'Workflow is missing a trigger node. Every workflow needs a trigger to start.',
          suggestion: {
            issueType: 'MISSING_TRIGGER',
            description: 'Add a WhatsApp message trigger at the beginning',
            fix: {
              type: 'add_node',
              description: 'Add WhatsApp message trigger',
              data: {
                id: 'trigger-1',
                type: 'trigger',
                position: { x: 200, y: 50 },
                data: { label: 'WhatsApp Message', triggerType: 'message_received' }
              }
            },
            confidence: 0.95,
            impact: 'high'
          }
        };
      }
      return null;
    },
    fix: (workflow) => ({
      type: 'add_node',
      description: 'Add WhatsApp message trigger',
      data: {
        id: `trigger-${Date.now()}`,
        type: 'trigger',
        position: { x: 200, y: 50 },
        data: { label: 'WhatsApp Message', triggerType: 'message_received' }
      }
    }),
    autoFixable: true,
    impact: 'high'
  },

  // Missing response/action at end
  {
    code: 'MISSING_RESPONSE',
    check: (workflow) => {
      // Find nodes with no outgoing edges (terminal nodes)
      const outgoingEdges = new Set(workflow.edges.map(e => e.source));
      const terminalNodes = workflow.nodes.filter(n => !outgoingEdges.has(n.id));

      // Check if any terminal node is a response/action
      const hasResponse = terminalNodes.some(
        n => n.type === 'action' && (
          n.data?.actionType === 'send_message' ||
          n.data?.actionType === 'ai_response'
        )
      );

      if (!hasResponse && workflow.nodes.length > 0) {
        return {
          type: 'warning',
          code: 'MISSING_RESPONSE',
          message: 'Workflow may not send a response to the user. Consider adding a send message action.',
          suggestion: {
            issueType: 'MISSING_RESPONSE',
            description: 'Add a send message action at the end',
            fix: {
              type: 'add_node',
              description: 'Add send message action',
              position: 'after'
            },
            confidence: 0.85,
            impact: 'medium'
          }
        };
      }
      return null;
    },
    fix: (workflow) => {
      // Find the last node
      const outgoingEdges = new Set(workflow.edges.map(e => e.source));
      const terminalNodes = workflow.nodes.filter(n => !outgoingEdges.has(n.id));
      const lastNode = terminalNodes[0] || workflow.nodes[workflow.nodes.length - 1];

      const newY = lastNode ? lastNode.position.y + 100 : 500;

      return {
        type: 'add_node',
        description: 'Add send message action',
        position: 'after',
        referenceNodeId: lastNode?.id,
        data: {
          id: `action-response-${Date.now()}`,
          type: 'action',
          position: { x: 200, y: newY },
          data: { label: 'Send Response', actionType: 'send_message' }
        }
      };
    },
    autoFixable: true,
    impact: 'medium'
  },

  // Orphan nodes (no connections)
  {
    code: 'ORPHAN_NODE',
    check: (workflow) => {
      const connectedNodes = new Set<string>();
      for (const edge of workflow.edges) {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      }

      // First node (trigger) doesn't need incoming
      const triggerNodes = workflow.nodes.filter(n => n.type === 'trigger');
      triggerNodes.forEach(t => connectedNodes.add(t.id));

      const orphans = workflow.nodes.filter(
        n => n.type !== 'trigger' && !connectedNodes.has(n.id)
      );

      if (orphans.length > 0) {
        return {
          type: 'warning',
          code: 'ORPHAN_NODE',
          message: `${orphans.length} node(s) are not connected to the workflow: ${orphans.map(n => n.data?.label || n.id).join(', ')}`,
          nodeId: orphans[0].id,
          suggestion: {
            issueType: 'ORPHAN_NODE',
            description: 'Connect orphan node to the workflow or remove it',
            fix: {
              type: 'remove_node',
              targetId: orphans[0].id,
              description: 'Remove unconnected node'
            },
            confidence: 0.7,
            impact: 'low'
          }
        };
      }
      return null;
    },
    fix: (workflow, issue) => ({
      type: 'remove_node',
      targetId: issue.nodeId!,
      description: 'Remove unconnected node'
    }),
    autoFixable: false, // Requires confirmation
    impact: 'low'
  },

  // Circular dependency detection
  {
    code: 'CIRCULAR_DEPENDENCY',
    check: (workflow) => {
      // Build adjacency list
      const adjacency: Record<string, string[]> = {};
      for (const node of workflow.nodes) {
        adjacency[node.id] = [];
      }
      for (const edge of workflow.edges) {
        if (adjacency[edge.source]) {
          adjacency[edge.source].push(edge.target);
        }
      }

      // DFS cycle detection
      const visited = new Set<string>();
      const recStack = new Set<string>();
      let cycleFound = false;
      let cycleNode: string | undefined;

      const hasCycle = (nodeId: string): boolean => {
        visited.add(nodeId);
        recStack.add(nodeId);

        for (const neighbor of adjacency[nodeId] || []) {
          if (!visited.has(neighbor)) {
            if (hasCycle(neighbor)) return true;
          } else if (recStack.has(neighbor)) {
            cycleNode = neighbor;
            return true;
          }
        }

        recStack.delete(nodeId);
        return false;
      };

      for (const node of workflow.nodes) {
        if (!visited.has(node.id)) {
          if (hasCycle(node.id)) {
            cycleFound = true;
            break;
          }
        }
      }

      if (cycleFound) {
        return {
          type: 'error',
          code: 'CIRCULAR_DEPENDENCY',
          message: 'Workflow contains a circular dependency which could cause infinite loops.',
          nodeId: cycleNode,
          suggestion: {
            issueType: 'CIRCULAR_DEPENDENCY',
            description: 'Remove one of the edges causing the cycle',
            fix: {
              type: 'remove_edge',
              description: 'Break the circular dependency'
            },
            confidence: 0.6,
            impact: 'high'
          }
        };
      }
      return null;
    },
    fix: () => null, // Too complex for auto-fix
    autoFixable: false,
    impact: 'high'
  },

  // Missing node configuration
  {
    code: 'MISSING_CONFIG',
    check: (workflow) => {
      for (const node of workflow.nodes) {
        // Integration nodes need integration specified
        if (node.type === 'integration' && !node.data?.integration) {
          return {
            type: 'error',
            code: 'MISSING_CONFIG',
            message: `Integration node "${node.data?.label || node.id}" is missing the integration type.`,
            nodeId: node.id,
            field: 'integration'
          };
        }

        // Action nodes need actionType
        if (node.type === 'action' && !node.data?.actionType) {
          return {
            type: 'warning',
            code: 'MISSING_CONFIG',
            message: `Action node "${node.data?.label || node.id}" is missing the action type.`,
            nodeId: node.id,
            field: 'actionType'
          };
        }

        // Condition nodes need condition
        if (node.type === 'condition' && !node.data?.condition) {
          return {
            type: 'warning',
            code: 'MISSING_CONFIG',
            message: `Condition node "${node.data?.label || node.id}" is missing the condition configuration.`,
            nodeId: node.id,
            field: 'condition'
          };
        }
      }
      return null;
    },
    fix: () => null, // Requires user input
    autoFixable: false,
    impact: 'medium'
  },

  // Empty workflow
  {
    code: 'EMPTY_WORKFLOW',
    check: (workflow) => {
      if (workflow.nodes.length === 0) {
        return {
          type: 'error',
          code: 'EMPTY_WORKFLOW',
          message: 'Workflow has no nodes. At minimum, a trigger is required.'
        };
      }
      return null;
    },
    fix: () => null,
    autoFixable: false,
    impact: 'high'
  },

  // Missing error handler
  {
    code: 'NO_ERROR_HANDLER',
    check: (workflow) => {
      // Check if workflow has any error handling paths
      const hasErrorHandler = workflow.edges.some(
        e => e.sourceHandle === 'error' || e.targetHandle === 'error'
      );

      const hasIntegrations = workflow.nodes.some(n => n.type === 'integration');

      if (hasIntegrations && !hasErrorHandler) {
        return {
          type: 'info',
          code: 'NO_ERROR_HANDLER',
          message: 'Workflow uses integrations but has no error handling. Consider adding error responses.',
          suggestion: {
            issueType: 'NO_ERROR_HANDLER',
            description: 'Add error handling for integration failures',
            fix: {
              type: 'add_node',
              description: 'Add error handler node'
            },
            confidence: 0.6,
            impact: 'low'
          }
        };
      }
      return null;
    },
    fix: () => null, // Complex auto-fix
    autoFixable: false,
    impact: 'low'
  }
];

/**
 * Error Recovery Service
 */
export class ErrorRecoveryService {

  /**
   * Validate a workflow and return all issues
   */
  async validateWorkflow(workflow: Blueprint): Promise<ValidationResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const infos: ValidationIssue[] = [];
    const autoFixable: RecoverySuggestion[] = [];
    const requiresManualFix: ValidationIssue[] = [];

    // Run all validation rules
    for (const rule of VALIDATION_RULES) {
      const issue = rule.check(workflow);

      if (issue) {
        // Categorize by type
        switch (issue.type) {
          case 'error':
            errors.push(issue);
            break;
          case 'warning':
            warnings.push(issue);
            break;
          case 'info':
            infos.push(issue);
            break;
        }

        // Check if auto-fixable
        if (rule.autoFixable && rule.fix) {
          const fix = rule.fix(workflow, issue);
          if (fix) {
            autoFixable.push({
              issue,
              fix,
              confidence: issue.suggestion?.confidence || 0.8,
              explanation: issue.suggestion?.description || 'Auto-fix available',
              requiresUserConfirmation: rule.impact === 'high',
              impact: rule.impact
            });
          }
        } else {
          requiresManualFix.push(issue);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      infos,
      autoFixable,
      requiresManualFix
    };
  }

  /**
   * Analyze a specific error and suggest fixes
   */
  async analyzeError(
    error: { type: ErrorType; message: string; context?: Record<string, unknown> },
    workflow: Blueprint
  ): Promise<RecoverySuggestion[]> {
    const suggestions: RecoverySuggestion[] = [];

    // Find relevant rules based on error context
    for (const rule of VALIDATION_RULES) {
      const issue = rule.check(workflow);

      if (issue && issue.message.toLowerCase().includes(error.message.toLowerCase())) {
        const fix = rule.fix(workflow, issue);
        if (fix) {
          suggestions.push({
            issue,
            fix,
            confidence: issue.suggestion?.confidence || 0.7,
            explanation: `This fix addresses: ${error.message}`,
            requiresUserConfirmation: rule.impact !== 'low',
            impact: rule.impact
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Automatically fix common issues in a workflow
   */
  async autoFix(
    workflow: Blueprint,
    issues?: ValidationIssue[]
  ): Promise<AutoFixResult> {
    // Get current issues if not provided
    const validation = await this.validateWorkflow(workflow);
    const issuesToFix = issues || [...validation.errors, ...validation.warnings];

    let fixed = this.cloneWorkflow(workflow);
    const appliedFixes: string[] = [];
    const remainingIssues: ValidationIssue[] = [];

    // Try to apply auto-fixes for each issue
    for (const issue of issuesToFix) {
      const rule = VALIDATION_RULES.find(r => r.code === issue.code);

      if (rule && rule.autoFixable) {
        const fix = rule.fix(fixed, issue);

        if (fix) {
          const result = this.applyModification(fixed, fix);

          if (result.success) {
            fixed = result.workflow;
            appliedFixes.push(`${fix.description} (${issue.code})`);
          } else {
            remainingIssues.push(issue);
          }
        } else {
          remainingIssues.push(issue);
        }
      } else {
        remainingIssues.push(issue);
      }
    }

    // Validate fixed workflow
    const finalValidation = await this.validateWorkflow(fixed);

    return {
      fixed,
      appliedFixes,
      remainingIssues: [...remainingIssues, ...finalValidation.errors],
      success: finalValidation.errors.length === 0
    };
  }

  /**
   * Log an error for pattern learning
   */
  async logError(entry: ErrorLogEntry): Promise<string | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('workflow_error_logs')
        .insert({
          workflow_id: entry.workflowId,
          bot_id: entry.botId,
          organization_id: entry.organizationId,
          session_id: entry.sessionId,
          error_type: entry.errorType,
          error_code: entry.errorCode,
          error_message: entry.errorMessage,
          error_context: entry.errorContext || {},
          workflow_state: entry.workflowState,
          intent_signature: entry.intentSignature,
          was_auto_fixed: entry.wasAutoFixed || false,
          auto_fix_applied: entry.autoFixApplied
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to log error:', error);
        return null;
      }

      return data?.id || null;
    } catch (err) {
      console.error('Error logging workflow error:', err);
      return null;
    }
  }

  /**
   * Mark an error as manually resolved
   */
  async markResolved(
    errorLogId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('workflow_error_logs')
        .update({
          was_manually_resolved: true,
          resolution_notes: notes
        })
        .eq('id', errorLogId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Get common errors for a workflow type
   */
  async getCommonErrors(
    workflowType?: string,
    limit: number = 10
  ): Promise<Array<{ errorCode: string; count: number; lastSeen: Date }>> {
    try {
      let query = supabaseAdmin
        .from('workflow_error_logs')
        .select('error_code, created_at');

      // Note: Proper aggregation would need a view or raw SQL
      // This is a simplified version
      const { data, error } = await query
        .not('error_code', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error || !data) return [];

      // Group by error code
      const grouped = new Map<string, { count: number; lastSeen: Date }>();

      for (const row of data) {
        const code = row.error_code;
        const existing = grouped.get(code);

        if (existing) {
          existing.count++;
          if (new Date(row.created_at) > existing.lastSeen) {
            existing.lastSeen = new Date(row.created_at);
          }
        } else {
          grouped.set(code, {
            count: 1,
            lastSeen: new Date(row.created_at)
          });
        }
      }

      return Array.from(grouped.entries())
        .map(([errorCode, data]) => ({ errorCode, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (err) {
      console.error('Error getting common errors:', err);
      return [];
    }
  }

  /**
   * Explain a validation issue in user-friendly terms
   */
  explainIssue(issue: ValidationIssue): string {
    const explanations: Record<string, string> = {
      MISSING_TRIGGER: 'Every workflow needs a starting point called a "trigger". This is what activates your workflow - like when a customer sends a WhatsApp message.',
      MISSING_RESPONSE: 'Your workflow should send a response back to the user. Without this, customers won\'t receive any reply.',
      ORPHAN_NODE: 'There\'s a step in your workflow that isn\'t connected to anything. It won\'t run as part of the workflow.',
      CIRCULAR_DEPENDENCY: 'Your workflow has a loop that could run forever. This usually happens when steps point back to earlier steps without a way to stop.',
      MISSING_CONFIG: 'One of your workflow steps needs more information to work properly.',
      EMPTY_WORKFLOW: 'Your workflow is empty. You need to add at least one step to create a working workflow.',
      NO_ERROR_HANDLER: 'Your workflow connects to external services but doesn\'t have a backup plan if something goes wrong.'
    };

    return explanations[issue.code] || issue.message;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Clone a workflow for safe modification
   */
  private cloneWorkflow(workflow: Blueprint): Blueprint {
    return {
      ...workflow,
      nodes: workflow.nodes.map(n => ({
        ...n,
        position: { ...n.position },
        data: { ...n.data }
      })),
      edges: workflow.edges.map(e => ({ ...e }))
    };
  }

  /**
   * Apply a modification to a workflow
   */
  private applyModification(
    workflow: Blueprint,
    modification: WorkflowModification
  ): { success: boolean; workflow: Blueprint } {
    const result = this.cloneWorkflow(workflow);

    try {
      switch (modification.type) {
        case 'add_node': {
          const nodeData = modification.data as BlueprintNode;
          result.nodes.push(nodeData);

          // If there's a reference node, create an edge
          if (modification.referenceNodeId) {
            const edgeId = `edge-${Date.now()}`;
            if (modification.position === 'after') {
              result.edges.push({
                id: edgeId,
                source: modification.referenceNodeId,
                target: nodeData.id
              });
            } else if (modification.position === 'before') {
              result.edges.push({
                id: edgeId,
                source: nodeData.id,
                target: modification.referenceNodeId
              });
            }
          }
          break;
        }

        case 'remove_node': {
          const nodeId = modification.targetId!;
          result.nodes = result.nodes.filter(n => n.id !== nodeId);
          result.edges = result.edges.filter(
            e => e.source !== nodeId && e.target !== nodeId
          );
          break;
        }

        case 'update_node': {
          const nodeId = modification.targetId!;
          const nodeIndex = result.nodes.findIndex(n => n.id === nodeId);
          if (nodeIndex >= 0) {
            result.nodes[nodeIndex] = {
              ...result.nodes[nodeIndex],
              ...modification.data as Partial<BlueprintNode>
            };
          }
          break;
        }

        case 'add_edge': {
          const edgeData = modification.data as BlueprintEdge;
          result.edges.push(edgeData);
          break;
        }

        case 'remove_edge': {
          const edgeId = modification.targetId!;
          result.edges = result.edges.filter(e => e.id !== edgeId);
          break;
        }

        case 'update_config': {
          const nodeId = modification.targetId!;
          const nodeIndex = result.nodes.findIndex(n => n.id === nodeId);
          if (nodeIndex >= 0) {
            result.nodes[nodeIndex].data = {
              ...result.nodes[nodeIndex].data,
              ...modification.data as Record<string, unknown>
            };
          }
          break;
        }

        default:
          return { success: false, workflow };
      }

      return { success: true, workflow: result };
    } catch {
      return { success: false, workflow };
    }
  }
}

// Singleton instance
let instance: ErrorRecoveryService | null = null;

/**
 * Get the ErrorRecoveryService singleton
 */
export function getErrorRecoveryService(): ErrorRecoveryService {
  if (!instance) {
    instance = new ErrorRecoveryService();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetErrorRecoveryService(): void {
  instance = null;
}
