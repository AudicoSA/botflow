import type { FastifyInstance } from 'fastify';
import { icalSyncService } from '../services/ical-sync.service.js';
import { propertyAvailabilityService } from '../services/property-availability.service.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

/**
 * Properties API Routes
 * Manages vacation rental properties and their calendar availability
 */
export async function propertiesRoutes(fastify: FastifyInstance) {
  // Create a new property
  fastify.post('/properties', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const user = request.user as { id: string };
      const body = request.body as any;

      logger.info(`[Properties API] Creating property for user ${user.id}`);

      // Get user's organization
      const { data: member, error: memberError } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        return reply.code(403).send({ error: 'User not in organization' });
      }

      // Validate required fields
      if (!body.name || !body.ical_urls) {
        return reply.code(400).send({ error: 'Missing required fields: name, ical_urls' });
      }

      // Create property
      const { data: property, error: createError } = await supabaseAdmin
        .from('properties')
        .insert({
          organization_id: member.organization_id,
          bot_id: body.bot_id || null,
          name: body.name,
          timezone: body.timezone || 'Africa/Johannesburg',
          ical_urls: body.ical_urls,
          min_nights: body.min_nights || 1,
          max_nights: body.max_nights || 365,
          check_in_time: body.check_in_time || '14:00',
          check_out_time: body.check_out_time || '10:00',
          buffer_days: body.buffer_days || 0,
          sync_frequency_minutes: body.sync_frequency_minutes || 15
        })
        .select()
        .single();

      if (createError) {
        logger.error(`[Properties API] Failed to create property: ${createError.message}`);
        return reply.code(400).send({ error: createError.message });
      }

      logger.info(`[Properties API] Created property ${property.id}: ${property.name}`);

      // Trigger initial sync in background
      icalSyncService.syncProperty(property.id).catch(error => {
        logger.error(`[Properties API] Initial sync failed: ${error}`);
      });

      return reply.send({
        property,
        message: 'Property created. Initial calendar sync started in background.'
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[Properties API] Create property error: ${errorMsg}`);
      return reply.code(500).send({ error: 'Failed to create property' });
    }
  });

  // Get all properties for user's organization
  fastify.get('/properties', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const user = request.user as { id: string };

      // Get user's organization
      const { data: member } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!member) {
        return reply.code(403).send({ error: 'User not in organization' });
      }

      // Get properties
      const { data: properties, error } = await supabaseAdmin
        .from('properties')
        .select('*')
        .eq('organization_id', member.organization_id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return reply.send({ properties: properties || [] });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[Properties API] Get properties error: ${errorMsg}`);
      return reply.code(500).send({ error: 'Failed to fetch properties' });
    }
  });

  // Get a single property by ID
  fastify.get('/properties/:id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as { id: string };

      // Get property and verify ownership
      const { data: property, error } = await supabaseAdmin
        .from('properties')
        .select(`
          *,
          organization:organizations!inner(id, name)
        `)
        .eq('id', id)
        .single();

      if (error || !property) {
        return reply.code(404).send({ error: 'Property not found' });
      }

      // Verify user has access to this organization
      const { data: member } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('organization_id', property.organization.id)
        .single();

      if (!member) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      return reply.send({ property });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[Properties API] Get property error: ${errorMsg}`);
      return reply.code(500).send({ error: 'Failed to fetch property' });
    }
  });

  // Update a property
  fastify.patch('/properties/:id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;

      logger.info(`[Properties API] Updating property ${id}`);

      const { data: property, error } = await supabaseAdmin
        .from('properties')
        .update({
          name: body.name,
          ical_urls: body.ical_urls,
          min_nights: body.min_nights,
          max_nights: body.max_nights,
          check_in_time: body.check_in_time,
          check_out_time: body.check_out_time,
          buffer_days: body.buffer_days,
          sync_frequency_minutes: body.sync_frequency_minutes,
          timezone: body.timezone
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      // If iCal URLs changed, trigger sync
      if (body.ical_urls) {
        icalSyncService.syncProperty(id).catch(error => {
          logger.error(`[Properties API] Sync after update failed: ${error}`);
        });
      }

      return reply.send({ property });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[Properties API] Update property error: ${errorMsg}`);
      return reply.code(500).send({ error: 'Failed to update property' });
    }
  });

  // Delete a property
  fastify.delete('/properties/:id', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      logger.info(`[Properties API] Deleting property ${id}`);

      const { error } = await supabaseAdmin
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) {
        return reply.code(400).send({ error: error.message });
      }

      return reply.send({ message: 'Property deleted successfully' });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[Properties API] Delete property error: ${errorMsg}`);
      return reply.code(500).send({ error: 'Failed to delete property' });
    }
  });

  // Trigger property sync manually
  fastify.post('/properties/:id/sync', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      logger.info(`[Properties API] Manual sync triggered for property ${id}`);

      const result = await icalSyncService.syncProperty(id);

      return reply.send(result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[Properties API] Sync error: ${errorMsg}`);
      return reply.code(500).send({ error: 'Sync failed' });
    }
  });

  // Check availability for a property (public endpoint for AI bot)
  fastify.get('/properties/:id/availability', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { start, end } = request.query as { start?: string; end?: string };

      if (!start || !end) {
        return reply.code(400).send({
          error: 'Missing required query parameters: start and end (YYYY-MM-DD format)'
        });
      }

      logger.info(`[Properties API] Availability check: ${id} from ${start} to ${end}`);

      const result = await propertyAvailabilityService.checkAvailability(id, {
        startDate: start,
        endDate: end
      });

      return reply.send(result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[Properties API] Availability check error: ${errorMsg}`);
      return reply.code(500).send({ error: 'Failed to check availability' });
    }
  });

  // Get blocked dates for a property
  fastify.get('/properties/:id/blocked-dates', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { from, to } = request.query as { from?: string; to?: string };

      logger.info(`[Properties API] Getting blocked dates for ${id}`);

      const blockedDates = await propertyAvailabilityService.getBlockedDates(id, from, to);

      return reply.send({ blockedDates });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[Properties API] Get blocked dates error: ${errorMsg}`);
      return reply.code(500).send({ error: 'Failed to fetch blocked dates' });
    }
  });

  // Find next available openings
  fastify.get('/properties/:id/next-openings', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { from, nights, count } = request.query as {
        from?: string;
        nights?: string;
        count?: string;
      };

      const fromDate = from || new Date().toISOString().split('T')[0];
      const minNights = nights ? parseInt(nights) : 1;
      const maxResults = count ? parseInt(count) : 5;

      logger.info(`[Properties API] Finding next openings for ${id}`);

      const openings = await propertyAvailabilityService.findNextOpenings(
        id,
        fromDate,
        minNights,
        maxResults
      );

      return reply.send({ openings });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[Properties API] Find openings error: ${errorMsg}`);
      return reply.code(500).send({ error: 'Failed to find openings' });
    }
  });

  // Get sync logs for a property
  fastify.get('/properties/:id/sync-logs', {
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { limit } = request.query as { limit?: string };

      const maxResults = limit ? parseInt(limit) : 20;

      const { data: logs, error } = await supabaseAdmin
        .from('sync_logs')
        .select('*')
        .eq('property_id', id)
        .order('synced_at', { ascending: false })
        .limit(maxResults);

      if (error) {
        throw error;
      }

      return reply.send({ logs: logs || [] });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[Properties API] Get sync logs error: ${errorMsg}`);
      return reply.code(500).send({ error: 'Failed to fetch sync logs' });
    }
  });
}
