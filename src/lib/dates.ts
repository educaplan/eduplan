const MS_DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Hari pertama minggu: 1 = Senin (bawaan), 0 = Minggu. Diatur dari Pengaturan lewat AuthContext. */
let weekStartsOn: 0 | 1 = 1;

export function setWeekStartsOn(day: 0 | 1): void {
  weekStartsOn = day;
}

const DAY_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/** "Sen", "Sel", ... menurut hari dalam seminggu. */
export function shortDayName(d: Date): string {
  return DAY_SHORT[d.getDay()];
}

export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() - weekStartsOn + 7) % 7));
  return x;
}

export function endOfWeek(d: Date): Date {
  return endOfDay(addDays(startOfWeek(d), 6));
}

/** Kunci tanggal lokal "YYYY-MM-DD". */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Selisih hari kalender (a - b), tidak terpengaruh jam. */
export function diffInDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / MS_DAY);
}

export function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 4) return 'Selamat malam';
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/** Jam dengan titik, mis. "08.30" (format Indonesia seperti di desain). */
export function formatTime(d: Date): string {
  return `${pad(d.getHours())}.${pad(d.getMinutes())}`;
}

const fullDate = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const shortDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });
const shortDateYear = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const hoursFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

/** "Rabu, 21 Oktober 2026" */
export function formatFullDate(d: Date): string {
  return fullDate.format(d);
}

/** "28 Okt" (ditambah tahun bila bukan tahun ini). */
export function formatShortDate(d: Date, now: Date): string {
  return d.getFullYear() === now.getFullYear() ? shortDate.format(d) : shortDateYear.format(d);
}

/** Label tenggat: "Hari ini, 23.59", "Besok, 20.00", "30 Okt", "Terlambat, 20 Okt". */
export function formatDue(iso: string | null, allDay: boolean, now: Date): string {
  if (!iso) return 'Tanpa tenggat';
  const d = new Date(iso);
  const diff = diffInDays(d, now);
  let label: string;
  if (diff === 0) label = 'Hari ini';
  else if (diff === 1) label = 'Besok';
  else if (diff < 0) label = `Terlambat, ${formatShortDate(d, now)}`;
  else label = formatShortDate(d, now);
  return allDay ? label : `${label}, ${formatTime(d)}`;
}

/** 750 menit -> "12,5 jam" */
export function formatHours(minutes: number): string {
  return `${hoursFormat.format(minutes / 60)} jam`;
}
