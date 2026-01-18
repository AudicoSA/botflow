import { supabase, supabaseAdmin } from '../config/supabase.js';
import { encryptionService } from './encryption.service.js';
import { credentialValidatorService } from './credential-validator.service.js';
import { logger } from '../config/logger.js';
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

// Note: We use supabaseAdmin (service role) for bot_integrations and integration_logs
// to bypass RLS policies that cause infinite recursion when querying organization_members

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

    // Get enabled integrations for this bot (use admin client to bypass RLS)
    const { data: botIntegrations, error: botIntegrationsError } = await supabaseAdmin
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

    // Check if already enabled (use admin client to bypass RLS)
    const { data: existing } = await supabaseAdmin
      .from('bot_integrations')
      .select('*')
      .eq('bot_id', bot_id)
      .eq('integration_id', integration.id)
      .single();

    if (existing) {
      throw new Error('Integration already enabled for this bot');
    }

    // Validate credentials before saving (if credentials provided and integration requires auth)
    if (credentials && Object.keys(credentials).length > 0 && integration.requires_auth) {
      logger.info({ integrationSlug, bot_id }, 'Validating credentials before enabling integration');
      const validationResult = await credentialValidatorService.validateCredentials(
        integrationSlug,
        credentials
      );

      if (!validationResult.valid) {
        throw new Error(`Credential validation failed: ${validationResult.message}`);
      }

      logger.info({ integrationSlug, validationResult }, 'Credentials validated successfully');
    }

    // Encrypt credentials before storing
    const encryptedCredentials = credentials
      ? encryptionService.encrypt(credentials)
      : encryptionService.encrypt({});

    // Create bot integration record (use admin client to bypass RLS)
    const { data: botIntegration, error } = await supabaseAdmin
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

    // Increment popularity score (use admin client)
    await supabaseAdmin
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
    if (credentials !== undefined && Object.keys(credentials).length > 0) {
      // Get the existing bot integration to find the integration slug for validation
      const existingIntegration = await this.getBotIntegration(botIntegrationId);

      // Get the integration details to check if it requires auth
      const { data: marketplaceIntegration } = await supabaseAdmin
        .from('integration_marketplace')
        .select('slug, requires_auth')
        .eq('id', existingIntegration.integration_id)
        .single();

      // Validate credentials if the integration requires auth
      if (marketplaceIntegration?.requires_auth) {
        logger.info({ botIntegrationId, slug: marketplaceIntegration.slug }, 'Validating updated credentials');
        const validationResult = await credentialValidatorService.validateCredentials(
          marketplaceIntegration.slug,
          credentials
        );

        if (!validationResult.valid) {
          throw new Error(`Credential validation failed: ${validationResult.message}`);
        }

        logger.info({ botIntegrationId, validationResult }, 'Updated credentials validated successfully');
      }

      // Encrypt credentials before storing
      updateData.credentials = encryptionService.encrypt(credentials);
    }
    if (configuration !== undefined) updateData.configuration = configuration;
    if (status !== undefined) updateData.status = status;

    // Use admin client to bypass RLS
    const { data: botIntegration, error } = await supabaseAdmin
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

    // Use admin client to bypass RLS
    const { error } = await supabaseAdmin
      .from('bot_integrations')
      .delete()
      .eq('id', botIntegrationId);

    if (error) {
      throw new Error(`Failed to disable integration: ${error.message}`);
    }
  }

  /**
   * Get all enabled integrations for a bot with full integration details
   */
  async getBotIntegrations(botId: string): Promise<BotIntegration[]> {
    // Use admin client to bypass RLS
    // Include joined integration details from integration_marketplace
    const { data, error } = await supabaseAdmin
      .from('bot_integrations')
      .select(`
        *,
        integration:integration_marketplace(
          id, name, slug, icon_url, category, description,
          requires_auth, setup_instructions, supported_features
        )
      `)
      .eq('bot_id', botId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get bot integrations: ${error.message}`);
    }

    // Decrypt credentials for each integration (but don't expose in list view for security)
    return (data || []).map((integration) => ({
      ...integration,
      // Don't expose credentials in list endpoint for security
      credentials: undefined,
    })) as BotIntegration[];
  }

  /**
   * Get a specific bot integration
   */
  async getBotIntegration(botIntegrationId: string): Promise<BotIntegration> {
    // Use admin client to bypass RLS
    const { data, error } = await supabaseAdmin
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
    // Use admin client to bypass RLS
    const { data, error } = await supabaseAdmin
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
    // Use admin client to bypass RLS
    const { error } = await supabaseAdmin.from('integration_logs').insert({
      bot_integration_id: botIntegrationId,
      ...log,
    });

    if (error) {
      console.error('Failed to log integration event:', error);
    }

    // Update last_synced_at and sync_count (use admin client)
    if (log.event_type === 'sync' && log.status === 'success') {
      await supabaseAdmin
        .from('bot_integrations')
        .update({
          last_synced_at: new Date().toISOString(),
          sync_count: supabaseAdmin.rpc('increment_sync_count', { row_id: botIntegrationId }),
        })
        .eq('id', botIntegrationId);
    }

    // Update status if error (use admin client)
    if (log.status === 'failure') {
      await supabaseAdmin
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
