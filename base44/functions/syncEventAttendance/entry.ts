import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can sync
    if (user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    // Get all events and event sessions
    const allEvents = await base44.asServiceRole.entities.Event.list();
    const allSessions = await base44.asServiceRole.entities.EventSession.list();
    const allAttendance = await base44.asServiceRole.entities.Attendance.list();

    let synced = 0;
    let failed = 0;

    for (const event of allEvents) {
      try {
        // Check if this event already has an attendance record
        const existingAttendance = allAttendance.filter(a => a.event_id === event.id);
        
        if (existingAttendance.length === 0 && event.date) {
          // Create attendance record for this event
          const eventDate = new Date(event.date);
          await base44.asServiceRole.entities.Attendance.create({
            event_id: event.id,
            event_name: event.name,
            event_level: event.level,
            date: event.date,
            month: eventDate.getMonth() + 1,
            year: eventDate.getFullYear(),
            status: 'Hadir',
            member_id: 'SYNC_' + event.id,
            member_name: 'Auto Sync - ' + event.name,
            desa: event.desa || '',
            kelompok: event.kelompok || ''
          });
          synced++;
        }
      } catch (error) {
        console.error(`Gagal sync event ${event.name}:`, error);
        failed++;
      }
    }

    return Response.json({ 
      success: true, 
      message: `Sinkronisasi selesai: ${synced} event baru disinkronkan, ${failed} gagal`,
      synced,
      failed
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});