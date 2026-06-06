import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { full_name } = await req.json();

    if (!full_name) {
      return Response.json({ error: 'full_name is required' }, { status: 400 });
    }

    // Update user full_name
    await base44.auth.updateMe({ full_name });

    return Response.json({
      success: true,
      message: `Full name updated to ${full_name}`,
      user: { email: user.email, full_name },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});