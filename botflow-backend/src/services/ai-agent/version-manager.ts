/**
 * Version Manager Service (Phase 3 Week 4)
 *
 * Manages workflow versioning and undo/redo functionality during
 * conversation-based editing. Tracks changes, maintains history,
 * and provides diff capabilities.
 *
 * Responsibilities:
 * - Save workflow versions with descriptions
 * - Undo/redo workflow changes
 * - Get version history
 * - Compare versions (diff)
 * - Restore specific versions
 */

import { ConversationContext } from '../../types/ai-agent.js';
import { Blueprint, BlueprintNode, BlueprintEdge } from '../../types/workflow.js';

/**
 * A saved workflow version
 */
export interface WorkflowVersion {
  version: number;
  workflow: Blueprint;
  timestamp: Date;
  description: string;
  triggeredBy: 'user' | 'ai' | 'auto-fix' | 'template';
  changesSummary?: string;
}

/**
 * Diff between two workflow versions
 */
export interface WorkflowDiff {
  nodesAdded: BlueprintNode[];
  nodesRemoved: BlueprintNode[];
  nodesModified: Array<{
    nodeId: string;
    before: Partial<BlueprintNode>;
    after: Partial<BlueprintNode>;
    changes: string[];
  }>;
  edgesAdded: BlueprintEdge[];
  edgesRemoved: BlueprintEdge[];
  summary: string;
}

/**
 * Version manager configuration
 */
interface VersionManagerConfig {
  maxVersions: number;
  autoSaveOnChange: boolean;
}

const DEFAULT_CONFIG: VersionManagerConfig = {
  maxVersions: 20,
  autoSaveOnChange: true
};

/**
 * Extended context with version history
 */
export interface VersionedContext extends ConversationContext {
  workflowVersions: WorkflowVersion[];
  currentVersionIndex: number;
}

/**
 * Version Manager Service
 */
export class VersionManager {
  private config: VersionManagerConfig;

  constructor(config: Partial<VersionManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize version tracking for a context
   */
  initializeVersioning(context: ConversationContext): VersionedContext {
    const versionedContext = context as VersionedContext;

    if (!versionedContext.workflowVersions) {
      versionedContext.workflowVersions = [];
      versionedContext.currentVersionIndex = -1;
    }

    return versionedContext;
  }

  /**
   * Save a new version
   */
  saveVersion(
    context: ConversationContext,
    workflow: Blueprint,
    description: string,
    triggeredBy: WorkflowVersion['triggeredBy'] = 'ai'
  ): void {
    const versionedContext = this.initializeVersioning(context);

    // If we're not at the latest version, truncate future versions
    if (versionedContext.currentVersionIndex < versionedContext.workflowVersions.length - 1) {
      versionedContext.workflowVersions = versionedContext.workflowVersions.slice(
        0,
        versionedContext.currentVersionIndex + 1
      );
    }

    // Generate changes summary if there's a previous version
    let changesSummary: string | undefined;
    if (versionedContext.workflowVersions.length > 0) {
      const lastVersion = versionedContext.workflowVersions[versionedContext.workflowVersions.length - 1];
      const diff = this.diff(lastVersion.workflow, workflow);
      changesSummary = diff.summary;
    }

    // Create new version
    const newVersion: WorkflowVersion = {
      version: versionedContext.workflowVersions.length + 1,
      workflow: this.cloneWorkflow(workflow),
      timestamp: new Date(),
      description,
      triggeredBy,
      changesSummary
    };

    versionedContext.workflowVersions.push(newVersion);
    versionedContext.currentVersionIndex = versionedContext.workflowVersions.length - 1;

    // Trim old versions if exceeding max
    if (versionedContext.workflowVersions.length > this.config.maxVersions) {
      versionedContext.workflowVersions = versionedContext.workflowVersions.slice(
        -this.config.maxVersions
      );
      // Renumber versions
      versionedContext.workflowVersions.forEach((v, i) => {
        v.version = i + 1;
      });
      versionedContext.currentVersionIndex = versionedContext.workflowVersions.length - 1;
    }

    // Update context current workflow
    context.currentWorkflow = this.cloneWorkflow(workflow);
  }

  /**
   * Undo to previous version
   */
  undo(context: ConversationContext): Blueprint | null {
    const versionedContext = this.initializeVersioning(context);

    if (versionedContext.currentVersionIndex <= 0) {
      return null; // Nothing to undo
    }

    versionedContext.currentVersionIndex--;
    const previousVersion = versionedContext.workflowVersions[versionedContext.currentVersionIndex];

    // Update context current workflow
    context.currentWorkflow = this.cloneWorkflow(previousVersion.workflow);

    return context.currentWorkflow;
  }

  /**
   * Redo to next version
   */
  redo(context: ConversationContext): Blueprint | null {
    const versionedContext = this.initializeVersioning(context);

    if (versionedContext.currentVersionIndex >= versionedContext.workflowVersions.length - 1) {
      return null; // Nothing to redo
    }

    versionedContext.currentVersionIndex++;
    const nextVersion = versionedContext.workflowVersions[versionedContext.currentVersionIndex];

    // Update context current workflow
    context.currentWorkflow = this.cloneWorkflow(nextVersion.workflow);

    return context.currentWorkflow;
  }

  /**
   * Get version history
   */
  getHistory(context: ConversationContext): WorkflowVersion[] {
    const versionedContext = this.initializeVersioning(context);
    return [...versionedContext.workflowVersions];
  }

  /**
   * Get current version index
   */
  getCurrentVersionIndex(context: ConversationContext): number {
    const versionedContext = this.initializeVersioning(context);
    return versionedContext.currentVersionIndex;
  }

  /**
   * Check if undo is available
   */
  canUndo(context: ConversationContext): boolean {
    const versionedContext = this.initializeVersioning(context);
    return versionedContext.currentVersionIndex > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(context: ConversationContext): boolean {
    const versionedContext = this.initializeVersioning(context);
    return versionedContext.currentVersionIndex < versionedContext.workflowVersions.length - 1;
  }

  /**
   * Get a specific version
   */
  getVersion(context: ConversationContext, versionNumber: number): WorkflowVersion | null {
    const versionedContext = this.initializeVersioning(context);
    return versionedContext.workflowVersions.find(v => v.version === versionNumber) || null;
  }

  /**
   * Restore a specific version
   */
  restoreVersion(context: ConversationContext, versionNumber: number): Blueprint | null {
    const versionedContext = this.initializeVersioning(context);
    const versionIndex = versionedContext.workflowVersions.findIndex(v => v.version === versionNumber);

    if (versionIndex < 0) {
      return null;
    }

    // Save current state before restoring (so user can undo the restore)
    if (context.currentWorkflow) {
      this.saveVersion(
        context,
        context.currentWorkflow,
        `Before restoring to version ${versionNumber}`,
        'user'
      );
    }

    const version = versionedContext.workflowVersions[versionIndex];
    const restoredWorkflow = this.cloneWorkflow(version.workflow);

    // Save the restored version as a new version
    this.saveVersion(
      context,
      restoredWorkflow,
      `Restored from version ${versionNumber}`,
      'user'
    );

    return context.currentWorkflow;
  }

  /**
   * Compare two workflow versions
   */
  diff(v1: Blueprint, v2: Blueprint): WorkflowDiff {
    const v1NodeIds = new Set(v1.nodes.map(n => n.id));
    const v2NodeIds = new Set(v2.nodes.map(n => n.id));
    const v1EdgeIds = new Set(v1.edges.map(e => e.id));
    const v2EdgeIds = new Set(v2.edges.map(e => e.id));

    // Nodes added (in v2 but not v1)
    const nodesAdded = v2.nodes.filter(n => !v1NodeIds.has(n.id));

    // Nodes removed (in v1 but not v2)
    const nodesRemoved = v1.nodes.filter(n => !v2NodeIds.has(n.id));

    // Nodes modified (in both but different)
    const nodesModified: WorkflowDiff['nodesModified'] = [];
    for (const v2Node of v2.nodes) {
      const v1Node = v1.nodes.find(n => n.id === v2Node.id);
      if (v1Node) {
        const changes = this.compareNodes(v1Node, v2Node);
        if (changes.length > 0) {
          nodesModified.push({
            nodeId: v2Node.id,
            before: this.extractRelevantNodeData(v1Node),
            after: this.extractRelevantNodeData(v2Node),
            changes
          });
        }
      }
    }

    // Edges added
    const edgesAdded = v2.edges.filter(e => !v1EdgeIds.has(e.id));

    // Edges removed
    const edgesRemoved = v1.edges.filter(e => !v2EdgeIds.has(e.id));

    // Generate summary
    const summaryParts: string[] = [];

    if (nodesAdded.length > 0) {
      summaryParts.push(`Added ${nodesAdded.length} node(s): ${nodesAdded.map(n => n.data?.label || n.id).join(', ')}`);
    }
    if (nodesRemoved.length > 0) {
      summaryParts.push(`Removed ${nodesRemoved.length} node(s): ${nodesRemoved.map(n => n.data?.label || n.id).join(', ')}`);
    }
    if (nodesModified.length > 0) {
      summaryParts.push(`Modified ${nodesModified.length} node(s)`);
    }
    if (edgesAdded.length > 0) {
      summaryParts.push(`Added ${edgesAdded.length} connection(s)`);
    }
    if (edgesRemoved.length > 0) {
      summaryParts.push(`Removed ${edgesRemoved.length} connection(s)`);
    }

    const summary = summaryParts.length > 0 ? summaryParts.join('. ') : 'No changes';

    return {
      nodesAdded,
      nodesRemoved,
      nodesModified,
      edgesAdded,
      edgesRemoved,
      summary
    };
  }

  /**
   * Generate a human-readable description of changes
   */
  describeChanges(diff: WorkflowDiff): string {
    if (diff.summary === 'No changes') {
      return 'No changes were made to the workflow.';
    }

    const descriptions: string[] = [];

    if (diff.nodesAdded.length > 0) {
      for (const node of diff.nodesAdded) {
        descriptions.push(`Added "${node.data?.label || 'a new step'}" (${node.type})`);
      }
    }

    if (diff.nodesRemoved.length > 0) {
      for (const node of diff.nodesRemoved) {
        descriptions.push(`Removed "${node.data?.label || 'a step'}" (${node.type})`);
      }
    }

    if (diff.nodesModified.length > 0) {
      for (const mod of diff.nodesModified) {
        const nodeLabel = diff.nodesModified[0]?.after?.data?.label || mod.nodeId;
        descriptions.push(`Updated "${nodeLabel}": ${mod.changes.join(', ')}`);
      }
    }

    if (diff.edgesAdded.length > 0) {
      descriptions.push(`Added ${diff.edgesAdded.length} new connection(s) between steps`);
    }

    if (diff.edgesRemoved.length > 0) {
      descriptions.push(`Removed ${diff.edgesRemoved.length} connection(s) between steps`);
    }

    return descriptions.join('\n');
  }

  /**
   * Get stats about version history
   */
  getVersionStats(context: ConversationContext): {
    totalVersions: number;
    currentVersion: number;
    canUndo: boolean;
    canRedo: boolean;
    oldestVersion: Date | null;
    newestVersion: Date | null;
  } {
    const versionedContext = this.initializeVersioning(context);
    const versions = versionedContext.workflowVersions;

    return {
      totalVersions: versions.length,
      currentVersion: versionedContext.currentVersionIndex + 1,
      canUndo: this.canUndo(context),
      canRedo: this.canRedo(context),
      oldestVersion: versions.length > 0 ? versions[0].timestamp : null,
      newestVersion: versions.length > 0 ? versions[versions.length - 1].timestamp : null
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Clone a workflow deeply
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
   * Compare two nodes and return list of changes
   */
  private compareNodes(n1: BlueprintNode, n2: BlueprintNode): string[] {
    const changes: string[] = [];

    // Type change
    if (n1.type !== n2.type) {
      changes.push(`type changed from "${n1.type}" to "${n2.type}"`);
    }

    // Position change (significant movement)
    const positionThreshold = 50;
    const dx = Math.abs(n1.position.x - n2.position.x);
    const dy = Math.abs(n1.position.y - n2.position.y);
    if (dx > positionThreshold || dy > positionThreshold) {
      changes.push('position moved');
    }

    // Label change
    if (n1.data?.label !== n2.data?.label) {
      changes.push(`label changed to "${n2.data?.label}"`);
    }

    // Data changes (other properties)
    const d1 = { ...n1.data };
    const d2 = { ...n2.data };
    delete d1.label;
    delete d2.label;

    const d1Keys = new Set(Object.keys(d1));
    const d2Keys = new Set(Object.keys(d2));

    // New properties
    for (const key of d2Keys) {
      if (!d1Keys.has(key)) {
        changes.push(`added "${key}"`);
      }
    }

    // Removed properties
    for (const key of d1Keys) {
      if (!d2Keys.has(key)) {
        changes.push(`removed "${key}"`);
      }
    }

    // Changed properties
    for (const key of d1Keys) {
      if (d2Keys.has(key) && JSON.stringify(d1[key]) !== JSON.stringify(d2[key])) {
        changes.push(`changed "${key}"`);
      }
    }

    return changes;
  }

  /**
   * Extract relevant node data for comparison display
   */
  private extractRelevantNodeData(node: BlueprintNode): Partial<BlueprintNode> {
    return {
      id: node.id,
      type: node.type,
      data: { ...node.data }
    };
  }
}

// Singleton instance
let instance: VersionManager | null = null;

/**
 * Get the VersionManager singleton
 */
export function getVersionManager(): VersionManager {
  if (!instance) {
    instance = new VersionManager();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetVersionManager(): void {
  instance = null;
}
