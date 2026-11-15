import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { FlameIcon } from '@/components/icons';
import { dateKey, formatShortDate, formatTime, shortDayName } from '@/lib/dates';
import type { GoogleCalendarStatus } from '@/lib/googleCalendar';
import type { Task } from '@/types/tasks';
import { Card } from '@/features/dashboard/widgets';
import { countdownText, isSameMonth, sameDay } from './model';
import type { CalItem, CalKind } from './model';

const MAX_CHIPS = 2;

const CHIP_STYLE: Record<CalKind, string> = {
  tugas: 'bg-blue-100 text-royal-600',
  ujian: 'bg-navy-800 text-cream-200',
  sesi: 'bg-cream-200 text-navy-800',
  terlambat: 'bg-danger-soft text-danger',
  google: 'border border-line bg-white text-navy-900',
};

const DOT_STYLE: Record<CalKind, string> = {
  tugas: 'bg-royal-600',
  ujian: 'bg-navy-800',
  sesi: 'bg-cream-300',
  terlambat: 'bg-danger',
  google: 'border border-line bg-white',
};

const KIND_LABEL: Record<CalKind, string> = {
  tugas: 'Tenggat',
  ujian: 'Ujian',
  sesi: 'Sesi belajar',
  terlambat: 'Terlambat',
  google: 'Google Calendar',
};

function Dot({ kind }: { kind: CalKind }) {
  return <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', DOT_STYLE[kind])} />;
}

/* ---------- Panel bulan ---------- */

interface MonthPanelProps {
  title: string;
  year: number;
  month: number;
  weeks: Date[][];
  byDay: Map<string, CalItem[]>;
  now: Date;
  selected: Date;
  onSelect: (d: Date) => void;
  showGoogle: boolean;
}

export function MonthPanel({
  title,
  year,
  month,
  weeks,
  byDay,
  now,
  selected,
  onSelect,
  showGoogle,
}: MonthPanelProps) {
  const legend: CalKind[] = showGoogle
    ? ['tugas', 'ujian', 'sesi', 'terlambat', 'google']
    : ['tugas', 'ujian', 'sesi', 'terlambat'];
  const legendLabel: Record<CalKind, string> = {
    tugas: 'Tugas',
    ujian: 'Ujian',
    sesi: 'Sesi belajar',
    terlambat: 'Terlambat',
    google: 'Google',
  };

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-3 !p-4 sm:!p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-xl font-bold text-navy-900">{title}</h2>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {legend.map((k) => (
            <li key={k} className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <Dot kind={k} />
              {legendLabel[k]}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-7">
        {weeks[0].map((d) => (
          <div key={d.getDay()} className="py-1.5 text-center text-[13px] font-semibold text-muted">
            {shortDayName(d)}
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-line">
        {weeks.map((week, wi) => (
          <div key={wi} className={cn('grid grid-cols-7', wi < weeks.length - 1 && 'border-b border-line')}>
            {week.map((day, di) => {
              const items = byDay.get(dateKey(day)) ?? [];
              const inMonth = isSameMonth(day, year, month);
              const isToday = sameDay(day, now);
              const isSelected = sameDay(day, selected);
              const extra = items.length - MAX_CHIPS;
              return (
                <button
                  key={di}
                  type="button"
                  onClick={() => onSelect(day)}
                  aria-label={`${day.getDate()}, ${items.length} agenda`}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex min-h-[64px] min-w-0 flex-col items-stretch gap-1.5 p-1.5 text-left transition sm:min-h-[104px] sm:p-2',
                    di < 6 && 'border-r border-line',
                    isSelected ? 'bg-cream-100' : 'hover:bg-cream-100/60',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-royal-600/50',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold',
                      isToday
                        ? 'bg-navy-800 text-cream-200'
                        : inMonth
                          ? 'text-navy-900'
                          : 'text-muted opacity-50',
                    )}
                  >
                    {day.getDate()}
                  </span>

                  {/* Ponsel: titik-titik; layar lebar: label acara. */}
                  <span className="flex flex-wrap gap-1 sm:hidden">
                    {items.slice(0, 4).map((it) => (
                      <Dot key={it.id} kind={it.kind} />
                    ))}
                  </span>
                  <span className="hidden min-w-0 flex-col gap-1 sm:flex">
                    {items.slice(0, MAX_CHIPS).map((it) => (
                      <span
                        key={it.id}
                        className={cn(
                          'truncate rounded-md px-2 py-1 text-[11px] font-semibold',
                          it.soft ? 'bg-blue-50 text-muted' : CHIP_STYLE[it.kind],
                        )}
                      >
                        {it.title}
                      </span>
                    ))}
                    {extra > 0 ? (
                      <span className="px-1 text-[11px] font-semibold text-muted">+{extra} lagi</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------- Ujian terdekat ---------- */

export function NextExamCard({ exam, now }: { exam: Task | null; now: Date }) {
  const at = exam?.due_at ? new Date(exam.due_at) : null;
  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] bg-navy-800 p-[22px]">
      <div className="flex items-center gap-2 text-cream-300">
        <FlameIcon size={16} />
        <p className="text-[13px] font-semibold">Ujian terdekat</p>
      </div>
      {exam && at ? (
        <>
          <p className="text-[22px] font-extrabold leading-tight text-cream-200">{exam.title}</p>
          <p className="text-sm font-medium text-cream-300">
            {formatShortDate(at, now)}
            {exam.due_all_day ? '' : `, ${formatTime(at)}`}
          </p>
          <span className="self-start rounded-[10px] bg-royal-600 px-3.5 py-2 text-sm font-bold text-cream-200">
            {countdownText(at, now)}
          </span>
        </>
      ) : (
        <p className="text-sm font-medium text-cream-300">Belum ada ujian terjadwal.</p>
      )}
    </div>
  );
}

/* ---------- Agenda hari terpilih ---------- */

export function AgendaCard({ title, items }: { title: string; items: CalItem[] }) {
  return (
    <Card className="flex flex-col gap-3 !p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-navy-900">{title}</h2>
        <Link to="/tasks" className="text-sm font-semibold text-royal-600 hover:text-navy-900">
          Lihat semua
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm font-medium text-muted">Tidak ada agenda di hari ini.</p>
      ) : (
        <ul>
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
              <span className="w-12 shrink-0 text-[13px] font-bold text-royal-600">
                {it.allDay ? 'Seharian' : formatTime(it.at)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <p className="w-full break-words text-sm font-semibold text-navy-900">{it.title}</p>
                <span
                  className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', CHIP_STYLE[it.kind])}
                >
                  {KIND_LABEL[it.kind]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------- Hubungkan Google Calendar (tambahan, tidak ada di desain) ---------- */

interface GoogleCardProps {
  status: GoogleCalendarStatus | null;
  statusLoading: boolean;
  busy: boolean;
  needsReconnect: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function GoogleCard({
  status,
  statusLoading,
  busy,
  needsReconnect,
  onConnect,
  onDisconnect,
}: GoogleCardProps) {
  const connected = Boolean(status?.connected) && !needsReconnect;
  return (
    <Card className="flex flex-col gap-3 !p-5">
      <h2 className="text-base font-bold text-navy-900">Google Calendar</h2>
      {statusLoading ? (
        <p className="text-sm font-medium text-muted">Memeriksa status…</p>
      ) : connected ? (
        <>
          <p className="text-sm font-medium text-muted">
            Terhubung{status?.email ? ` sebagai ${status.email}` : ''}. Acara Google tampil di
            kalender ini.
          </p>
          <Button variant="secondary" onClick={onDisconnect} loading={busy}>
            Putuskan koneksi
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-muted">
            {needsReconnect
              ? 'Izin Google Calendar kedaluwarsa. Hubungkan ulang untuk menampilkan acaramu.'
              : 'Tampilkan acara Google Calendar-mu di sini. Kamu akan diminta izin oleh Google.'}
          </p>
          <Button onClick={onConnect} loading={busy}>
            {needsReconnect ? 'Hubungkan ulang' : 'Hubungkan Google Calendar'}
          </Button>
        </>
      )}
    </Card>
  );
}
