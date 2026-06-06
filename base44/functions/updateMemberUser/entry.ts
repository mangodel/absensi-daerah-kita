import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();

    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { user_email, member_id, full_name, desa, kelompok } = await req.json();

    if (!user_email || !member_id) {
      return Response.json({ error: 'user_email dan member_id diperlukan' }, { status: 400 });
    }

    // Update user full_name jika diberikan
    if (full_name) {
      await base44.auth.updateMe({ full_name });
    }

    // Update member data
    const memberData = {};
    if (full_name) memberData.full_name = full_name;
    if (desa) memberData.desa = desa;
    if (kelompok) memberData.kelompok = kelompok;

    if (Object.keys(memberData).length > 0) {
      await base44.asServiceRole.entities.Member.update(member_id, memberData);
    }

    return Response.json({
      success: true,
      message: `Member dan user berhasil disinkronkan`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});