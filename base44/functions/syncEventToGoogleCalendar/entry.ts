/**
 * Sync Event to Google Calendar
 * Triggered otomatis saat event baru dibuat di aplikasi
 * Menambahkan event ke Google Calendar user secara real-time
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Automation trigger payload structure
    // event: { type, entity_name, entity_id }
    // data: current entity data
    const event = body.event || {};
    const eventData = body.data || {};

    // Skip jika bukan event create
    if (event.type !== 'create') {
      return Response.json({ status: 'skipped', reason: 'not_create_event' });
    }

    // Get Google Calendar access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    // Siapkan event untuk Google Calendar
    const googleEvent = {
      summary: eventData.name || 'Event',
      description: eventData.description || `Kegiatan level ${eventData.level}`,
      location: eventData.location || '',
      start: {
        dateTime: eventData.date ? new Date(`${eventData.date}T${eventData.time || '08:00'}:00`).toISOString() : new Date().toISOString(),
      },
      end: {
        dateTime: eventData.date ? new Date(`${eventData.date}T${eventData.time || '08:00'}:00`).getTime() + 2*60*60*1000 > 0 ? new Date(new Date(`${eventData.date}T${eventData.time || '08:00'}:00`).getTime() + 2*60*60*1000).toISOString() : new Date(Date.now() + 2*60*60*1000).toISOString() : new Date(Date.now() + 2*60*60*1000).toISOString(),
      },
    };

    // Tambah materi sebagai extended properties jika ada
    if (eventData.materi) {
      googleEvent.extendedProperties = {
        private: {
          materi: eventData.materi,
          pemateri: eventData.pemateri || '',
          level: eventData.level || '',
        },
      };
    }

    // POST ke Google Calendar API
    const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleEvent),
    });

    if (!calRes.ok) {
      const err = await calRes.text();
      console.error('Google Calendar API error:', err);
      return Response.json({ status: 'error', details: err }, { status: 500 });
    }

    const created = await calRes.json();
    return Response.json({
      status: 'success',
      google_calendar_event_id: created.id,
      event_name: eventData.name,
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});