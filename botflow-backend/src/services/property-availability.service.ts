import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

interface AvailabilityQuery {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD (exclusive - checkout day)
}

interface BlockedDateInfo {
  start: string;
  end: string;
  reason: string;
  source: string;
}

interface AvailabilityResponse {
  available: boolean;
  blockedDates: BlockedDateInfo[];
  minNights?: number;
  maxNights?: number;
  message?: string;
  propertyName?: string;
}

/**
 * Service for checking property availability based on blocked dates
 * Queries blocked_dates table populated by iCal sync
 */
export class PropertyAvailabilityService {
  /**
   * Check if property is available for a date range
   * Considers min/max nights, buffer days, and blocked dates
   */
  async checkAvailability(
    propertyId: string,
    query: AvailabilityQuery
  ): Promise<AvailabilityResponse> {
    try {
      // Fetch property details
      const { data: property, error: propertyError } = await supabaseAdmin
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (propertyError || !property) {
        throw new Error('Property not found');
      }

      logger.info(`[Availability] Checking ${property.name} for ${query.startDate} to ${query.endDate}`);

      // Parse dates
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);

      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
      }

      if (start >= end) {
        return {
          available: false,
          blockedDates: [],
          message: 'Check-out date must be after check-in date',
          propertyName: property.name
        };
      }

      // Calculate number of nights
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      // Check min nights requirement
      if (property.min_nights && nights < property.min_nights) {
        return {
          available: false,
          blockedDates: [],
          minNights: property.min_nights,
          message: `Minimum stay is ${property.min_nights} ${property.min_nights === 1 ? 'night' : 'nights'}`,
          propertyName: property.name
        };
      }

      // Check max nights requirement
      if (property.max_nights && nights > property.max_nights) {
        return {
          available: false,
          blockedDates: [],
          maxNights: property.max_nights,
          message: `Maximum stay is ${property.max_nights} nights`,
          propertyName: property.name
        };
      }

      // Check for past dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (start < today) {
        return {
          available: false,
          blockedDates: [],
          message: 'Check-in date cannot be in the past',
          propertyName: property.name
        };
      }

      // Query blocked dates that overlap with requested range
      // A date range overlaps if: blocked_start < query_end AND blocked_end > query_start
      const { data: blockedDates, error: blockedError } = await supabaseAdmin
        .from('blocked_dates')
        .select('*')
        .eq('property_id', propertyId)
        .lt('start_date', query.endDate)
        .gt('end_date', query.startDate);

      if (blockedError) {
        throw new Error(`Failed to query blocked dates: ${blockedError.message}`);
      }

      // If no blocked dates found, property is available
      if (!blockedDates || blockedDates.length === 0) {
        logger.info(`[Availability] ${property.name} is AVAILABLE for ${nights} nights`);
        return {
          available: true,
          blockedDates: [],
          propertyName: property.name
        };
      }

      // Property has blocked dates in the requested range
      logger.info(`[Availability] ${property.name} is NOT AVAILABLE - ${blockedDates.length} conflicts found`);

      return {
        available: false,
        blockedDates: blockedDates.map(bd => ({
          start: bd.start_date,
          end: bd.end_date,
          reason: bd.summary || 'Reserved',
          source: bd.source
        })),
        propertyName: property.name
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[Availability] Check failed: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Find next N available date ranges (simplified version)
   * This can be optimized with more sophisticated gap-finding algorithms
   */
  async findNextOpenings(
    propertyId: string,
    fromDate: string,
    minNights: number = 1,
    count: number = 5
  ): Promise<Array<{ start: string; end: string; nights: number }>> {
    try {
      logger.info(`[Availability] Finding next ${count} openings from ${fromDate} (min ${minNights} nights)`);

      // Fetch property for min_nights if not provided
      const { data: property } = await supabaseAdmin
        .from('properties')
        .select('min_nights')
        .eq('id', propertyId)
        .single();

      const requiredNights = Math.max(minNights, property?.min_nights || 1);

      // Get all future blocked dates
      const { data: blockedDates } = await supabaseAdmin
        .from('blocked_dates')
        .select('start_date, end_date')
        .eq('property_id', propertyId)
        .gte('end_date', fromDate)
        .order('start_date', { ascending: true });

      if (!blockedDates) {
        return [];
      }

      // Simple algorithm: find gaps between blocked dates
      const openings: Array<{ start: string; end: string; nights: number }> = [];
      let searchDate = new Date(fromDate);
      const maxSearchDays = 365; // Don't search more than a year ahead

      // Sort blocked dates
      const sortedBlocked = blockedDates.sort((a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );

      for (let day = 0; day < maxSearchDays && openings.length < count; day++) {
        const checkStart = new Date(searchDate);
        checkStart.setDate(checkStart.getDate() + day);
        const checkEnd = new Date(checkStart);
        checkEnd.setDate(checkEnd.getDate() + requiredNights);

        const checkStartStr = checkStart.toISOString().split('T')[0];
        const checkEndStr = checkEnd.toISOString().split('T')[0];

        // Check if this range is available
        const hasConflict = sortedBlocked.some(blocked =>
          blocked.start_date < checkEndStr && blocked.end_date > checkStartStr
        );

        if (!hasConflict) {
          openings.push({
            start: checkStartStr,
            end: checkEndStr,
            nights: requiredNights
          });
          // Skip ahead to avoid overlapping results
          day += requiredNights - 1;
        }
      }

      logger.info(`[Availability] Found ${openings.length} available openings`);

      return openings;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[Availability] Failed to find openings: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Get all blocked dates for a property (for calendar display)
   */
  async getBlockedDates(
    propertyId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<BlockedDateInfo[]> {
    try {
      let query = supabaseAdmin
        .from('blocked_dates')
        .select('*')
        .eq('property_id', propertyId)
        .order('start_date', { ascending: true });

      if (fromDate) {
        query = query.gte('end_date', fromDate);
      }

      if (toDate) {
        query = query.lte('start_date', toDate);
      }

      const { data: blockedDates, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch blocked dates: ${error.message}`);
      }

      return (blockedDates || []).map(bd => ({
        start: bd.start_date,
        end: bd.end_date,
        reason: bd.summary || 'Reserved',
        source: bd.source
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[Availability] Failed to get blocked dates: ${errorMsg}`);
      throw error;
    }
  }
}

// Export singleton instance
export const propertyAvailabilityService = new PropertyAvailabilityService();
