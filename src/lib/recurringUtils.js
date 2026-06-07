/**
 * Generate an array of dates for a recurring event.
 * @param {string} startDateStr - ISO date string "YYYY-MM-DD"
 * @param {string} pattern - recurring pattern
 * @param {number} durationMonths - how many months to repeat
 * @returns {Date[]}
 */
export function generateRecurringDates(startDateStr, pattern, durationMonths) {
  const [y, m, d] = startDateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1 + durationMonths, d);

  const nextWeekOfMonth = (date, weekNum) => {
    const dayOfWeek = date.getDay();
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    while (next.getDay() !== dayOfWeek) next.setDate(next.getDate() + 1);
    next.setDate(next.getDate() + (weekNum - 1) * 7);
    return next;
  };

  const dates = [];
  let current = new Date(start);
  let safety = 0;

  while (current < end && safety < 200) {
    safety++;
    dates.push(new Date(current));

    if (pattern === 'weekly') current.setDate(current.getDate() + 7);
    else if (pattern === 'biweekly') current.setDate(current.getDate() + 14);
    else if (pattern === 'monthly') current.setMonth(current.getMonth() + 1);
    else if (pattern === 'first_week') current = nextWeekOfMonth(current, 1);
    else if (pattern === 'second_week') current = nextWeekOfMonth(current, 2);
    else if (pattern === 'third_week') current = nextWeekOfMonth(current, 3);
    else if (pattern === 'fourth_week') current = nextWeekOfMonth(current, 4);
    else break;
  }

  return dates;
}

export function dateToISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const RECURRING_PATTERNS = [
  { value: 'weekly', label: 'Setiap Minggu' },
  { value: 'biweekly', label: 'Setiap 2 Minggu' },
  { value: 'monthly', label: 'Setiap Bulan (tanggal sama)' },
  { value: 'first_week', label: 'Minggu Pertama Tiap Bulan' },
  { value: 'second_week', label: 'Minggu Kedua Tiap Bulan' },
  { value: 'third_week', label: 'Minggu Ketiga Tiap Bulan' },
  { value: 'fourth_week', label: 'Minggu Keempat Tiap Bulan' },
];

export const RECURRING_DURATIONS = [
  { value: 1, label: '1 Bulan' },
  { value: 2, label: '2 Bulan' },
  { value: 3, label: '3 Bulan' },
  { value: 6, label: '6 Bulan' },
  { value: 12, label: '1 Tahun' },
  { value: 24, label: '2 Tahun' },
];