import ical from 'node-ical';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

interface ICalEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  source: string;
}

interface ICalSource {
  url: string;
  source: string; // 'airbnb', 'booking', 'google', etc.
}

interface SyncResult {
  success: boolean;
  eventsProcessed: number;
  error?: string;
}

/**
 * Service for syncing iCal calendar feeds with property availability
 * Fetches .ics files from Airbnb, Booking.com, Google Calendar, etc.
 * and updates blocked_dates table
 */
export class ICalSyncService {
  /**
   * Sync a single property's iCal feed(s)
   */
  async syncProperty(propertyId: string): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // Fetch property details
      const { data: property, error: fetchError } = await supabaseAdmin
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (fetchError || !property) {
        throw new Error(`Property not found: ${propertyId}`);
      }

      logger.info(`[iCal Sync] Starting sync for property: ${property.name} (${propertyId})`);

      // Fetch and parse all iCal URLs
      const allEvents: ICalEvent[] = [];
      const icalSources = property.ical_urls as ICalSource[];

      if (!icalSources || icalSources.length === 0) {
        logger.warn(`[iCal Sync] No iCal URLs configured for property: ${property.name}`);
        return {
          success: true,
          eventsProcessed: 0
        };
      }

      for (const icalSource of icalSources) {
        try {
          const events = await this.fetchICalEvents(icalSource.url, icalSource.source);
          allEvents.push(...events);
          logger.info(`[iCal Sync] Fetched ${events.length} events from ${icalSource.source}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`[iCal Sync] Failed to fetch from ${icalSource.source}: ${errorMsg}`);
          // Continue with other sources even if one fails
        }
      }

      logger.info(`[iCal Sync] Total events fetched: ${allEvents.length}`);

      // Upsert blocked dates
      await this.upsertBlockedDates(propertyId, allEvents);

      // Update last_synced_at
      await supabaseAdmin
        .from('properties')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', propertyId);

      // Log success
      const duration = Date.now() - startTime;
      await this.logSync(propertyId, 'success', allEvents.length, duration);

      logger.info(`[iCal Sync] Completed sync for ${property.name} in ${duration}ms`);

      return {
        success: true,
        eventsProcessed: allEvents.length
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`[iCal Sync] Sync failed for property ${propertyId}: ${errorMessage}`);

      await this.logSync(propertyId, 'error', 0, duration, errorMessage);

      return {
        success: false,
        eventsProcessed: 0,
        error: errorMessage
      };
    }
  }

  /**
   * Fetch and parse iCal events from URL
   */
  private async fetchICalEvents(icalUrl: string, source: string): Promise<ICalEvent[]> {
    try {
      logger.info(`[iCal Sync] Fetching calendar from: ${icalUrl}`);

      // Fetch iCal data
      const response = await fetch(icalUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch iCal: ${response.status} ${response.statusText}`);
      }

      const icalData = await response.text();

      // Parse iCal using node-ical
      const parsed = ical.parseICS(icalData);

      // Extract events
      const events: ICalEvent[] = [];

      for (const key in parsed) {
        const event = parsed[key];

        // Only process VEVENT types with valid dates
        if (event.type === 'VEVENT' && event.start && event.end) {
          // Convert dates to Date objects
          const startDate = event.start instanceof Date ? event.start : new Date(event.start);
          const endDate = event.end instanceof Date ? event.end : new Date(event.end);

          // Skip invalid dates
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            logger.warn(`[iCal Sync] Skipping event with invalid dates: ${event.uid}`);
            continue;
          }

          // Skip past events (more than 1 day ago)
          const oneDayAgo = new Date();
          oneDayAgo.setDate(oneDayAgo.getDate() - 1);
          if (endDate < oneDayAgo) {
            continue;
          }

          events.push({
            uid: event.uid || `${source}-${key}`,
            start: startDate,
            end: endDate,
            summary: event.summary || 'Reserved',
            source
          });
        }
      }

      logger.info(`[iCal Sync] Parsed ${events.length} valid events from ${source}`);

      return events;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[iCal Sync] Failed to fetch/parse iCal from ${icalUrl}: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Upsert blocked dates from events
   * Updates existing events by UID, inserts new ones
   */
  private async upsertBlockedDates(propertyId: string, events: ICalEvent[]): Promise<void> {
    if (events.length === 0) {
      logger.info(`[iCal Sync] No events to upsert for property ${propertyId}`);
      return;
    }

    try {
      // Get existing blocked dates for this property
      const { data: existingBlocked } = await supabaseAdmin
        .from('blocked_dates')
        .select('event_uid')
        .eq('property_id', propertyId)
        .not('event_uid', 'is', null);

      const existingUids = new Set(existingBlocked?.map(b => b.event_uid) || []);
      const newUids = new Set(events.map(e => e.uid));

      // Delete blocked dates that no longer exist in calendar
      const uidsToDelete = Array.from(existingUids).filter(uid => !newUids.has(uid));
      if (uidsToDelete.length > 0) {
        await supabaseAdmin
          .from('blocked_dates')
          .delete()
          .eq('property_id', propertyId)
          .in('event_uid', uidsToDelete);

        logger.info(`[iCal Sync] Deleted ${uidsToDelete.length} obsolete blocked dates`);
      }

      // Upsert new/updated events
      for (const event of events) {
        // Format dates as YYYY-MM-DD (date only, no time)
        const startDate = event.start.toISOString().split('T')[0];
        const endDate = event.end.toISOString().split('T')[0];

        await supabaseAdmin
          .from('blocked_dates')
          .upsert({
            property_id: propertyId,
            event_uid: event.uid,
            start_date: startDate,
            end_date: endDate,
            source: event.source,
            summary: event.summary,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'property_id,event_uid'
          });
      }

      logger.info(`[iCal Sync] Upserted ${events.length} blocked dates`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[iCal Sync] Failed to upsert blocked dates: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Log sync result to sync_logs table
   */
  private async logSync(
    propertyId: string,
    status: 'success' | 'error',
    eventsProcessed: number,
    durationMs: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('sync_logs')
        .insert({
          property_id: propertyId,
          status,
          events_processed: eventsProcessed,
          duration_ms: durationMs,
          error_message: errorMessage || null
        });
    } catch (error) {
      logger.error(`[iCal Sync] Failed to log sync result: ${error}`);
      // Don't throw - logging failure shouldn't fail the sync
    }
  }

  /**
   * Sync all properties (for scheduled job)
   */
  async syncAllProperties(): Promise<void> {
    try {
      logger.info('[iCal Sync] Starting scheduled sync for all properties');

      const { data: properties, error } = await supabaseAdmin
        .from('properties')
        .select('id, name, ical_urls');

      if (error) {
        throw new Error(`Failed to fetch properties: ${error.message}`);
      }

      if (!properties || properties.length === 0) {
        logger.info('[iCal Sync] No properties to sync');
        return;
      }

      logger.info(`[iCal Sync] Found ${properties.length} properties to sync`);

      let successCount = 0;
      let errorCount = 0;

      for (const property of properties) {
        const result = await this.syncProperty(property.id);
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      }

      logger.info(`[iCal Sync] Sync complete: ${successCount} succeeded, ${errorCount} failed`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[iCal Sync] Failed to sync all properties: ${errorMsg}`);
    }
  }
}

// Export singleton instance
export const icalSyncService = new ICalSyncService();
