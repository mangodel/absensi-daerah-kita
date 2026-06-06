import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hanya admin yang bisa menghapus
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { member_id, reason } = await req.json();

    if (!member_id) {
      return Response.json({ error: 'member_id is required' }, { status: 400 });
    }

    // Ambil data member sebelum dihapus
    const memberToDelete = await base44.entities.Member.get(member_id);

    if (!memberToDelete) {
      return Response.json({ error: 'Member not found' }, { status: 404 });
    }

    // Catat ke AuditLog
    await base44.asServiceRole.entities.AuditLog.create({
      action_type: 'DELETE_MEMBER',
      target_id: member_id,
      target_name: memberToDelete.full_name,
      performed_by: user.email,
      performed_by_name: user.full_name,
      daerah_asal: memberToDelete.desa || '',
      kelompok_asal: memberToDelete.kelompok || '',
      performed_at: new Date().toISOString(),
      reason: reason || '',
      backup_data: JSON.stringify(memberToDelete),
    });

    // Hapus member
    await base44.asServiceRole.entities.Member.delete(member_id);

    return Response.json({
      success: true,
      message: `Member ${memberToDelete.full_name} berhasil dihapus dan tercatat di audit log`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});