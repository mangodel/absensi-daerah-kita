import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { full_name } = await req.json();

    if (!full_name) {
      return Response.json({ error: 'full_name diperlukan' }, { status: 400 });
    }

    await base44.auth.updateMe({ full_name });

    return Response.json({ success: true, message: 'Profil berhasil diupdate' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});