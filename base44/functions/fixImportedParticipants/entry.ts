import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { event_id } = await req.json();

    if (!event_id) {
      return Response.json({ error: 'event_id required' }, { status: 400 });
    }

    // Get all participants for this event
    const participants = await base44.asServiceRole.entities.EventParticipant.filter({ event_id });
    
    // Get all members
    const members = await base44.asServiceRole.entities.Member.list();

    let updated = 0;
    const errors = [];

    // Match and update participants
    for (const p of participants) {
      const match = members.find(m => m.full_name?.toLowerCase() === p.full_name?.toLowerCase());
      
      if (match && match.member_id) {
        // Update participant to use member_id and mark as database member
        await base44.asServiceRole.entities.EventParticipant.update(p.id, {
          participant_id: match.member_id,
          qr_code_value: match.member_id,
          is_database_member: true,
        });
        updated++;
      }
    }

    return Response.json({ 
      success: true, 
      updated,
      total: participants.length,
      message: `Berhasil update ${updated} peserta`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});