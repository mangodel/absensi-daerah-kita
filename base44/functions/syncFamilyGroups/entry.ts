import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['super_admin', 'admin', 'admin_desa'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allMembers = await base44.asServiceRole.entities.Member.list();

    // Build a set of all family_group names that exist
    const familyGroupNames = new Set();
    for (const m of allMembers) {
      const fg = m.family_group?.trim();
      if (fg) familyGroupNames.add(fg.toLowerCase());
    }

    let fixed = 0;
    const fixes = [];

    for (const member of allMembers) {
      if (member.family_group?.trim()) continue; // already has family_group
      if (member.status === 'Tidak Aktif') continue;

      const nameLower = member.full_name?.trim().toLowerCase();
      if (!nameLower) continue;

      // Safe case: this member's name is used as family_group by others
      // => they ARE the KK, set family_group to their own name
      if (familyGroupNames.has(nameLower)) {
        await base44.asServiceRole.entities.Member.update(member.id, {
          family_group: member.full_name.trim()
        });
        fixed++;
        fixes.push({
          member_id: member.member_id,
          member_name: member.full_name,
          set_family_group: member.full_name.trim(),
          reason: 'KK name match (self)'
        });
      }
    }

    return Response.json({
      success: true,
      total_members: allMembers.length,
      fixed_count: fixed,
      fixes
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});