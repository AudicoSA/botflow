/**
 * Google Calendar Routes
 * Handles OAuth flow and calendar operations
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';
import {
  GoogleCalendarService,
  getAuthorizationUrl,
  getTokensFromCode,
} from '../services/google-calendar.service.js';
import {
  CalendarCredentials,
  CreateEventParams,
  UpdateEventParams,
} from '../types/calendar.js';

// Validation schemas
const createEventSchema = z.object({
  calendarId: z.string().optional(),
  summary: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional(),
  }),
  end: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional(),
  }),
  attendees: z.array(z.object({
    email: z.string().email(),
    displayName: z.string().optional(),
  })).optional(),
  sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
  conferenceDataVersion: z.union([z.literal(0), z.literal(1)]).optional(),
});

const updateEventSchema = z.object({
  calendarId: z.string(),
  eventId: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional(),
  }).optional(),
  end: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional(),
  }).optional(),
  sendUpdates: z.enum(['all', 'externalOnly', 'none']).optional(),
});

const checkAvailabilitySchema = z.object({
  calendarId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  slotDuration: z.number().optional(),
  workingHours: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  timezone: z.string().optional(),
});

export default async function calendarRoutes(fastify: FastifyInstance) {
  /**
   * Start OAuth flow
   * GET /api/calendar/auth
   */
  fastify.get('/auth', async (request, reply) => {
    try {
      const { state } = request.query as { state?: string };

      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
        return reply.code(500).send({ error: 'Google Calendar not configured' });
      }

      const authUrl = getAuthorizationUrl(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI,
        state
      );

      return reply.redirect(authUrl);
    } catch (error) {
      fastify.log.error(error, 'Failed to start Google Calendar OAuth');
      return reply.code(500).send({ error: 'Failed to start OAuth flow' });
    }
  });

  /**
   * OAuth callback
   * GET /api/calendar/callback
   */
  fastify.get('/callback', async (request, reply) => {
    try {
      const { code, state } = request.query as { code?: string; state?: string };

      if (!code) {
        return reply.code(400).send({ error: 'Missing authorization code' });
      }

      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
        return reply.code(500).send({ error: 'Google Calendar not configured' });
      }

      // Exchange code for tokens
      const credentials = await getTokensFromCode(
        code,
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI
      );

      // Get user ID from state or session
      let userId = (request.user as any)?.id;
      if (!userId) {
        try {
          const { getDevUser } = await import('../utils/dev-user.js');
          const devUser = await getDevUser(fastify.log);
          userId = devUser.id;
        } catch (error) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }
      }

      // Get organization ID
      const { data: orgs } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1);

      const organizationId = orgs && orgs[0] ? orgs[0].organization_id : null;

      if (!organizationId) {
        return reply.code(400).send({ error: 'User does not belong to an organization' });
      }

      // Store credentials in integrations table
      const { data: integration, error: dbError } = await supabaseAdmin
        .from('integrations')
        .upsert({
          organization_id: organizationId,
          integration_type: 'google_calendar',
          configuration: { name: 'Google Calendar' },
          credentials: credentials, // In production, ENCRYPT this!
          status: 'connected',
        }, {
          onConflict: 'organization_id,integration_type',
        })
        .select()
        .single();

      if (dbError) {
        fastify.log.error(dbError, 'Failed to store calendar credentials');
        return reply.code(500).send({ error: 'Failed to save credentials' });
      }

      // Redirect to frontend success page
      const redirectUrl = new URL('/dashboard/integrations', env.FRONTEND_URL);
      redirectUrl.searchParams.set('status', 'success');
      redirectUrl.searchParams.set('integration', 'google_calendar');
      if (state) redirectUrl.searchParams.set('state', state);

      return reply.redirect(redirectUrl.toString());
    } catch (error) {
      fastify.log.error(error, 'Google Calendar OAuth callback error');
      const redirectUrl = new URL('/dashboard/integrations', env.FRONTEND_URL);
      redirectUrl.searchParams.set('status', 'error');
      return reply.redirect(redirectUrl.toString());
    }
  });

  /**
   * Create calendar event
   * POST /api/calendar/events
   */
  fastify.post('/events', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const validation = createEventSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          error: 'Invalid request',
          details: validation.error.errors,
        });
      }

      const userId = (request.user as any).id;

      // Get organization
      const { data: orgs } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1);

      const organizationId = orgs?.[0]?.organization_id;
      if (!organizationId) {
        return reply.code(400).send({ error: 'Organization not found' });
      }

      // Get calendar credentials
      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('credentials')
        .eq('organization_id', organizationId)
        .eq('integration_type', 'google_calendar')
        .single();

      if (!integration) {
        return reply.code(404).send({ error: 'Google Calendar not connected' });
      }

      const credentials = integration.credentials as CalendarCredentials;

      // Create calendar service
      const calendarService = new GoogleCalendarService(
        credentials,
        env.GOOGLE_CLIENT_ID!,
        env.GOOGLE_CLIENT_SECRET!,
        env.GOOGLE_REDIRECT_URI!,
        fastify.log
      );

      // Create event
      const event = await calendarService.createEvent(validation.data as CreateEventParams);

      // Update credentials if they were refreshed
      const updatedCredentials = calendarService.getCredentials();
      if (updatedCredentials.access_token !== credentials.access_token) {
        await supabaseAdmin
          .from('integrations')
          .update({ credentials: updatedCredentials })
          .eq('organization_id', organizationId)
          .eq('integration_type', 'google_calendar');
      }

      return { event };
    } catch (error) {
      fastify.log.error(error, 'Failed to create calendar event');
      return reply.code(500).send({ error: error.message || 'Failed to create event' });
    }
  });

  /**
   * List calendar events
   * GET /api/calendar/events
   */
  fastify.get('/events', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { calendarId, timeMin, timeMax, maxResults, q } = request.query as any;

      const userId = (request.user as any).id;

      // Get organization and credentials
      const { data: orgs } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1);

      const organizationId = orgs?.[0]?.organization_id;
      if (!organizationId) {
        return reply.code(400).send({ error: 'Organization not found' });
      }

      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('credentials')
        .eq('organization_id', organizationId)
        .eq('integration_type', 'google_calendar')
        .single();

      if (!integration) {
        return reply.code(404).send({ error: 'Google Calendar not connected' });
      }

      const credentials = integration.credentials as CalendarCredentials;

      const calendarService = new GoogleCalendarService(
        credentials,
        env.GOOGLE_CLIENT_ID!,
        env.GOOGLE_CLIENT_SECRET!,
        env.GOOGLE_REDIRECT_URI!,
        fastify.log
      );

      const events = await calendarService.listEvents({
        calendarId: calendarId || undefined,
        timeMin: timeMin || undefined,
        timeMax: timeMax || undefined,
        maxResults: maxResults ? parseInt(maxResults) : undefined,
        q: q || undefined,
      });

      return { events };
    } catch (error) {
      fastify.log.error(error, 'Failed to list calendar events');
      return reply.code(500).send({ error: error.message || 'Failed to list events' });
    }
  });

  /**
   * Update calendar event
   * PATCH /api/calendar/events/:eventId
   */
  fastify.patch('/events/:eventId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { eventId } = request.params as { eventId: string };
      const bodyData = request.body as any;
      const validation = updateEventSchema.safeParse({ ...bodyData, eventId });

      if (!validation.success) {
        return reply.code(400).send({
          error: 'Invalid request',
          details: validation.error.errors,
        });
      }

      const userId = (request.user as any).id;

      // Get credentials (same pattern as above)
      const { data: orgs } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1);

      const organizationId = orgs?.[0]?.organization_id;
      if (!organizationId) {
        return reply.code(400).send({ error: 'Organization not found' });
      }

      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('credentials')
        .eq('organization_id', organizationId)
        .eq('integration_type', 'google_calendar')
        .single();

      if (!integration) {
        return reply.code(404).send({ error: 'Google Calendar not connected' });
      }

      const credentials = integration.credentials as CalendarCredentials;

      const calendarService = new GoogleCalendarService(
        credentials,
        env.GOOGLE_CLIENT_ID!,
        env.GOOGLE_CLIENT_SECRET!,
        env.GOOGLE_REDIRECT_URI!,
        fastify.log
      );

      const event = await calendarService.updateEvent(validation.data as UpdateEventParams);

      return { event };
    } catch (error) {
      fastify.log.error(error, 'Failed to update calendar event');
      return reply.code(500).send({ error: error.message || 'Failed to update event' });
    }
  });

  /**
   * Delete calendar event
   * DELETE /api/calendar/events/:eventId
   */
  fastify.delete('/events/:eventId', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { eventId } = request.params as { eventId: string };
      const { calendarId, sendUpdates } = request.query as any;

      if (!calendarId) {
        return reply.code(400).send({ error: 'calendarId is required' });
      }

      const userId = (request.user as any).id;

      // Get credentials (same pattern)
      const { data: orgs } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1);

      const organizationId = orgs?.[0]?.organization_id;
      if (!organizationId) {
        return reply.code(400).send({ error: 'Organization not found' });
      }

      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('credentials')
        .eq('organization_id', organizationId)
        .eq('integration_type', 'google_calendar')
        .single();

      if (!integration) {
        return reply.code(404).send({ error: 'Google Calendar not connected' });
      }

      const credentials = integration.credentials as CalendarCredentials;

      const calendarService = new GoogleCalendarService(
        credentials,
        env.GOOGLE_CLIENT_ID!,
        env.GOOGLE_CLIENT_SECRET!,
        env.GOOGLE_REDIRECT_URI!,
        fastify.log
      );

      await calendarService.deleteEvent({
        calendarId,
        eventId,
        sendUpdates,
      });

      return { success: true };
    } catch (error) {
      fastify.log.error(error, 'Failed to delete calendar event');
      return reply.code(500).send({ error: error.message || 'Failed to delete event' });
    }
  });

  /**
   * Check availability
   * POST /api/calendar/availability
   */
  fastify.post('/availability', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const validation = checkAvailabilitySchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          error: 'Invalid request',
          details: validation.error.errors,
        });
      }

      const userId = (request.user as any).id;

      // Get credentials
      const { data: orgs } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1);

      const organizationId = orgs?.[0]?.organization_id;
      if (!organizationId) {
        return reply.code(400).send({ error: 'Organization not found' });
      }

      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('credentials')
        .eq('organization_id', organizationId)
        .eq('integration_type', 'google_calendar')
        .single();

      if (!integration) {
        return reply.code(404).send({ error: 'Google Calendar not connected' });
      }

      const credentials = integration.credentials as CalendarCredentials;

      const calendarService = new GoogleCalendarService(
        credentials,
        env.GOOGLE_CLIENT_ID!,
        env.GOOGLE_CLIENT_SECRET!,
        env.GOOGLE_REDIRECT_URI!,
        fastify.log
      );

      const slots = await calendarService.checkAvailability({
        calendarId: validation.data.calendarId,
        startDate: new Date(validation.data.startDate),
        endDate: new Date(validation.data.endDate),
        slotDuration: validation.data.slotDuration,
        workingHours: validation.data.workingHours ? {
          start: validation.data.workingHours.start || '09:00',
          end: validation.data.workingHours.end || '17:00',
        } : undefined,
        timezone: validation.data.timezone,
      });

      return { slots };
    } catch (error) {
      fastify.log.error(error, 'Failed to check availability');
      return reply.code(500).send({ error: error.message || 'Failed to check availability' });
    }
  });

  /**
   * List calendars
   * GET /api/calendar/calendars
   */
  fastify.get('/calendars', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = (request.user as any).id;

      // Get credentials
      const { data: orgs } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1);

      const organizationId = orgs?.[0]?.organization_id;
      if (!organizationId) {
        return reply.code(400).send({ error: 'Organization not found' });
      }

      const { data: integration } = await supabaseAdmin
        .from('integrations')
        .select('credentials')
        .eq('organization_id', organizationId)
        .eq('integration_type', 'google_calendar')
        .single();

      if (!integration) {
        return reply.code(404).send({ error: 'Google Calendar not connected' });
      }

      const credentials = integration.credentials as CalendarCredentials;

      const calendarService = new GoogleCalendarService(
        credentials,
        env.GOOGLE_CLIENT_ID!,
        env.GOOGLE_CLIENT_SECRET!,
        env.GOOGLE_REDIRECT_URI!,
        fastify.log
      );

      const calendars = await calendarService.listCalendars();

      return { calendars };
    } catch (error) {
      fastify.log.error(error, 'Failed to list calendars');
      return reply.code(500).send({ error: error.message || 'Failed to list calendars' });
    }
  });
}
