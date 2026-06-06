const currentYear = new Date().getFullYear();

const GENERUS_CATEGORIES = [
  { key: "balita",     label: "Balita",      color: "bg-pink-100 text-pink-700 border-pink-200",    minAge: 0,  maxAge: 4  },
  { key: "paud",       label: "PAUD",        color: "bg-orange-100 text-orange-700 border-orange-200", minAge: 5,  maxAge: 6  },
  { key: "caberawit",  label: "Caberawit",   color: "bg-yellow-100 text-yellow-700 border-yellow-200", minAge: 7,  maxAge: 12 },
  { key: "praremaja",  label: "Pra-Remaja",  color: "bg-green-100 text-green-700 border-green-200",  minAge: 13, maxAge: 15 },
  { key: "remaja",     label: "Remaja",      color: "bg-blue-100 text-blue-700 border-blue-200",     minAge: 16, maxAge: 18 },
  { key: "pranikah",   label: "Pra-Nikah",   color: "bg-purple-100 text-purple-700 border-purple-200", minAge: 19, maxAge: 24 },
];

function getAge(birthYear) {
  if (!birthYear) return null;
  return currentYear - birthYear;
}

export default function GenerusBreakdown({ members }) {
  const activeMembers = members.filter(m => m.status === "Aktif" && m.birth_year);

  const counts = GENERUS_CATEGORIES.map(cat => {
    const count = activeMembers.filter(m => {
      const age = getAge(m.birth_year);
      return age !== null && age >= cat.minAge && age <= cat.maxAge;
    }).length;
    return { ...cat, count };
  });

  const totalGenerus = counts.reduce((sum, c) => sum + c.count, 0);
  if (totalGenerus === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-foreground">Generus</h3>
        <span className="text-xs text-muted-foreground">{totalGenerus} total</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {counts.map(cat => (
          <div key={cat.key} className={`rounded-xl border p-3 text-center ${cat.color}`}>
            <p className="text-2xl font-bold leading-none">{cat.count}</p>
            <p className="text-[11px] font-medium mt-1.5 leading-tight">{cat.label}</p>
            <p className="text-[10px] opacity-70 mt-0.5">{cat.minAge}–{cat.maxAge} thn</p>
          </div>
        ))}
      </div>
    </div>
  );
}