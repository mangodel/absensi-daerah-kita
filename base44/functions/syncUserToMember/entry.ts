import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, full_name, member_id } = await req.json();

    if (!email || !full_name) {
      return Response.json({ error: 'email dan full_name diperlukan' }, { status: 400 });
    }

    // Update user profile
    await base44.auth.updateMe({ full_name });

    return Response.json({ 
      success: true, 
      message: `User berhasil diupdate menjadi ${full_name}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});