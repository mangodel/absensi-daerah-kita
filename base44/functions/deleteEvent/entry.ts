import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can delete events
    if (user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 });
    }

    const { eventId } = await req.json();

    if (!eventId) {
      return Response.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Get event details before deletion for audit log
    const event = await base44.asServiceRole.entities.Event.get(eventId);

    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete the event
    await base44.asServiceRole.entities.Event.delete(eventId);

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action_type: 'DELETE_EVENT',
      target_id: eventId,
      target_name: event.name,
      performed_by: user.email,
      performed_by_name: user.full_name,
      daerah_asal: event.desa || '-',
      kelompok_asal: event.kelompok || '-',
      performed_at: new Date().toISOString(),
      reason: '',
      backup_data: JSON.stringify(event),
    });

    return Response.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});