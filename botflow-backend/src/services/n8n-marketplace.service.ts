/**
 * n8n Marketplace Service
 * Dynamic integration marketplace powered by n8n MCP
 *
 * This service fetches available n8n nodes and maps them to marketplace integrations
 * giving us access to 400+ integrations automatically!
 */

import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

// Category mapping from n8n node types to marketplace categories
const CATEGORY_MAPPING: Record<string, string> = {
  // Calendar & Scheduling
  'googleCalendar': 'calendar',
  'calendly': 'calendar',
  'microsoftOutlook': 'calendar',

  // E-commerce
  'shopify': 'ecommerce',
  'wooCommerce': 'ecommerce',
  'magento': 'ecommerce',
  'bigCommerce': 'ecommerce',
  'prestashop': 'ecommerce',

  // Payment
  'stripe': 'payment',
  'paypal': 'payment',
  'square': 'payment',
  'paystack': 'payment',

  // CRM
  'hubspot': 'crm',
  'salesforce': 'crm',
  'pipedrive': 'crm',
  'zohoCrm': 'crm',

  // Communication
  'slack': 'communication',
  'gmail': 'communication',
  'microsoftTeams': 'communication',
  'telegram': 'communication',
  'discord': 'communication',
  'mailchimp': 'communication',
  'sendGrid': 'communication',
  'twilio': 'communication',

  // Productivity
  'googleSheets': 'productivity',
  'airtable': 'productivity',
  'notion': 'productivity',
  'trello': 'productivity',
  'asana': 'productivity',
  'monday': 'productivity',
  'jira': 'productivity',
  'wordpress': 'productivity',

  // Analytics
  'googleAnalytics': 'analytics',
  'mixpanel': 'analytics',
  'segment': 'analytics',

  // Specialized
  'quickbooks': 'specialized',
  'xero': 'specialized',
  'zoom': 'specialized'
};

// Featured integrations (most popular)
const FEATURED_INTEGRATIONS = [
  'googleCalendar',
  'shopify',
  'stripe',
  'hubspot',
  'wordpress',
  'googleSheets',
  'notion',
  'mailchimp',
  'calendly',
  'slack'
];

interface N8nNode {
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  credentials?: any[];
  properties?: any[];
}

interface MarketplaceIntegration {
  slug: string;
  name: string;
  category: string;
  description: string;
  icon_url?: string;
  requires_auth: boolean;
  pricing_model: string;
  is_featured: boolean;
  n8n_node_name: string;
  popularity_score: number;
  supported_features: string[];
}

export class N8nMarketplaceService {
  private n8nApiUrl: string;
  private n8nApiKey: string;
  private cachedNodes: N8nNode[] | null = null;
  private cacheTimestamp: number = 0;
  private cacheDuration = 3600000; // 1 hour

  constructor() {
    this.n8nApiUrl = env.N8N_API_URL || '';
    this.n8nApiKey = env.N8N_API_KEY || '';
  }

  /**
   * Fetch all available n8n nodes
   * This is cached for 1 hour to avoid excessive API calls
   */
  async getAvailableNodes(): Promise<N8nNode[]> {
    // Check cache
    const now = Date.now();
    if (this.cachedNodes && (now - this.cacheTimestamp) < this.cacheDuration) {
      logger.debug('Returning cached n8n nodes');
      return this.cachedNodes;
    }

    try {
      logger.info('Fetching n8n nodes from API');

      // If n8n MCP is available, use it
      // Otherwise fall back to HTTP API
      if (this.isN8nMcpAvailable()) {
        this.cachedNodes = await this.fetchNodesViaMcp();
      } else {
        this.cachedNodes = await this.fetchNodesViaHttp();
      }

      this.cacheTimestamp = now;
      logger.info(`Cached ${this.cachedNodes.length} n8n nodes`);

      return this.cachedNodes;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch n8n nodes');

      // Return empty array if fetch fails
      return [];
    }
  }

  /**
   * Check if n8n MCP is available
   */
  private isN8nMcpAvailable(): boolean {
    // Check if n8n MCP server is configured
    // This would check for MCP connection
    return false; // TODO: Implement MCP detection
  }

  /**
   * Fetch nodes via n8n MCP (preferred method)
   */
  private async fetchNodesViaMcp(): Promise<N8nNode[]> {
    // TODO: Use n8n MCP to fetch nodes
    // For now, return empty array
    logger.info('n8n MCP not yet implemented');
    return [];
  }

  /**
   * Fetch nodes via n8n HTTP API (fallback)
   */
  private async fetchNodesViaHttp(): Promise<N8nNode[]> {
    if (!this.n8nApiUrl || !this.n8nApiKey) {
      logger.warn('n8n API not configured - cannot fetch nodes');
      return [];
    }

    try {
      const response = await fetch(`${this.n8nApiUrl}/types/nodes`, {
        headers: {
          'X-N8N-API-KEY': this.n8nApiKey
        }
      });

      if (!response.ok) {
        throw new Error(`n8n API returned ${response.status}`);
      }

      const data = await response.json();
      return data.nodes || [];
    } catch (error) {
      logger.error({ error }, 'Failed to fetch nodes from n8n HTTP API');
      return [];
    }
  }

  /**
   * Map n8n nodes to marketplace integrations
   */
  async getMarketplaceIntegrations(): Promise<MarketplaceIntegration[]> {
    const nodes = await this.getAvailableNodes();

    return nodes
      .filter(node => this.isIntegrationNode(node))
      .map(node => this.nodeToIntegration(node))
      .sort((a, b) => b.popularity_score - a.popularity_score);
  }

  /**
   * Check if a node is an integration (not a core node)
   */
  private isIntegrationNode(node: N8nNode): boolean {
    // Filter out core nodes (If, Switch, Set, etc.)
    const coreNodes = ['if', 'switch', 'set', 'function', 'code', 'merge', 'split'];
    const nodeName = node.name.toLowerCase();

    // Core nodes typically don't require credentials
    if (!node.credentials || node.credentials.length === 0) {
      return false;
    }

    // Exclude core nodes
    if (coreNodes.some(core => nodeName.includes(core))) {
      return false;
    }

    return true;
  }

  /**
   * Convert n8n node to marketplace integration
   */
  private nodeToIntegration(node: N8nNode): MarketplaceIntegration {
    const slug = this.nodeNameToSlug(node.name);
    const category = this.categorizeNode(node);
    const isFeatured = FEATURED_INTEGRATIONS.includes(this.extractNodeId(node.name));

    return {
      slug,
      name: node.displayName,
      category,
      description: node.description || `Integrate ${node.displayName} with your WhatsApp bot`,
      icon_url: this.getIconUrl(node),
      requires_auth: (node.credentials?.length || 0) > 0,
      pricing_model: 'free', // Most n8n integrations are free
      is_featured: isFeatured,
      n8n_node_name: node.name,
      popularity_score: this.calculatePopularity(node),
      supported_features: this.extractFeatures(node)
    };
  }

  /**
   * Convert node name to slug (e.g., 'n8n-nodes-base.googleSheets' -> 'google-sheets')
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
   * Extract node ID (e.g., 'n8n-nodes-base.googleSheets' -> 'googleSheets')
   */
  private extractNodeId(nodeName: string): string {
    const parts = nodeName.split('.');
    return parts[parts.length - 1];
  }

  /**
   * Categorize node based on its name and type
   */
  private categorizeNode(node: N8nNode): string {
    const nodeId = this.extractNodeId(node.name);

    // Check predefined mapping
    if (CATEGORY_MAPPING[nodeId]) {
      return CATEGORY_MAPPING[nodeId];
    }

    // Fallback: categorize based on keywords in name
    const nameLower = node.displayName.toLowerCase();

    if (nameLower.includes('calendar') || nameLower.includes('schedule')) {
      return 'calendar';
    }
    if (nameLower.includes('shop') || nameLower.includes('commerce')) {
      return 'ecommerce';
    }
    if (nameLower.includes('payment') || nameLower.includes('pay')) {
      return 'payment';
    }
    if (nameLower.includes('crm') || nameLower.includes('sales')) {
      return 'crm';
    }
    if (nameLower.includes('mail') || nameLower.includes('email') || nameLower.includes('sms')) {
      return 'communication';
    }
    if (nameLower.includes('sheet') || nameLower.includes('database') || nameLower.includes('table')) {
      return 'productivity';
    }
    if (nameLower.includes('analytic') || nameLower.includes('track')) {
      return 'analytics';
    }

    return 'specialized';
  }

  /**
   * Get icon URL for node
   */
  private getIconUrl(node: N8nNode): string {
    if (node.icon && node.icon.startsWith('http')) {
      return node.icon;
    }

    // Default icon based on category
    const category = this.categorizeNode(node);
    const defaultIcons: Record<string, string> = {
      calendar: '📅',
      ecommerce: '🛒',
      payment: '💳',
      crm: '👥',
      communication: '💬',
      productivity: '⚡',
      analytics: '📊',
      specialized: '🎯'
    };

    return defaultIcons[category] || '🔌';
  }

  /**
   * Calculate popularity score (0-100)
   */
  private calculatePopularity(node: N8nNode): number {
    const nodeId = this.extractNodeId(node.name);

    // Featured integrations get high scores
    if (FEATURED_INTEGRATIONS.includes(nodeId)) {
      return 90 + Math.floor(Math.random() * 10);
    }

    // Others get medium scores
    return 50 + Math.floor(Math.random() * 30);
  }

  /**
   * Extract supported features from node properties
   */
  private extractFeatures(node: N8nNode): string[] {
    if (!node.properties) {
      return [];
    }

    const features: string[] = [];

    // Look for common operation types
    const operations = node.properties
      .filter((prop: any) => prop.name === 'operation' && prop.options)
      .flatMap((prop: any) => prop.options.map((opt: any) => opt.value));

    return operations;
  }

  /**
   * Search integrations
   */
  async searchIntegrations(query: string): Promise<MarketplaceIntegration[]> {
    const integrations = await this.getMarketplaceIntegrations();
    const queryLower = query.toLowerCase();

    return integrations.filter(integration =>
      integration.name.toLowerCase().includes(queryLower) ||
      integration.description.toLowerCase().includes(queryLower) ||
      integration.slug.includes(queryLower)
    );
  }

  /**
   * Get integrations by category
   */
  async getIntegrationsByCategory(category: string): Promise<MarketplaceIntegration[]> {
    const integrations = await this.getMarketplaceIntegrations();
    return integrations.filter(integration => integration.category === category);
  }

  /**
   * Get integration statistics
   */
  async getStatistics() {
    const integrations = await this.getMarketplaceIntegrations();

    const stats = {
      total: integrations.length,
      featured: integrations.filter(i => i.is_featured).length,
      byCategory: {} as Record<string, number>
    };

    // Count by category
    integrations.forEach(integration => {
      stats.byCategory[integration.category] = (stats.byCategory[integration.category] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.cachedNodes = null;
    this.cacheTimestamp = 0;
    logger.info('n8n nodes cache cleared');
  }
}

// Export singleton instance
export const n8nMarketplaceService = new N8nMarketplaceService();
