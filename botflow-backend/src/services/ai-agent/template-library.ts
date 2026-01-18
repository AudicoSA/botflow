/**
 * Template Library Service (Phase 3 Week 3)
 *
 * Manages workflow templates - CRUD operations and search.
 * Templates are pre-built workflow blueprints that users can
 * instantiate and customize.
 */

import { supabase } from '../../config/supabase.js';
import { logger } from '../../config/logger.js';
import {
  WorkflowTemplate,
  TemplateCategory,
  TemplateVariable,
  ConfigurableField
} from '../../types/ai-agent.js';
import { Blueprint } from '../../types/workflow.js';

/**
 * Database row type for workflow_templates
 */
interface WorkflowTemplateRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
  icon: string;
  trigger_phrases: string[];
  keywords: string[];
  required_integrations: string[];
  vertical: string | null;
  blueprint: Blueprint;
  variables: TemplateVariable[];
  configurable_fields: ConfigurableField[];
  popularity_score: number;
  usage_count: number;
  success_rate: number;
  is_public: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Template usage row type
 */
interface TemplateUsageRow {
  id: string;
  template_id: string | null;
  bot_id: string;
  organization_id: string;
  customizations: Record<string, unknown>;
  deployed_at: string;
  is_active: boolean;
  messages_processed: number;
  successful_completions: number;
  user_rating: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Template filter options
 */
export interface TemplateFilterOptions {
  category?: TemplateCategory;
  vertical?: string;
  integrations?: string[];
  search?: string;
  isPublic?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'popularity' | 'usage' | 'name' | 'created';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Template creation data
 */
export interface CreateTemplateData {
  slug: string;
  name: string;
  category: TemplateCategory;
  description?: string;
  icon?: string;
  triggerPhrases: string[];
  keywords: string[];
  requiredIntegrations: string[];
  vertical?: string;
  blueprint: Blueprint;
  variables: TemplateVariable[];
  configurableFields: ConfigurableField[];
  isPublic?: boolean;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Convert database row to WorkflowTemplate
 */
function rowToTemplate(row: WorkflowTemplateRow): WorkflowTemplate {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category as TemplateCategory,
    description: row.description || '',
    triggerPhrases: row.trigger_phrases || [],
    requiredIntegrations: row.required_integrations || [],
    blueprint: row.blueprint,
    variables: row.variables || [],
    configurableFields: row.configurable_fields || [],
    vertical: row.vertical || undefined,
    popularityScore: row.popularity_score,
    isPublic: row.is_public,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

/**
 * Template Library Service
 */
export class TemplateLibraryService {
  /**
   * Get all templates with optional filtering
   */
  async getTemplates(options: TemplateFilterOptions = {}): Promise<PaginatedResult<WorkflowTemplate>> {
    const {
      category,
      vertical,
      integrations,
      search,
      isPublic = true,
      limit = 20,
      offset = 0,
      sortBy = 'popularity',
      sortOrder = 'desc'
    } = options;

    try {
      let query = supabase
        .from('workflow_templates')
        .select('*', { count: 'exact' });

      // Filter by public status
      if (isPublic !== undefined) {
        query = query.eq('is_public', isPublic);
      }

      // Filter by category
      if (category) {
        query = query.eq('category', category);
      }

      // Filter by vertical
      if (vertical) {
        query = query.eq('vertical', vertical);
      }

      // Filter by required integrations (templates that require these integrations)
      if (integrations && integrations.length > 0) {
        query = query.contains('required_integrations', integrations);
      }

      // Search by name, description, or keywords
      if (search) {
        const searchLower = search.toLowerCase();
        query = query.or(
          `name.ilike.%${searchLower}%,description.ilike.%${searchLower}%,keywords.cs.{${searchLower}}`
        );
      }

      // Sorting
      const sortColumn = {
        popularity: 'popularity_score',
        usage: 'usage_count',
        name: 'name',
        created: 'created_at'
      }[sortBy] || 'popularity_score';

      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error({ error }, 'Failed to fetch templates');
        throw new Error(`Failed to fetch templates: ${error.message}`);
      }

      const templates = (data || []).map(rowToTemplate);

      return {
        items: templates,
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      };
    } catch (error) {
      logger.error({ error }, 'Error in getTemplates');
      throw error;
    }
  }

  /**
   * Get a single template by slug
   */
  async getTemplateBySlug(slug: string): Promise<WorkflowTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to fetch template: ${error.message}`);
      }

      return rowToTemplate(data);
    } catch (error) {
      logger.error({ error, slug }, 'Error in getTemplateBySlug');
      throw error;
    }
  }

  /**
   * Get a single template by ID
   */
  async getTemplateById(id: string): Promise<WorkflowTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch template: ${error.message}`);
      }

      return rowToTemplate(data);
    } catch (error) {
      logger.error({ error, id }, 'Error in getTemplateById');
      throw error;
    }
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: TemplateCategory): Promise<WorkflowTemplate[]> {
    const result = await this.getTemplates({ category, limit: 100 });
    return result.items;
  }

  /**
   * Get all categories with counts
   */
  async getCategories(): Promise<Array<{ name: string; count: number }>> {
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('category')
        .eq('is_public', true);

      if (error) {
        throw new Error(`Failed to fetch categories: ${error.message}`);
      }

      // Count by category
      const counts = (data || []).reduce((acc, row) => {
        acc[row.category] = (acc[row.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(counts).map(([name, count]) => ({
        name,
        count
      })).sort((a, b) => b.count - a.count);
    } catch (error) {
      logger.error({ error }, 'Error in getCategories');
      throw error;
    }
  }

  /**
   * Search templates by query
   */
  async searchTemplates(query: string, limit = 10): Promise<WorkflowTemplate[]> {
    try {
      const searchLower = query.toLowerCase().trim();

      // Search in trigger phrases, keywords, name, and description
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_public', true)
        .or(
          `name.ilike.%${searchLower}%,description.ilike.%${searchLower}%`
        )
        .order('popularity_score', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to search templates: ${error.message}`);
      }

      return (data || []).map(rowToTemplate);
    } catch (error) {
      logger.error({ error, query }, 'Error in searchTemplates');
      throw error;
    }
  }

  /**
   * Get recommended templates for a bot based on its vertical and integrations
   */
  async getRecommendedTemplates(
    vertical?: string,
    availableIntegrations: string[] = [],
    limit = 5
  ): Promise<WorkflowTemplate[]> {
    try {
      let query = supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_public', true);

      // Prioritize templates that match the vertical
      if (vertical) {
        query = query.or(`vertical.eq.${vertical},vertical.is.null`);
      }

      query = query
        .order('popularity_score', { ascending: false })
        .limit(limit * 2); // Get more to filter

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch recommended templates: ${error.message}`);
      }

      // Score and sort templates
      const templates = (data || []).map(row => {
        const template = rowToTemplate(row);
        let score = template.popularityScore;

        // Boost if vertical matches
        if (vertical && template.vertical === vertical) {
          score += 50;
        }

        // Boost if user has required integrations
        const hasIntegrations = template.requiredIntegrations.every(
          int => availableIntegrations.includes(int)
        );
        if (hasIntegrations) {
          score += 30;
        }

        return { template, score };
      });

      return templates
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(t => t.template);
    } catch (error) {
      logger.error({ error }, 'Error in getRecommendedTemplates');
      throw error;
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(data: CreateTemplateData): Promise<WorkflowTemplate> {
    try {
      const { data: result, error } = await supabase
        .from('workflow_templates')
        .insert({
          slug: data.slug,
          name: data.name,
          category: data.category,
          description: data.description || null,
          icon: data.icon || 'workflow',
          trigger_phrases: data.triggerPhrases,
          keywords: data.keywords,
          required_integrations: data.requiredIntegrations,
          vertical: data.vertical || null,
          blueprint: data.blueprint,
          variables: data.variables,
          configurable_fields: data.configurableFields,
          is_public: data.isPublic !== false
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create template: ${error.message}`);
      }

      logger.info({ slug: data.slug }, 'Template created');
      return rowToTemplate(result);
    } catch (error) {
      logger.error({ error, data }, 'Error in createTemplate');
      throw error;
    }
  }

  /**
   * Update a template
   */
  async updateTemplate(
    slug: string,
    updates: Partial<CreateTemplateData>
  ): Promise<WorkflowTemplate> {
    try {
      const updateData: Record<string, unknown> = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.category) updateData.category = updates.category;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.icon) updateData.icon = updates.icon;
      if (updates.triggerPhrases) updateData.trigger_phrases = updates.triggerPhrases;
      if (updates.keywords) updateData.keywords = updates.keywords;
      if (updates.requiredIntegrations) updateData.required_integrations = updates.requiredIntegrations;
      if (updates.vertical !== undefined) updateData.vertical = updates.vertical;
      if (updates.blueprint) updateData.blueprint = updates.blueprint;
      if (updates.variables) updateData.variables = updates.variables;
      if (updates.configurableFields) updateData.configurable_fields = updates.configurableFields;
      if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;

      const { data, error } = await supabase
        .from('workflow_templates')
        .update(updateData)
        .eq('slug', slug)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update template: ${error.message}`);
      }

      logger.info({ slug }, 'Template updated');
      return rowToTemplate(data);
    } catch (error) {
      logger.error({ error, slug, updates }, 'Error in updateTemplate');
      throw error;
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(slug: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .delete()
        .eq('slug', slug);

      if (error) {
        throw new Error(`Failed to delete template: ${error.message}`);
      }

      logger.info({ slug }, 'Template deleted');
      return true;
    } catch (error) {
      logger.error({ error, slug }, 'Error in deleteTemplate');
      throw error;
    }
  }

  /**
   * Record template usage when instantiated
   */
  async recordUsage(
    templateId: string,
    botId: string,
    organizationId: string,
    customizations: Record<string, unknown> = {}
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('workflow_template_usage')
        .insert({
          template_id: templateId,
          bot_id: botId,
          organization_id: organizationId,
          customizations
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to record template usage: ${error.message}`);
      }

      logger.info({ templateId, botId }, 'Template usage recorded');
      return data.id;
    } catch (error) {
      logger.error({ error, templateId, botId }, 'Error in recordUsage');
      throw error;
    }
  }

  /**
   * Update usage metrics
   */
  async updateUsageMetrics(
    usageId: string,
    metrics: {
      messagesProcessed?: number;
      successfulCompletions?: number;
      userRating?: number;
    }
  ): Promise<void> {
    try {
      const updates: Record<string, unknown> = {};

      if (metrics.messagesProcessed !== undefined) {
        updates.messages_processed = metrics.messagesProcessed;
      }
      if (metrics.successfulCompletions !== undefined) {
        updates.successful_completions = metrics.successfulCompletions;
      }
      if (metrics.userRating !== undefined) {
        updates.user_rating = metrics.userRating;
      }

      const { error } = await supabase
        .from('workflow_template_usage')
        .update(updates)
        .eq('id', usageId);

      if (error) {
        throw new Error(`Failed to update usage metrics: ${error.message}`);
      }
    } catch (error) {
      logger.error({ error, usageId, metrics }, 'Error in updateUsageMetrics');
      throw error;
    }
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(templateId: string): Promise<{
    totalUsage: number;
    activeUsage: number;
    averageRating: number | null;
    successRate: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('workflow_template_usage')
        .select('*')
        .eq('template_id', templateId);

      if (error) {
        throw new Error(`Failed to fetch template stats: ${error.message}`);
      }

      const usage = data || [];
      const activeUsage = usage.filter(u => u.is_active).length;
      const ratings = usage.filter(u => u.user_rating !== null).map(u => u.user_rating as number);
      const totalMessages = usage.reduce((sum, u) => sum + (u.messages_processed || 0), 0);
      const totalSuccess = usage.reduce((sum, u) => sum + (u.successful_completions || 0), 0);

      return {
        totalUsage: usage.length,
        activeUsage,
        averageRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
        successRate: totalMessages > 0 ? (totalSuccess / totalMessages) * 100 : 0
      };
    } catch (error) {
      logger.error({ error, templateId }, 'Error in getTemplateStats');
      throw error;
    }
  }

  /**
   * Bulk upsert templates (for seeding)
   */
  async bulkUpsert(templates: CreateTemplateData[]): Promise<number> {
    try {
      let successCount = 0;

      for (const template of templates) {
        try {
          // Check if exists
          const existing = await this.getTemplateBySlug(template.slug);

          if (existing) {
            await this.updateTemplate(template.slug, template);
          } else {
            await this.createTemplate(template);
          }

          successCount++;
        } catch (error) {
          logger.warn({ error, slug: template.slug }, 'Failed to upsert template');
        }
      }

      logger.info({ total: templates.length, success: successCount }, 'Bulk upsert completed');
      return successCount;
    } catch (error) {
      logger.error({ error }, 'Error in bulkUpsert');
      throw error;
    }
  }
}

// Singleton instance
let instance: TemplateLibraryService | null = null;

/**
 * Get the TemplateLibraryService singleton
 */
export function getTemplateLibrary(): TemplateLibraryService {
  if (!instance) {
    instance = new TemplateLibraryService();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetTemplateLibrary(): void {
  instance = null;
}
