import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['super_admin', 'admin', 'admin_desa'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allMembers = await base44.asServiceRole.entities.Member.list();

    // Build a map of all family_group names (lowercase -> original case)
    const familyGroupMap = new Map();
    for (const m of allMembers) {
      const fg = m.family_group?.trim();
      if (fg && !familyGroupMap.has(fg.toLowerCase())) {
        familyGroupMap.set(fg.toLowerCase(), fg);
      }
    }

    let fixed = 0;
    const fixes = [];

    // Phase 1: Exact name match (case insensitive)
    // If a member's name matches a family_group name, they ARE the KK — set their family_group to their own name
    for (const member of allMembers) {
      if (member.family_group?.trim()) continue;
      if (member.status === 'Tidak Aktif') continue;

      const nameLower = member.full_name?.trim().toLowerCase();
      if (!nameLower) continue;

      if (familyGroupMap.has(nameLower)) {
        const kkName = member.full_name.trim();
        await base44.asServiceRole.entities.Member.update(member.id, {
          family_group: kkName
        });
        fixed++;
        fixes.push({
          member_id: member.member_id,
          member_name: member.full_name,
          set_family_group: kkName,
          reason: 'KK exact name match'
        });
      }
    }

    // Phase 2: Prefix match — family_group is a prefix of the member's name
    // e.g., family_group "Bambang Hariyanto" matches member "Bambang Hariyanto Lumban Gaol"
    // In this case: set KK's family_group to full name AND rename all family members' family_group
    for (const member of allMembers) {
      if (member.family_group?.trim()) continue;
      if (member.status === 'Tidak Aktif') continue;

      const nameLower = member.full_name?.trim().toLowerCase();
      if (!nameLower) continue;

      // Skip if already handled by exact match
      if (familyGroupMap.has(nameLower)) continue;

      // Look for a family_group that is a prefix of this member's name
      for (const [fgLower, fgOriginal] of familyGroupMap) {
        // Must be at least 2 words to avoid false positives
        if (fgLower.split(' ').length < 2) continue;
        // Member's name must start with the family_group name
        if (!nameLower.startsWith(fgLower + ' ')) continue;
        // Must be male+married (typical KK profile)
        if (member.gender !== 'Laki-laki' || member.marital_status !== 'Menikah') continue;

        const kkFullName = member.full_name.trim();

        // Set the KK's family_group to their full name
        await base44.asServiceRole.entities.Member.update(member.id, {
          family_group: kkFullName
        });
        fixed++;
        fixes.push({
          member_id: member.member_id,
          member_name: member.full_name,
          set_family_group: kkFullName,
          old_family_group: fgOriginal,
          reason: 'KK prefix name match — renamed family group'
        });

        // Update all members with the old family_group to the new full name
        const familyMembers = allMembers.filter(m =>
          m.family_group?.trim().toLowerCase() === fgLower && m.id !== member.id
        );
        for (const fm of familyMembers) {
          await base44.asServiceRole.entities.Member.update(fm.id, {
            family_group: kkFullName
          });
          fixed++;
          fixes.push({
            member_id: fm.member_id,
            member_name: fm.full_name,
            set_family_group: kkFullName,
            old_family_group: fm.family_group,
            reason: 'Family member renamed to match KK full name'
          });
        }

        // Update the map so we don't process this family_group again
        familyGroupMap.delete(fgLower);
        familyGroupMap.set(kkFullName.toLowerCase(), kkFullName);
        break;
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