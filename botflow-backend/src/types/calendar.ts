/**
 * Google Calendar Integration Types
 */

export interface CalendarEvent {
  summary: string;
  description?: string;
  location?: string;
  start: CalendarDateTime;
  end: CalendarDateTime;
  attendees?: CalendarAttendee[];
  reminders?: CalendarReminders;
  colorId?: string;
  conferenceData?: ConferenceData;
}

export interface CalendarDateTime {
  dateTime?: string; // RFC3339 timestamp with timezone (e.g., "2026-02-15T10:00:00+02:00")
  date?: string; // For all-day events (e.g., "2026-02-15")
  timeZone?: string; // IANA timezone (e.g., "Africa/Johannesburg")
}

export interface CalendarAttendee {
  email: string;
  displayName?: string;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  optional?: boolean;
}

export interface CalendarReminders {
  useDefault?: boolean;
  overrides?: ReminderOverride[];
}

export interface ReminderOverride {
  method: 'email' | 'popup' | 'sms';
  minutes: number; // Minutes before event
}

export interface ConferenceData {
  createRequest?: {
    requestId: string;
    conferenceSolutionKey: {
      type: 'hangoutsMeet';
    };
  };
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: CalendarDateTime;
  end: CalendarDateTime;
  attendees?: CalendarAttendee[];
  htmlLink: string;
  hangoutLink?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  created: string;
  updated: string;
}

export interface FreeBusyRequest {
  timeMin: string; // RFC3339 timestamp
  timeMax: string; // RFC3339 timestamp
  timeZone?: string;
  items: Array<{ id: string }>; // Calendar IDs to check
}

export interface FreeBusyResponse {
  calendars: {
    [calendarId: string]: {
      busy: Array<{
        start: string;
        end: string;
      }>;
      errors?: Array<{
        domain: string;
        reason: string;
      }>;
    };
  };
  timeMin: string;
  timeMax: string;
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  timeZone: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  primary?: boolean;
}

export interface CalendarCredentials {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
  scope: string;
}

export interface CreateEventParams extends CalendarEvent {
  calendarId?: string; // Defaults to 'primary'
  sendUpdates?: 'all' | 'externalOnly' | 'none';
  conferenceDataVersion?: 0 | 1; // 1 to enable conference data
}

export interface UpdateEventParams extends Partial<CalendarEvent> {
  calendarId: string;
  eventId: string;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface DeleteEventParams {
  calendarId: string;
  eventId: string;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface ListEventsParams {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  orderBy?: 'startTime' | 'updated';
  singleEvents?: boolean;
  q?: string; // Search query
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  available: boolean;
}

export interface CheckAvailabilityParams {
  calendarId: string;
  startDate: Date;
  endDate: Date;
  slotDuration?: number; // Minutes (default 30)
  workingHours?: {
    start: string; // "09:00"
    end: string; // "17:00"
  };
  timezone?: string;
}
