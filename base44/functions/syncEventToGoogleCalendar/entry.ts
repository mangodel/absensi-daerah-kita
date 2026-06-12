/**
 * Sync Event to Google Calendar
 * Triggered otomatis saat event baru dibuat, atau manual sync untuk event yang sudah ada
 * Menambahkan/update event ke Google Calendar pengurus dengan QR event data
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support dua mode: automation trigger atau manual sync request
    const automationEvent = body.event || null;
    let eventId = body.eventId || null;
    let eventData = body.data || null;

    // Mode 1: Automation trigger (saat event create/update)
    if (automationEvent && automationEvent.type !== 'delete') {
      eventId = automationEvent.entity_id;
      if (!eventData) {
        eventData = await base44.asServiceRole.entities.Event.get(eventId);
      }
    } 
    // Mode 2: Manual sync request
    else if (eventId && !eventData) {
      eventData = await base44.asServiceRole.entities.Event.get(eventId);
    }

    if (!eventData) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get Google Calendar access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');

    // Get related EventSession jika ada (untuk QR data)
    const eventSessions = await base44.asServiceRole.entities.EventSession.filter({ linked_event_id: eventId });
    const linkedSession = eventSessions && eventSessions.length > 0 ? eventSessions[0] : null;

    // Build description dengan QR info
    let description = eventData.description || `Kegiatan level ${eventData.level}`;
    const detailsArray = [];
    
    if (eventData.materi) detailsArray.push(`📚 Materi: ${eventData.materi}`);
    if (eventData.pemateri) detailsArray.push(`🎤 Pemateri: ${eventData.pemateri}`);
    if (eventData.desa) detailsArray.push(`📍 Desa: ${eventData.desa}`);
    if (eventData.kelompok) detailsArray.push(`👥 Kelompok: ${eventData.kelompok}`);
    if (linkedSession) {
      detailsArray.push(`🔐 Status QR: ${linkedSession.status}`);
      detailsArray.push(`\n📱 QR Event URL: ${process.env.APP_URL || 'https://app.base44.io'}/event-attendance`);
    }
    
    if (detailsArray.length > 0) {
      description += '\n\n' + detailsArray.join('\n');
    }

    // Siapkan event untuk Google Calendar
    const startTime = eventData.date ? `${eventData.date}T${eventData.time || '08:00'}:00` : new Date().toISOString();
    const startDate = new Date(startTime);
    const endDate = new Date(startDate.getTime() + 2*60*60*1000);

    const googleEvent = {
      summary: `[${eventData.level}] ${eventData.name}`,
      description: description,
      location: eventData.location || '',
      start: {
        dateTime: startDate.toISOString(),
      },
      end: {
        dateTime: endDate.toISOString(),
      },
      colorId: eventData.level === 'Daerah' ? '1' : eventData.level === 'Desa' ? '2' : '3', // Different colors per level
    };

    // Tambah extended properties untuk tracking
    googleEvent.extendedProperties = {
      private: {
        app_event_id: eventId,
        level: eventData.level || '',
        desa: eventData.desa || '',
        kelompok: eventData.kelompok || '',
        has_qr_session: !!linkedSession,
        session_id: linkedSession?.id || '',
      },
    };

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
      has_qr_event: !!linkedSession,
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});