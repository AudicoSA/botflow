import { supabase } from '../config/supabase.js';
import { encryptionService } from './encryption.service.js';
import type {
  Integration,
  BotIntegration,
  IntegrationLog,
  ListIntegrationsQuery,
  ListIntegrationsResponse,
  EnableIntegrationRequest,
  UpdateIntegrationRequest,
  IntegrationWithStatus,
  IntegrationCategory,
} from '../types/marketplace.js';

export class IntegrationMarketplaceService {
  /**
   * List all available integrations with optional filtering
   */
  async listIntegrations(
    query: ListIntegrationsQuery = {}
  ): Promise<ListIntegrationsResponse> {
    const {
      category,
      search,
      vertical,
      featured,
      page = 1,
      per_page = 20,
    } = query;

    let supabaseQuery = supabase
      .from('integration_marketplace')
      .select('*', { count: 'exact' });

    // Apply filters
    if (category) {
      supabaseQuery = supabaseQuery.eq('category', category);
    }

    if (featured !== undefined) {
      supabaseQuery = supabaseQuery.eq('is_featured', featured);
    }

    if (vertical) {
      supabaseQuery = supabaseQuery.contains('recommended_for_verticals', [vertical]);
    }

    if (search) {
      supabaseQuery = supabaseQuery.or(
        `name.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    // Pagination
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;
    supabaseQuery = supabaseQuery.range(from, to);

    // Order by popularity and featured status
    supabaseQuery = supabaseQuery.order('is_featured', { ascending: false });
    supabaseQuery = supabaseQuery.order('popularity_score', { ascending: false });

    const { data, error, count } = await supabaseQuery;

    if (error) {
      throw new Error(`Failed to list integrations: ${error.message}`);
    }

    return {
      integrations: data as Integration[],
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    };
  }

  /**
   * Get a single integration by slug
   */
  async getIntegration(slug: string): Promise<Integration> {
    const { data, error } = await supabase
      .from('integration_marketplace')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      throw new Error(`Failed to get integration: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Integration not found: ${slug}`);
    }

    return data as Integration;
  }

  /**
   * Get recommended integrations for a specific bot based on its template vertical
   */
  async getRecommendedForBot(botId: string): Promise<IntegrationWithStatus[]> {
    // Get bot details
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('template_vertical')
      .eq('id', botId)
      .single();

    if (botError) {
      throw new Error(`Failed to get bot: ${botError.message}`);
    }

    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    const vertical = bot.template_vertical;

    // Get recommended integrations for this vertical
    const { data: integrations, error: integrationsError } = await supabase
      .from('integration_marketplace')
      .select('*')
      .contains('recommended_for_verticals', [vertical])
      .order('is_featured', { ascending: false })
      .order('popularity_score', { ascending: false });

    if (integrationsError) {
      throw new Error(`Failed to get recommended integrations: ${integrationsError.message}`);
    }

    // Get enabled integrations for this bot
    const { data: botIntegrations, error: botIntegrationsError } = await supabase
      .from('bot_integrations')
      .select('integration_id, id, status')
      .eq('bot_id', botId);

    if (botIntegrationsError) {
      throw new Error(`Failed to get bot integrations: ${botIntegrationsError.message}`);
    }

    // Merge integration data with enabled status
    const enabledMap = new Map(
      botIntegrations?.map((bi) => [bi.integration_id, { id: bi.id, status: bi.status }]) || []
    );

    const result: IntegrationWithStatus[] = (integrations || []).map((integration) => {
      const enabled = enabledMap.has(integration.id);
      const botIntegrationData = enabledMap.get(integration.id);

      return {
        ...integration,
        enabled,
        bot_integration_id: botIntegrationData?.id,
        bot_integration_status: botIntegrationData?.status,
      } as IntegrationWithStatus;
    });

    return result;
  }

  /**
   * Enable an integration for a bot
   */
  async enableIntegration(
    integrationSlug: string,
    request: EnableIntegrationRequest
  ): Promise<BotIntegration> {
    const { bot_id, credentials, configuration } = request;

    // Get integration details
    const integration = await this.getIntegration(integrationSlug);

    // Check if already enabled
    const { data: existing } = await supabase
      .from('bot_integrations')
      .select('*')
      .eq('bot_id', bot_id)
      .eq('integration_id', integration.id)
      .single();

    if (existing) {
      throw new Error('Integration already enabled for this bot');
    }

    // Encrypt credentials before storing
    const encryptedCredentials = credentials
      ? encryptionService.encrypt(credentials)
      : encryptionService.encrypt({});

    // Create bot integration record
    const { data: botIntegration, error } = await supabase
      .from('bot_integrations')
      .insert({
        bot_id,
        integration_id: integration.id,
        credentials: encryptedCredentials,
        configuration: configuration || {},
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to enable integration: ${error.message}`);
    }

    // Log the event
    await this.logIntegrationEvent(botIntegration.id, {
      event_type: 'sync',
      status: 'success',
      message: 'Integration enabled successfully',
    });

    // Increment popularity score
    await supabase
      .from('integration_marketplace')
      .update({ popularity_score: integration.popularity_score + 1 })
      .eq('id', integration.id);

    return botIntegration as BotIntegration;
  }

  /**
   * Update an integration configuration
   */
  async updateIntegration(
    botIntegrationId: string,
    request: UpdateIntegrationRequest
  ): Promise<BotIntegration> {
    const { credentials, configuration, status } = request;

    const updateData: any = {};
    if (credentials !== undefined) {
      // Encrypt credentials before storing
      updateData.credentials = encryptionService.encrypt(credentials);
    }
    if (configuration !== undefined) updateData.configuration = configuration;
    if (status !== undefined) updateData.status = status;

    const { data: botIntegration, error } = await supabase
      .from('bot_integrations')
      .update(updateData)
      .eq('id', botIntegrationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update integration: ${error.message}`);
    }

    // Log the event
    await this.logIntegrationEvent(botIntegrationId, {
      event_type: 'sync',
      status: 'success',
      message: 'Integration updated successfully',
    });

    return botIntegration as BotIntegration;
  }

  /**
   * Disable an integration for a bot
   */
  async disableIntegration(botIntegrationId: string): Promise<void> {
    // Log before deletion
    await this.logIntegrationEvent(botIntegrationId, {
      event_type: 'sync',
      status: 'success',
      message: 'Integration disabled',
    });

    const { error } = await supabase
      .from('bot_integrations')
      .delete()
      .eq('id', botIntegrationId);

    if (error) {
      throw new Error(`Failed to disable integration: ${error.message}`);
    }
  }

  /**
   * Get all enabled integrations for a bot
   */
  async getBotIntegrations(botId: string): Promise<BotIntegration[]> {
    const { data, error } = await supabase
      .from('bot_integrations')
      .select('*')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get bot integrations: ${error.message}`);
    }

    // Decrypt credentials for each integration
    return (data || []).map((integration) => ({
      ...integration,
      credentials: this.decryptCredentials(integration.credentials),
    })) as BotIntegration[];
  }

  /**
   * Get a specific bot integration
   */
  async getBotIntegration(botIntegrationId: string): Promise<BotIntegration> {
    const { data, error } = await supabase
      .from('bot_integrations')
      .select('*')
      .eq('id', botIntegrationId)
      .single();

    if (error) {
      throw new Error(`Failed to get bot integration: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Bot integration not found: ${botIntegrationId}`);
    }

    // Decrypt credentials before returning
    return {
      ...data,
      credentials: this.decryptCredentials(data.credentials),
    } as BotIntegration;
  }

  /**
   * Get integration logs for a bot integration
   */
  async getIntegrationLogs(
    botIntegrationId: string,
    limit: number = 50
  ): Promise<IntegrationLog[]> {
    const { data, error } = await supabase
      .from('integration_logs')
      .select('*')
      .eq('bot_integration_id', botIntegrationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get integration logs: ${error.message}`);
    }

    return data as IntegrationLog[];
  }

  /**
   * Log an integration event
   */
  async logIntegrationEvent(
    botIntegrationId: string,
    log: {
      event_type: string;
      status: string;
      message?: string;
      request_data?: Record<string, any>;
      response_data?: Record<string, any>;
      error_details?: Record<string, any>;
      duration_ms?: number;
    }
  ): Promise<void> {
    const { error } = await supabase.from('integration_logs').insert({
      bot_integration_id: botIntegrationId,
      ...log,
    });

    if (error) {
      console.error('Failed to log integration event:', error);
    }

    // Update last_synced_at and sync_count
    if (log.event_type === 'sync' && log.status === 'success') {
      await supabase
        .from('bot_integrations')
        .update({
          last_synced_at: new Date().toISOString(),
          sync_count: supabase.rpc('increment_sync_count', { row_id: botIntegrationId }),
        })
        .eq('id', botIntegrationId);
    }

    // Update status if error
    if (log.status === 'failure') {
      await supabase
        .from('bot_integrations')
        .update({
          status: 'error',
          error_message: log.message || 'Unknown error',
        })
        .eq('id', botIntegrationId);
    }
  }

  /**
   * Decrypt credentials helper
   * @private
   */
  private decryptCredentials(credentials: any): Record<string, any> {
    if (!credentials) {
      return {};
    }

    // If it's a string, it might be encrypted
    if (typeof credentials === 'string') {
      return encryptionService.safeDecrypt(credentials);
    }

    // If it's already an object, return as-is (backward compatibility)
    return credentials;
  }

  /**
   * Get integration categories with counts
   */
  async getCategories(): Promise<Array<{ category: IntegrationCategory; count: number }>> {
    const { data, error } = await supabase
      .from('integration_marketplace')
      .select('category')
      .order('category');

    if (error) {
      throw new Error(`Failed to get categories: ${error.message}`);
    }

    // Count occurrences
    const categoryCounts = new Map<IntegrationCategory, number>();
    data?.forEach((item) => {
      const count = categoryCounts.get(item.category) || 0;
      categoryCounts.set(item.category, count + 1);
    });

    return Array.from(categoryCounts.entries()).map(([category, count]) => ({
      category,
      count,
    }));
  }
}

export const integrationMarketplaceService = new IntegrationMarketplaceService();
