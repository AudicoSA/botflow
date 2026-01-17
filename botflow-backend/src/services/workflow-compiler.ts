/**
 * Workflow Compiler Service (Phase 2 Week 2 Day 3)
 *
 * This is the CORE of the Dynamic Workflow Engine.
 * It compiles user-friendly Blueprint JSON into production-ready n8n workflows.
 *
 * Responsibilities:
 * - Validate Blueprint structure and nodes
 * - Convert Blueprint nodes → n8n nodes
 * - Create n8n connections (edges)
 * - Auto-layout nodes on canvas
 * - Generate compilation reports
 */

import {
  Blueprint,
  BlueprintNode,
  BlueprintEdge,
  N8nWorkflow,
  N8nNode,
  N8nConnections,
  CompilationResult,
  CompilerOptions,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '../types/workflow.js';
import { getNodeLibrary } from './node-library.js';

export class WorkflowCompiler {
  /**
   * Compile a Blueprint into an n8n workflow
   */
  async compile(blueprint: Blueprint, options?: CompilerOptions): Promise<CompilationResult> {
    const startTime = Date.now();

    try {
      // Step 1: Validate Blueprint
      const validation = await this.validate(blueprint);

      if (!validation.valid) {
        return {
          success: false,
          validation,
          stats: {
            node_count: 0,
            edge_count: 0,
            compilation_time_ms: Date.now() - startTime
          }
        };
      }

      // Step 2: If validate_only mode, stop here
      if (options?.validate_only) {
        return {
          success: true,
          validation,
          stats: {
            node_count: blueprint.nodes.length,
            edge_count: blueprint.edges.length,
            compilation_time_ms: Date.now() - startTime
          }
        };
      }

      // Step 3: Create base n8n workflow structure
      const workflow: N8nWorkflow = {
        name: blueprint.name || `Bot ${blueprint.bot_id} v${blueprint.version}`,
        nodes: [],
        connections: {},
        active: false,
        settings: {
          timezone: 'Africa/Johannesburg',
          saveExecutionProgress: true,
          saveManualExecutions: true
        },
        staticData: null
      };

      // Step 4: Convert Blueprint nodes → n8n nodes
      for (const blueprintNode of blueprint.nodes) {
        const n8nNode = await this.convertNode(blueprintNode, blueprint);
        workflow.nodes.push(n8nNode);
      }

      // Step 5: Create connections between nodes
      workflow.connections = this.createConnections(blueprint.edges, workflow.nodes);

      // Step 6: Auto-layout nodes (if not manually positioned)
      if (options?.auto_layout !== false) {
        this.autoLayoutNodes(workflow.nodes, blueprint.edges);
      }

      // Step 7: Optimize workflow (if requested)
      if (options?.optimize) {
        this.optimizeWorkflow(workflow);
      }

      return {
        success: true,
        workflow,
        validation,
        stats: {
          node_count: workflow.nodes.length,
          edge_count: blueprint.edges.length,
          compilation_time_ms: Date.now() - startTime
        }
      };

    } catch (error: any) {
      return {
        success: false,
        validation: {
          valid: false,
          errors: [{
            message: `Compilation error: ${error.message}`,
            code: 'COMPILATION_ERROR'
          }],
          warnings: []
        },
        stats: {
          node_count: 0,
          edge_count: 0,
          compilation_time_ms: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Validate a Blueprint before compilation
   */
  async validate(blueprint: Blueprint): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const nodeLibrary = await getNodeLibrary();

    // Validate required fields
    if (!blueprint.bot_id) {
      errors.push({
        message: 'Missing required field: bot_id',
        code: 'MISSING_FIELD'
      });
    }

    if (!blueprint.version) {
      errors.push({
        message: 'Missing required field: version',
        code: 'MISSING_FIELD'
      });
    }

    if (!blueprint.nodes || blueprint.nodes.length === 0) {
      errors.push({
        message: 'Blueprint must have at least one node',
        code: 'EMPTY_BLUEPRINT'
      });
    }

    // Validate nodes
    const nodeIds = new Set<string>();
    for (const node of blueprint.nodes || []) {
      // Check for duplicate IDs
      if (nodeIds.has(node.id)) {
        errors.push({
          node_id: node.id,
          message: `Duplicate node ID: ${node.id}`,
          code: 'DUPLICATE_NODE_ID'
        });
      }
      nodeIds.add(node.id);

      // Validate node against library
      const nodeValidation = nodeLibrary.validateNode(node);
      if (!nodeValidation.valid) {
        errors.push(...nodeValidation.errors);
      }
      warnings.push(...nodeValidation.warnings);
    }

    // Validate edges
    for (const edge of blueprint.edges || []) {
      // Check that source and target nodes exist
      if (!nodeIds.has(edge.source)) {
        errors.push({
          message: `Edge ${edge.id} references non-existent source node: ${edge.source}`,
          code: 'INVALID_EDGE'
        });
      }

      if (!nodeIds.has(edge.target)) {
        errors.push({
          message: `Edge ${edge.id} references non-existent target node: ${edge.target}`,
          code: 'INVALID_EDGE'
        });
      }
    }

    // Check for disconnected nodes
    const connectedNodes = new Set<string>();
    for (const edge of blueprint.edges || []) {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    }

    for (const node of blueprint.nodes || []) {
      if (!connectedNodes.has(node.id) && blueprint.nodes.length > 1) {
        warnings.push({
          node_id: node.id,
          message: `Node ${node.id} is not connected to any other nodes`
        });
      }
    }

    // Check for cycles (advanced validation)
    if (this.hasCycles(blueprint.nodes, blueprint.edges)) {
      warnings.push({
        message: 'Workflow contains cycles. Ensure loop nodes are used correctly.'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Convert a Blueprint node to an n8n node
   */
  private async convertNode(blueprintNode: BlueprintNode, blueprint: Blueprint): Promise<N8nNode> {
    const nodeLibrary = await getNodeLibrary();
    const definition = nodeLibrary.getNode(blueprintNode.type);

    if (!definition) {
      throw new Error(`Unknown node type: ${blueprintNode.type}`);
    }

    // Clone the n8n template
    const n8nNode: N8nNode = {
      id: `n8n_${blueprintNode.id}`,
      name: blueprintNode.name || definition.name,
      type: definition.n8n_type,
      typeVersion: definition.n8n_template.typeVersion || 1,
      position: blueprintNode.position ? [blueprintNode.position.x, blueprintNode.position.y] : [0, 0],
      parameters: { ...definition.n8n_template.parameters }
    };

    // Merge user configuration into parameters
    for (const [key, value] of Object.entries(blueprintNode.config)) {
      // Handle nested parameter paths (e.g., "options.timeout")
      this.setNestedParameter(n8nNode.parameters, key, value);
    }

    // Add credentials if defined in template
    if (definition.n8n_template.credentials) {
      n8nNode.credentials = definition.n8n_template.credentials;
    }

    // Add notes if provided
    if (blueprintNode.name && blueprintNode.name !== definition.name) {
      n8nNode.notes = `Custom name: ${blueprintNode.name}`;
    }

    return n8nNode;
  }

  /**
   * Set a nested parameter value (e.g., "options.timeout" = 300)
   */
  private setNestedParameter(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Create n8n connections from Blueprint edges
   */
  private createConnections(edges: BlueprintEdge[], nodes: N8nNode[]): N8nConnections {
    const connections: N8nConnections = {};

    // Build node ID mapping (Blueprint ID → n8n ID)
    const nodeMap = new Map<string, string>();
    for (const node of nodes) {
      const blueprintId = node.id.replace('n8n_', '');
      nodeMap.set(blueprintId, node.id);
    }

    // Create connections
    for (const edge of edges) {
      const sourceN8nId = nodeMap.get(edge.source);
      const targetN8nId = nodeMap.get(edge.target);

      if (!sourceN8nId || !targetN8nId) {
        console.warn(`Skipping edge ${edge.id}: source or target node not found`);
        continue;
      }

      // Initialize source node connections
      if (!connections[sourceN8nId]) {
        connections[sourceN8nId] = {};
      }

      // Determine output type (main, true, false, etc.)
      const outputType = edge.sourceHandle || 'main';

      if (!connections[sourceN8nId][outputType]) {
        connections[sourceN8nId][outputType] = [];
      }

      // n8n uses nested arrays for connections (branch → connection list)
      if (!connections[sourceN8nId][outputType][0]) {
        connections[sourceN8nId][outputType][0] = [];
      }

      // Add connection
      connections[sourceN8nId][outputType][0].push({
        node: targetN8nId,
        type: 'main',
        index: 0
      });
    }

    return connections;
  }

  /**
   * Auto-layout nodes on the n8n canvas
   */
  private autoLayoutNodes(nodes: N8nNode[], edges: BlueprintEdge[]): void {
    const HORIZONTAL_SPACING = 300;
    const VERTICAL_SPACING = 150;
    const START_X = 250;
    const START_Y = 300;

    // Build adjacency list for topological sort
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of nodes) {
      const blueprintId = node.id.replace('n8n_', '');
      graph.set(blueprintId, []);
      inDegree.set(blueprintId, 0);
    }

    for (const edge of edges) {
      graph.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    // Topological sort (Kahn's algorithm)
    const queue: string[] = [];
    const sorted: string[] = [];

    // Find all nodes with no incoming edges
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);

      for (const neighbor of graph.get(current) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Handle remaining nodes (cycles or disconnected)
    for (const node of nodes) {
      const blueprintId = node.id.replace('n8n_', '');
      if (!sorted.includes(blueprintId)) {
        sorted.push(blueprintId);
      }
    }

    // Position nodes horizontally based on sort order
    const nodePositions = new Map<string, { x: number; y: number }>();
    let currentX = START_X;

    for (const blueprintId of sorted) {
      nodePositions.set(blueprintId, {
        x: currentX,
        y: START_Y
      });
      currentX += HORIZONTAL_SPACING;
    }

    // Apply positions to nodes
    for (const node of nodes) {
      const blueprintId = node.id.replace('n8n_', '');
      const position = nodePositions.get(blueprintId);

      if (position) {
        node.position = [position.x, position.y];
      }
    }
  }

  /**
   * Check if workflow contains cycles
   */
  private hasCycles(nodes: BlueprintNode[], edges: BlueprintEdge[]): boolean {
    const graph = new Map<string, string[]>();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    // Build adjacency list
    for (const node of nodes) {
      graph.set(node.id, []);
    }

    for (const edge of edges) {
      graph.get(edge.source)?.push(edge.target);
    }

    // DFS to detect cycles
    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      for (const neighbor of graph.get(nodeId) || []) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true; // Cycle detected
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Optimize workflow (remove redundant nodes, merge sequential operations, etc.)
   */
  private optimizeWorkflow(workflow: N8nWorkflow): void {
    // Future optimization strategies:
    // - Merge sequential Set nodes
    // - Remove unused variables
    // - Combine multiple HTTP requests to same endpoint
    // - Cache repeated database queries

    // For now, this is a placeholder
    console.log('Workflow optimization: Not yet implemented');
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStats(workflow: N8nWorkflow): {
    node_count: number;
    connection_count: number;
    triggers: number;
    actions: number;
    conditions: number;
  } {
    let connectionCount = 0;
    for (const nodeConnections of Object.values(workflow.connections)) {
      for (const outputConnections of Object.values(nodeConnections)) {
        for (const branch of outputConnections) {
          connectionCount += branch.length;
        }
      }
    }

    // Count node types (basic heuristic)
    const triggers = workflow.nodes.filter(n =>
      n.type.includes('webhook') || n.type.includes('trigger')
    ).length;

    const conditions = workflow.nodes.filter(n =>
      n.type.includes('if') || n.type.includes('switch')
    ).length;

    const actions = workflow.nodes.length - triggers - conditions;

    return {
      node_count: workflow.nodes.length,
      connection_count: connectionCount,
      triggers,
      actions,
      conditions
    };
  }
}

// Singleton instance
let instance: WorkflowCompiler | null = null;

/**
 * Get the singleton WorkflowCompiler instance
 */
export function getWorkflowCompiler(): WorkflowCompiler {
  if (!instance) {
    instance = new WorkflowCompiler();
  }
  return instance;
}
