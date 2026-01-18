/**
 * n8n-MCP Service
 *
 * Integrates with n8n-MCP (https://github.com/czlonkowski/n8n-mcp) to expose
 * n8n's 1000+ nodes via Model Context Protocol.
 *
 * Features:
 * - Dynamic discovery of all n8n integrations
 * - AI-powered workflow suggestions
 * - Automatic credential requirements detection
 * - Redis caching for performance
 */

import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// Type definitions for n8n nodes
interface N8nNode {
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  group: string[];
  version: number;
  defaults: Record<string, any>;
  credentials: Array<{
    name: string;
    required: boolean;
  }>;
  properties?: any[];
}

interface N8nCredentialType {
  name: string;
  displayName: string;
  properties: Array<{
    displayName: string;
    name: string;
    type: string;
    default?: any;
    required?: boolean;
  }>;
}

interface McpToolResult {
  content: any;
  isError?: boolean;
}

// Category mapping for n8n nodes to marketplace categories
const CATEGORY_MAPPING: Record<string, string> = {
  'transform': 'productivity',
  'output': 'communication',
  'input': 'communication',
  'utility': 'productivity',
  'flow': 'productivity',
  'marketing': 'communication',
  'analytics': 'analytics',
  'development': 'specialized',
  'finance': 'payment',
  'sales': 'crm',
  'dataStorage': 'productivity',
  'files': 'productivity',
  'helpers': 'productivity',
  'langchain': 'specialized',
};

export class N8nMcpService {
  private mcpServerUrl: string;
  private isEnabled: boolean;
  private cachedNodes: N8nNode[] | null = null;
  private cacheTimestamp: number = 0;
  private cacheDuration = 3600000; // 1 hour in milliseconds

  constructor() {
    this.mcpServerUrl = env.N8N_MCP_SERVER_URL || 'http://localhost:3030';
    this.isEnabled = env.N8N_MCP_ENABLED === true;

    if (this.isEnabled) {
      logger.info({ url: this.mcpServerUrl }, 'n8n-MCP service initialized');
    } else {
      logger.info('n8n-MCP service disabled (N8N_MCP_ENABLED not set)');
    }
  }

  /**
   * Check if n8n-MCP is enabled and available
   */
  isAvailable(): boolean {
    return this.isEnabled;
  }

  /**
   * Connect to n8n-MCP server and verify connection
   */
  async connect(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      // Try to reach the MCP server health endpoint
      const response = await fetch(`${this.mcpServerUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        logger.info('Connected to n8n-MCP server');
        return true;
      }

      logger.warn({ status: response.status }, 'n8n-MCP server health check failed');
      return false;
    } catch (error: any) {
      logger.error({ error }, 'Failed to connect to n8n-MCP server');
      return false;
    }
  }

  /**
   * Get all available n8n nodes via MCP
   * Results are cached for 1 hour
   */
  async getAllNodes(): Promise<N8nNode[]> {
    // Check cache first
    const now = Date.now();
    if (this.cachedNodes && (now - this.cacheTimestamp) < this.cacheDuration) {
      logger.debug('Returning cached n8n-MCP nodes');
      return this.cachedNodes;
    }

    if (!this.isEnabled) {
      logger.debug('n8n-MCP disabled, returning empty nodes');
      return [];
    }

    try {
      // Call MCP server to list all nodes
      const response = await fetch(`${this.mcpServerUrl}/tools/list_nodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`MCP server returned ${response.status}`);
      }

      const result = await response.json() as McpToolResult;
      const nodes = (result.content || []) as N8nNode[];

      // Cache the results
      this.cachedNodes = nodes;
      this.cacheTimestamp = now;

      logger.info({ count: nodes.length }, 'Fetched n8n nodes via MCP');
      return nodes;
    } catch (error: any) {
      logger.error({ error }, 'Failed to fetch n8n nodes via MCP');
      return this.cachedNodes || [];
    }
  }

  /**
   * Get nodes by category
   */
  async getNodesByCategory(category: string): Promise<N8nNode[]> {
    const allNodes = await this.getAllNodes();
    return allNodes.filter(node =>
      node.group.includes(category) ||
      node.group.includes(category.toLowerCase())
    );
  }

  /**
   * Search nodes by name or description
   */
  async searchNodes(query: string): Promise<N8nNode[]> {
    const allNodes = await this.getAllNodes();
    const queryLower = query.toLowerCase();

    return allNodes.filter(node =>
      node.displayName.toLowerCase().includes(queryLower) ||
      node.description.toLowerCase().includes(queryLower) ||
      node.name.toLowerCase().includes(queryLower)
    );
  }

  /**
   * Get credential requirements for a specific node
   */
  async getNodeCredentials(nodeName: string): Promise<N8nCredentialType[]> {
    if (!this.isEnabled) {
      return [];
    }

    try {
      const response = await fetch(`${this.mcpServerUrl}/tools/get_node_credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nodeName }),
      });

      if (!response.ok) {
        throw new Error(`MCP server returned ${response.status}`);
      }

      const result = await response.json() as McpToolResult;
      return (result.content || []) as N8nCredentialType[];
    } catch (error: any) {
      logger.error({ error, nodeName }, 'Failed to get node credentials via MCP');
      return [];
    }
  }

  /**
   * Convert n8n node to marketplace integration format
   */
  nodeToIntegration(node: N8nNode): any {
    const category = this.mapCategory(node.group);
    const slug = this.nodeNameToSlug(node.name);

    return {
      slug: `n8n-${slug}`,
      name: node.displayName,
      description: node.description || `Integrate ${node.displayName} with your WhatsApp bot`,
      category,
      icon_url: this.getIconUrl(node),
      is_n8n_node: true,
      requires_auth: node.credentials.length > 0,
      auth_type: node.credentials.length > 0 ? 'api_key' : 'none',
      n8n_node_type: node.name,
      pricing_model: 'free',
      popularity_score: 50, // Default score for n8n nodes
      is_featured: false,
      supported_features: this.extractFeatures(node),
      credentials_required: node.credentials.map(c => ({
        name: c.name,
        required: c.required,
      })),
    };
  }

  /**
   * Map n8n node groups to marketplace categories
   */
  private mapCategory(groups: string[]): string {
    for (const group of groups) {
      const mapped = CATEGORY_MAPPING[group.toLowerCase()];
      if (mapped) return mapped;
    }
    return 'specialized';
  }

  /**
   * Convert node name to slug
   */
  private nodeNameToSlug(nodeName: string): string {
    // Extract the actual node name (after the last dot)
    const parts = nodeName.split('.');
    const name = parts[parts.length - 1];

    // Convert camelCase to kebab-case
    return name
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
  }

  /**
   * Get icon URL for node
   */
  private getIconUrl(node: N8nNode): string {
    if (node.icon && node.icon.startsWith('http')) {
      return node.icon;
    }

    // Try to get from Clearbit based on node name
    const nodeName = node.displayName.toLowerCase().replace(/\s+/g, '');

    // Common domain mappings
    const domainMap: Record<string, string> = {
      'googlecalendar': 'google.com',
      'googlesheets': 'google.com',
      'gmail': 'google.com',
      'googledrive': 'google.com',
      'slack': 'slack.com',
      'shopify': 'shopify.com',
      'stripe': 'stripe.com',
      'hubspot': 'hubspot.com',
      'notion': 'notion.so',
      'airtable': 'airtable.com',
      'trello': 'trello.com',
      'asana': 'asana.com',
      'jira': 'atlassian.com',
      'salesforce': 'salesforce.com',
      'mailchimp': 'mailchimp.com',
      'sendgrid': 'sendgrid.com',
      'twilio': 'twilio.com',
      'zoom': 'zoom.us',
      'calendly': 'calendly.com',
      'wordpress': 'wordpress.com',
      'woocommerce': 'woocommerce.com',
      'telegram': 'telegram.org',
      'discord': 'discord.com',
      'paypal': 'paypal.com',
      'quickbooks': 'quickbooks.intuit.com',
      'xero': 'xero.com',
    };

    const domain = domainMap[nodeName];
    if (domain) {
      return `https://logo.clearbit.com/${domain}`;
    }

    // Fallback: try the node name as a domain
    return `https://logo.clearbit.com/${nodeName}.com`;
  }

  /**
   * Extract supported features from node properties
   */
  private extractFeatures(node: N8nNode): string[] {
    if (!node.properties) {
      return [];
    }

    const features: string[] = [];

    // Look for operation types
    for (const prop of node.properties) {
      if (prop.name === 'operation' && prop.options) {
        for (const opt of prop.options) {
          if (opt.value) {
            features.push(opt.value);
          }
        }
      }
    }

    return features.slice(0, 10); // Limit to 10 features
  }

  /**
   * Clear the node cache
   */
  clearCache(): void {
    this.cachedNodes = null;
    this.cacheTimestamp = 0;
    logger.info('n8n-MCP node cache cleared');
  }

  /**
   * Get service statistics
   */
  async getStatistics(): Promise<{
    enabled: boolean;
    connected: boolean;
    totalNodes: number;
    cachedAt: Date | null;
    categories: Record<string, number>;
  }> {
    const nodes = await this.getAllNodes();
    const categories: Record<string, number> = {};

    for (const node of nodes) {
      const category = this.mapCategory(node.group);
      categories[category] = (categories[category] || 0) + 1;
    }

    return {
      enabled: this.isEnabled,
      connected: await this.connect(),
      totalNodes: nodes.length,
      cachedAt: this.cacheTimestamp ? new Date(this.cacheTimestamp) : null,
      categories,
    };
  }
}

// Export singleton instance
export const n8nMcpService = new N8nMcpService();
