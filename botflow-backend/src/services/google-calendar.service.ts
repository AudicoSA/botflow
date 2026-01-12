/**
 * Google Calendar Service
 * Handles Google Calendar API operations for appointment booking
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { FastifyBaseLogger } from 'fastify';
import {
  CalendarEvent,
  GoogleCalendarEvent,
  FreeBusyRequest,
  FreeBusyResponse,
  CalendarListEntry,
  CalendarCredentials,
  CreateEventParams,
  UpdateEventParams,
  DeleteEventParams,
  ListEventsParams,
  CheckAvailabilityParams,
  AvailabilitySlot,
} from '../types/calendar.js';

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar;
  private logger: FastifyBaseLogger;

  constructor(
    credentials: CalendarCredentials,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    logger: FastifyBaseLogger
  ) {
    this.logger = logger;
    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Set credentials
    this.oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expiry_date,
      token_type: credentials.token_type,
      scope: credentials.scope,
    });

    // Auto-refresh token
    this.oauth2Client.on('tokens', (tokens) => {
      this.logger.info('Google Calendar tokens refreshed');
      if (tokens.refresh_token) {
        // Store new refresh token if provided
        this.logger.info('New refresh token received');
      }
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Create a calendar event
   */
  async createEvent(params: CreateEventParams): Promise<GoogleCalendarEvent> {
    try {
      const calendarId = params.calendarId || 'primary';

      const event: calendar_v3.Schema$Event = {
        summary: params.summary,
        description: params.description,
        location: params.location,
        start: params.start,
        end: params.end,
        attendees: params.attendees,
        reminders: params.reminders,
        colorId: params.colorId,
        conferenceData: params.conferenceData,
      };

      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
        sendUpdates: params.sendUpdates || 'none',
        conferenceDataVersion: params.conferenceDataVersion,
      });

      this.logger.info({ eventId: response.data.id }, 'Calendar event created');
      return this.mapGoogleEvent(response.data);
    } catch (error) {
      this.logger.error({ error }, 'Failed to create calendar event');
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(params: UpdateEventParams): Promise<GoogleCalendarEvent> {
    try {
      const event: calendar_v3.Schema$Event = {
        summary: params.summary,
        description: params.description,
        location: params.location,
        start: params.start,
        end: params.end,
        attendees: params.attendees,
        reminders: params.reminders,
        colorId: params.colorId,
        conferenceData: params.conferenceData,
      };

      // Remove undefined properties
      Object.keys(event).forEach(
        (key) => event[key] === undefined && delete event[key]
      );

      const response = await this.calendar.events.patch({
        calendarId: params.calendarId,
        eventId: params.eventId,
        requestBody: event,
        sendUpdates: params.sendUpdates || 'none',
      });

      this.logger.info({ eventId: params.eventId }, 'Calendar event updated');
      return this.mapGoogleEvent(response.data);
    } catch (error) {
      this.logger.error({ error, eventId: params.eventId }, 'Failed to update calendar event');
      throw new Error(`Failed to update calendar event: ${error.message}`);
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(params: DeleteEventParams): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: params.calendarId,
        eventId: params.eventId,
        sendUpdates: params.sendUpdates || 'none',
      });

      this.logger.info({ eventId: params.eventId }, 'Calendar event deleted');
    } catch (error) {
      this.logger.error({ error, eventId: params.eventId }, 'Failed to delete calendar event');
      throw new Error(`Failed to delete calendar event: ${error.message}`);
    }
  }

  /**
   * Get a specific calendar event
   */
  async getEvent(calendarId: string, eventId: string): Promise<GoogleCalendarEvent> {
    try {
      const response = await this.calendar.events.get({
        calendarId,
        eventId,
      });

      return this.mapGoogleEvent(response.data);
    } catch (error) {
      this.logger.error({ error, eventId }, 'Failed to get calendar event');
      throw new Error(`Failed to get calendar event: ${error.message}`);
    }
  }

  /**
   * List calendar events
   */
  async listEvents(params: ListEventsParams): Promise<GoogleCalendarEvent[]> {
    try {
      const calendarId = params.calendarId || 'primary';

      const response = await this.calendar.events.list({
        calendarId,
        timeMin: params.timeMin,
        timeMax: params.timeMax,
        maxResults: params.maxResults || 100,
        singleEvents: params.singleEvents !== false, // Default true
        orderBy: params.orderBy || 'startTime',
        q: params.q,
      });

      return (response.data.items || []).map(this.mapGoogleEvent);
    } catch (error) {
      this.logger.error({ error }, 'Failed to list calendar events');
      throw new Error(`Failed to list calendar events: ${error.message}`);
    }
  }

  /**
   * Check free/busy status
   */
  async checkFreeBusy(request: FreeBusyRequest): Promise<FreeBusyResponse> {
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: request,
      });

      return response.data as FreeBusyResponse;
    } catch (error) {
      this.logger.error({ error }, 'Failed to check free/busy');
      throw new Error(`Failed to check free/busy: ${error.message}`);
    }
  }

  /**
   * Check availability and return available time slots
   */
  async checkAvailability(params: CheckAvailabilityParams): Promise<AvailabilitySlot[]> {
    try {
      const timeMin = params.startDate.toISOString();
      const timeMax = params.endDate.toISOString();

      // Get busy times
      const freeBusyResponse = await this.checkFreeBusy({
        timeMin,
        timeMax,
        timeZone: params.timezone || 'Africa/Johannesburg',
        items: [{ id: params.calendarId }],
      });

      const busySlots = freeBusyResponse.calendars[params.calendarId]?.busy || [];

      // Generate all possible slots
      const slotDuration = params.slotDuration || 30; // minutes
      const slots: AvailabilitySlot[] = [];

      const workingStart = params.workingHours?.start || '09:00';
      const workingEnd = params.workingHours?.end || '17:00';

      let currentDate = new Date(params.startDate);
      const endDate = new Date(params.endDate);

      while (currentDate < endDate) {
        // Check if it's a working day (Monday-Friday)
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          // Create slots for this day
          const [startHour, startMinute] = workingStart.split(':').map(Number);
          const [endHour, endMinute] = workingEnd.split(':').map(Number);

          const dayStart = new Date(currentDate);
          dayStart.setHours(startHour, startMinute, 0, 0);

          const dayEnd = new Date(currentDate);
          dayEnd.setHours(endHour, endMinute, 0, 0);

          let slotStart = new Date(dayStart);

          while (slotStart < dayEnd) {
            const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

            if (slotEnd <= dayEnd) {
              // Check if slot overlaps with any busy time
              const isAvailable = !busySlots.some((busy) => {
                const busyStart = new Date(busy.start);
                const busyEnd = new Date(busy.end);
                return slotStart < busyEnd && slotEnd > busyStart;
              });

              slots.push({
                start: slotStart.toISOString(),
                end: slotEnd.toISOString(),
                available: isAvailable,
              });
            }

            slotStart = slotEnd;
          }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(0, 0, 0, 0);
      }

      return slots;
    } catch (error) {
      this.logger.error({ error }, 'Failed to check availability');
      throw new Error(`Failed to check availability: ${error.message}`);
    }
  }

  /**
   * List all calendars for the user
   */
  async listCalendars(): Promise<CalendarListEntry[]> {
    try {
      const response = await this.calendar.calendarList.list();

      return (response.data.items || []).map((cal) => ({
        id: cal.id!,
        summary: cal.summary!,
        description: cal.description,
        timeZone: cal.timeZone!,
        colorId: cal.colorId,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        selected: cal.selected,
        accessRole: cal.accessRole as CalendarListEntry['accessRole'],
        primary: cal.primary,
      }));
    } catch (error) {
      this.logger.error({ error }, 'Failed to list calendars');
      throw new Error(`Failed to list calendars: ${error.message}`);
    }
  }

  /**
   * Get current access token (may be refreshed)
   */
  async getAccessToken(): Promise<string> {
    try {
      const { token } = await this.oauth2Client.getAccessToken();
      return token || '';
    } catch (error) {
      this.logger.error({ error }, 'Failed to get access token');
      throw new Error(`Failed to get access token: ${error.message}`);
    }
  }

  /**
   * Get current credentials (including possibly refreshed tokens)
   */
  getCredentials(): CalendarCredentials {
    const credentials = this.oauth2Client.credentials;
    return {
      access_token: credentials.access_token || '',
      refresh_token: credentials.refresh_token || '',
      expiry_date: credentials.expiry_date || 0,
      token_type: credentials.token_type || 'Bearer',
      scope: credentials.scope || '',
    };
  }

  /**
   * Map Google Calendar event to our format
   */
  private mapGoogleEvent(event: calendar_v3.Schema$Event): GoogleCalendarEvent {
    return {
      id: event.id!,
      summary: event.summary || 'Untitled Event',
      description: event.description,
      location: event.location,
      start: event.start!,
      end: event.end!,
      attendees: event.attendees as any,
      htmlLink: event.htmlLink!,
      hangoutLink: event.hangoutLink,
      status: (event.status as any) || 'confirmed',
      created: event.created!,
      updated: event.updated!,
    };
  }
}

/**
 * Create OAuth2 URL for user authorization
 */
export function getAuthorizationUrl(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  state?: string
): string {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
    state,
  });

  return url;
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<CalendarCredentials> {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const { tokens } = await oauth2Client.getToken(code);

  return {
    access_token: tokens.access_token || '',
    refresh_token: tokens.refresh_token || '',
    expiry_date: tokens.expiry_date || 0,
    token_type: tokens.token_type || 'Bearer',
    scope: tokens.scope || '',
  };
}
