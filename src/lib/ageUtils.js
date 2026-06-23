const THIS_YEAR = new Date().getFullYear();

export function getAge(birthYear) {
  if (!birthYear) return null;
  return THIS_YEAR - birthYear;
}

export function isAdult(member) {
  if (!member) return false;
  const age = getAge(member.birth_year);
  return age === null || age >= 18;
}

export function isGenerus(member) {
  if (!member) return false;
  const age = getAge(member.birth_year);
  return age !== null && age < 18;
}

// Returns a Set of adult member IDs from a member list
export function getAdultMemberIds(members) {
  return new Set(members.filter(isAdult).map(m => m.id));
}