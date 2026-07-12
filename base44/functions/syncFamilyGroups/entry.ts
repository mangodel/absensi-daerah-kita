import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['super_admin', 'admin', 'admin_desa'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allMembers = await base44.asServiceRole.entities.Member.list();
    const currentYear = new Date().getFullYear();
    let fixed = 0;
    const fixes = [];

    // Helper: normalize address for comparison
    function normAddr(m) {
      const addr = (m.address || '').trim().toLowerCase();
      const suburb = (m.suburb || '').trim().toLowerCase();
      const postcode = (m.postcode || '').trim().toLowerCase();
      if (addr) return addr;
      if (suburb && postcode) return `${suburb} ${postcode}`;
      if (suburb) return suburb;
      return '';
    }

    // Build map of existing family_group names (lowercase -> original)
    const familyGroupMap = new Map();
    for (const m of allMembers) {
      const fg = m.family_group?.trim();
      if (fg && !familyGroupMap.has(fg.toLowerCase())) {
        familyGroupMap.set(fg.toLowerCase(), fg);
      }
    }

    // Phase 1: Exact name match — member name matches an existing family_group
    for (const member of allMembers) {
      if (member.family_group?.trim()) continue;
      if (member.status === 'Tidak Aktif') continue;
      const nameLower = member.full_name?.trim().toLowerCase();
      if (!nameLower) continue;

      if (familyGroupMap.has(nameLower)) {
        const kkName = member.full_name.trim();
        await base44.asServiceRole.entities.Member.update(member.id, { family_group: kkName });
        fixed++;
        fixes.push({ member_name: member.full_name, set_family_group: kkName, reason: 'KK exact name match' });
      }
    }

    // Phase 2: Prefix match — family_group is prefix of member's name (e.g. "Bambang Hariyanto" → "Bambang Hariyanto Lumban Gaol")
    for (const member of allMembers) {
      if (member.family_group?.trim()) continue;
      if (member.status === 'Tidak Aktif') continue;
      const nameLower = member.full_name?.trim().toLowerCase();
      if (!nameLower || familyGroupMap.has(nameLower)) continue;

      for (const [fgLower, fgOriginal] of familyGroupMap) {
        if (fgLower.split(' ').length < 2) continue;
        if (!nameLower.startsWith(fgLower + ' ')) continue;
        if (member.gender !== 'Laki-laki' || member.marital_status !== 'Menikah') continue;

        const kkFullName = member.full_name.trim();
        await base44.asServiceRole.entities.Member.update(member.id, { family_group: kkFullName });
        fixed++;
        fixes.push({ member_name: member.full_name, set_family_group: kkFullName, old_fg: fgOriginal, reason: 'KK prefix match — renamed family group' });

        // Rename all family members from old fg to new full name
        const familyMembers = allMembers.filter(m => m.family_group?.trim().toLowerCase() === fgLower && m.id !== member.id);
        for (const fm of familyMembers) {
          await base44.asServiceRole.entities.Member.update(fm.id, { family_group: kkFullName });
          fixed++;
          fixes.push({ member_name: fm.full_name, set_family_group: kkFullName, old_fg: fm.family_group, reason: 'Family member renamed to KK full name' });
        }

        familyGroupMap.delete(fgLower);
        familyGroupMap.set(kkFullName.toLowerCase(), kkFullName);
        break;
      }
    }

    // Phase 3: Address-based matching for married couples
    // For each married male without family_group, set him as KK, then find his spouse (married female, same kelompok, same address)
    for (const male of allMembers) {
      if (male.family_group?.trim()) continue;
      if (male.status === 'Tidak Aktif') continue;
      if (male.gender !== 'Laki-laki' || male.marital_status !== 'Menikah') continue;

      const maleAddr = normAddr(male);
      if (!maleAddr) continue; // skip if no address to match on

      // Set this male as KK
      const kkName = male.full_name.trim();
      await base44.asServiceRole.entities.Member.update(male.id, { family_group: kkName });
      fixed++;
      fixes.push({ member_name: male.full_name, set_family_group: kkName, reason: 'KK via address match (married male)', kelompok: male.kelompok, address: maleAddr });

      // Find spouse: married female in same kelompok with same address
      const spouses = allMembers.filter(f =>
        f.id !== male.id &&
        !f.family_group?.trim() &&
        f.gender === 'Perempuan' &&
        f.marital_status === 'Menikah' &&
        f.kelompok === male.kelompok &&
        f.status !== 'Tidak Aktif' &&
        normAddr(f) === maleAddr
      );

      for (const spouse of spouses) {
        await base44.asServiceRole.entities.Member.update(spouse.id, { family_group: kkName });
        fixed++;
        fixes.push({ member_name: spouse.full_name, set_family_group: kkName, reason: 'Spouse via address match', kelompok: spouse.kelompok });
      }

      // Find children: unmarried members under 18 in same kelompok with same address
      const children = allMembers.filter(c =>
        c.id !== male.id &&
        !c.family_group?.trim() &&
        c.kelompok === male.kelompok &&
        c.status !== 'Tidak Aktif' &&
        c.marital_status !== 'Menikah' &&
        normAddr(c) === maleAddr &&
        c.birth_year && (currentYear - c.birth_year) < 18
      );

      for (const child of children) {
        await base44.asServiceRole.entities.Member.update(child.id, { family_group: kkName });
        fixed++;
        fixes.push({ member_name: child.full_name, set_family_group: kkName, reason: 'Child via address match', age: currentYear - child.birth_year });
      }

      familyGroupMap.set(kkName.toLowerCase(), kkName);
    }

    // Phase 4: Assign remaining unmarried children (<18) to existing KKs by address
    for (const child of allMembers) {
      if (child.family_group?.trim()) continue;
      if (child.status === 'Tidak Aktif') continue;
      if (child.marital_status === 'Menikah') continue;
      if (!child.birth_year || (currentYear - child.birth_year) >= 18) continue;

      const childAddr = normAddr(child);
      if (!childAddr) continue;

      // Find any KK (member with family_group set) in same kelompok with same address
      const kk = allMembers.find(kk =>
        kk.family_group?.trim() &&
        kk.kelompok === child.kelompok &&
        normAddr(kk) === childAddr
      );

      if (kk) {
        await base44.asServiceRole.entities.Member.update(child.id, { family_group: kk.family_group });
        fixed++;
        fixes.push({ member_name: child.full_name, set_family_group: kk.family_group, reason: 'Child matched to existing KK by address', age: currentYear - child.birth_year });
      }
    }

    // Phase 5: Last-name matching within same kelompok
    // For married males without family_group, match spouse (married female) and children by last name
    const byKelompok = new Map();
    for (const m of allMembers) {
      if (!byKelompok.has(m.kelompok)) byKelompok.set(m.kelompok, []);
      byKelompok.get(m.kelompok).push(m);
    }

    for (const [kelompok, members] of byKelompok) {
      const ungroupedMales = members.filter(m =>
        !m.family_group?.trim() &&
        m.gender === 'Laki-laki' &&
        m.marital_status === 'Menikah' &&
        m.status !== 'Tidak Aktif'
      );

      for (const male of ungroupedMales) {
        const maleLastWord = male.full_name?.trim().split(' ').pop().toLowerCase();
        if (!maleLastWord || maleLastWord.length < 3) continue;

        // Find matching spouse: married female with same last word, no family_group
        const matchingFemales = members.filter(f =>
          f.id !== male.id &&
          !f.family_group?.trim() &&
          f.gender === 'Perempuan' &&
          f.marital_status === 'Menikah' &&
          f.status !== 'Tidak Aktif' &&
          f.full_name?.trim().split(' ').pop().toLowerCase() === maleLastWord
        );

        // Find matching children: unmarried, under 18, same last word, no family_group
        const matchingChildren = members.filter(c =>
          c.id !== male.id &&
          !c.family_group?.trim() &&
          c.marital_status !== 'Menikah' &&
          c.birth_year && (currentYear - c.birth_year) < 18 &&
          c.status !== 'Tidak Aktif' &&
          c.full_name?.trim().split(' ').pop().toLowerCase() === maleLastWord
        );

        // Only proceed if we found at least one family member
        if (matchingFemales.length === 0 && matchingChildren.length === 0) continue;

        const kkName = male.full_name.trim();
        await base44.asServiceRole.entities.Member.update(male.id, { family_group: kkName });
        fixed++;
        fixes.push({ member_name: male.full_name, set_family_group: kkName, reason: 'KK via last-name match', kelompok: kelompok, last_name: maleLastWord });

        for (const spouse of matchingFemales) {
          await base44.asServiceRole.entities.Member.update(spouse.id, { family_group: kkName });
          fixed++;
          fixes.push({ member_name: spouse.full_name, set_family_group: kkName, reason: 'Spouse via last-name match', kelompok: kelompok });
        }

        for (const child of matchingChildren) {
          await base44.asServiceRole.entities.Member.update(child.id, { family_group: kkName });
          fixed++;
          fixes.push({ member_name: child.full_name, set_family_group: kkName, reason: 'Child via last-name match', kelompok: kelompok, age: currentYear - child.birth_year });
        }

        familyGroupMap.set(kkName.toLowerCase(), kkName);
      }

      // Also: match unmarried children (<18) to existing KKs by last name in same kelompok
      const ungroupedChildren = members.filter(c =>
        !c.family_group?.trim() &&
        c.marital_status !== 'Menikah' &&
        c.birth_year && (currentYear - c.birth_year) < 18 &&
        c.status !== 'Tidak Aktif'
      );

      for (const child of ungroupedChildren) {
        const childLastWord = child.full_name?.trim().split(' ').pop().toLowerCase();
        if (!childLastWord || childLastWord.length < 3) continue;

        // Find existing KK in same kelompok with same last name
        const kk = members.find(kk =>
          kk.family_group?.trim() &&
          kk.kelompok === kelompok &&
          kk.full_name?.trim().split(' ').pop().toLowerCase() === childLastWord
        );

        if (kk) {
          await base44.asServiceRole.entities.Member.update(child.id, { family_group: kk.family_group });
          fixed++;
          fixes.push({ member_name: child.full_name, set_family_group: kk.family_group, reason: 'Child matched to existing KK by last name', kelompok: kelompok, age: currentYear - child.birth_year });
        }
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