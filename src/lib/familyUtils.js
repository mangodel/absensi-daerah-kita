/**
 * Determine the family head (Kepala Keluarga) from a list of members.
 * The KK is the member whose full_name matches the family_group name.
 * If no match, the KK is determined by: male+married > male > female, then oldest.
 */
export function getFamilyHead(familyMembers, familyGroupName) {
  if (!familyMembers || familyMembers.length === 0) return null;

  const fgLower = (familyGroupName || "").trim().toLowerCase();

  // First, check if any member's name matches the family_group
  if (fgLower) {
    const nameMatch = familyMembers.find(m =>
      m.full_name?.trim().toLowerCase() === fgLower
    );
    if (nameMatch) return nameMatch;
  }

  // Fallback: sort by priority and return first
  const sorted = [...familyMembers].sort((a, b) => {
    const score = (m) => {
      const isMale = m.gender === "Laki-laki";
      const isMarried = m.marital_status === "Menikah";
      if (isMale && isMarried) return 0;
      if (isMale) return 1;
      return 2;
    };
    const sa = score(a), sb = score(b);
    if (sa !== sb) return sa - sb;
    const aYear = a.birth_year || 9999;
    const bYear = b.birth_year || 9999;
    return aYear - bYear;
  });

  return sorted[0];
}

/**
 * Get all family members including the KK (who might not have family_group set).
 * Also injects the KK from the full member list if their name matches family_group
 * but they don't have family_group set on their own record.
 */
export function getFamilyMembersWithHead(allMembers, myMember) {
  if (!myMember) return { familyMembers: [], familyHead: null };

  const fg = myMember.family_group?.trim();
  if (!fg) return { familyMembers: [myMember], familyHead: myMember };

  // Get all members with the same family_group
  let familyMembers = allMembers.filter(m => m.family_group?.trim() === fg);

  // Check if the KK (whose name = family_group) is already in the list
  const fgLower = fg.toLowerCase();
  const headInGroup = familyMembers.some(m =>
    m.full_name?.trim().toLowerCase() === fgLower
  );

  // If not, find the KK by name in all members and inject them
  if (!headInGroup) {
    const head = allMembers.find(m =>
      m.full_name?.trim().toLowerCase() === fgLower
    );
    if (head && !familyMembers.some(fm => fm.id === head.id)) {
      familyMembers = [head, ...familyMembers];
    }
  }

  const familyHead = getFamilyHead(familyMembers, fg);

  return { familyMembers, familyHead };
}

/**
 * Sort family members: KK first, then wife (married female), then children by age (oldest first)
 */
export function sortFamilyMembers(members, familyHead) {
  if (!familyHead) return members;

  return [...members].sort((a, b) => {
    // KK always first
    const aIsHead = a.id === familyHead.id ? 0 : 1;
    const bIsHead = b.id === familyHead.id ? 0 : 1;
    if (aIsHead !== bIsHead) return aIsHead - bIsHead;

    // Then wife (married female)
    const aIsWife = a.marital_status === "Menikah" && a.gender === "Perempuan" ? 0 : 1;
    const bIsWife = b.marital_status === "Menikah" && b.gender === "Perempuan" ? 0 : 1;
    if (aIsWife !== bIsWife) return aIsWife - bIsWife;

    // Then by birth year (oldest first)
    const aYear = a.birth_year || 9999;
    const bYear = b.birth_year || 9999;
    return aYear - bYear;
  });
}

/**
 * Get the role label for a family member (KK / Istri / Anak)
 */
export function getFamilyRole(member, familyHead) {
  if (!member || !familyHead) return null;

  const isKepalaKeluarga = member.id === familyHead.id;
  if (isKepalaKeluarga) return "Kepala Keluarga";

  const isIstri = member.marital_status === "Menikah" && member.gender === "Perempuan";
  if (isIstri) return "Istri";

  const isAnak = member.marital_status === "Belum Menikah" || !member.marital_status;
  if (isAnak) return "Anak";

  return null;
}