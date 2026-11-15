import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { diffInDays, formatShortDate } from '@/lib/dates';
import { CheckIcon, SendIcon, SparklesIcon, SpinnerIcon } from '@/components/icons';
import { Card } from '@/features/dashboard/widgets';
import type { AiConversation, AiMessage, AiPlan } from '@/types/assistant';

export const QUICK_PROMPTS = [
  'Pecah tugas jadi langkah kecil',
  'Kapan waktu belajar terbaik?',
  'Buat jadwal ujian',
];

export const SUGGESTIONS = [
  'Ringkas materi turunan dalam 5 poin',
  'Bantu aku buat target belajar bulan ini',
];

/** Teks AI ditampilkan polos: buang sisa markdown dan ubah penanda daftar jadi "•". */
export function plainText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[*-]\s+/gm, '• ');
}

function AssistantAvatar({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-blue-100 text-royal-600',
        size === 'sm' ? 'h-7 w-7' : 'h-10 w-10 !rounded-xl bg-navy-800 text-cream-200',
      )}
    >
      <SparklesIcon size={size === 'sm' ? 14 : 20} />
    </span>
  );
}

export function ChatHeaderAvatar() {
  return <AssistantAvatar size="md" />;
}

/* ---------- Gelembung ---------- */

export function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[78%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-navy-800 px-4 py-3 text-sm font-medium text-cream-200">
        {text}
      </p>
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="flex items-start gap-2.5" role="status" aria-label="Asisten sedang mengetik">
      <AssistantAvatar />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-line bg-cream-50 px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'long' });

function PlanTable({ plan, now }: { plan: AiPlan; now: Date }) {
  return (
    <ul className="rounded-xl bg-blue-50 px-3.5 py-1">
      {plan.sessions.map((s, i) => {
        const d = new Date(`${s.date}T00:00:00`);
        return (
          <li
            key={`${s.date}-${s.start}-${i}`}
            className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-2.5 last:border-b-0"
          >
            <span className="text-xs font-medium text-muted">
              <span className="block">{weekday.format(d)}</span>
              <span className="block text-[11px] opacity-80">
                {formatShortDate(d, now)} · {s.start.replace(':', '.')}
              </span>
            </span>
            <span className="min-w-0 truncate text-[13px] font-bold text-navy-900">
              {s.subject}: {s.title}
            </span>
            <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[11px] font-semibold text-navy-900">
              {s.durationMinutes} mnt
            </span>
          </li>
        );
      })}
    </ul>
  );
}

interface AssistantBubbleProps {
  message: AiMessage;
  now: Date;
  applying: boolean;
  appliedCount: number | null;
  onApply: (m: AiMessage) => void;
}

export function AssistantBubble({ message, now, applying, appliedCount, onApply }: AssistantBubbleProps) {
  const applied = Boolean(message.plan_applied_at);
  return (
    <div className="flex items-start gap-2.5">
      <AssistantAvatar />
      <div className="flex min-w-0 max-w-[88%] flex-col gap-3 rounded-2xl rounded-tl-md border border-line bg-cream-50 px-4 py-3.5">
        <p className="whitespace-pre-wrap break-words text-sm font-medium text-navy-900">
          {plainText(message.content)}
        </p>
        {message.plan && message.plan.sessions.length > 0 ? (
          <>
            <PlanTable plan={message.plan} now={now} />
            {applied ? (
              <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-success">
                <CheckIcon size={14} />
                {appliedCount !== null ? `${appliedCount} sesi ditambahkan.` : 'Sudah diterapkan.'}{' '}
                <Link to="/study-plan" className="text-royal-600 underline hover:text-navy-900">
                  Lihat di Rencana Belajar
                </Link>
              </p>
            ) : (
              <button
                type="button"
                disabled={applying}
                onClick={() => onApply(message)}
                className="flex h-10 items-center gap-2 self-start rounded-[10px] bg-navy-800 px-4 text-[13px] font-bold text-cream-200 transition hover:bg-navy-900 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40 focus-visible:ring-offset-2"
              >
                {applying ? <SpinnerIcon size={14} /> : <CheckIcon size={14} />}
                Terapkan ke Rencana Belajar
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

export function WelcomeBubble({ name }: { name: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <AssistantAvatar />
      <p className="max-w-[88%] rounded-2xl rounded-tl-md border border-line bg-cream-50 px-4 py-3.5 text-sm font-medium text-navy-900">
        Halo {name}! Aku Asisten EduPlan. Aku bisa membantu menyusun jadwal, memecah tugas besar,
        atau memberi strategi belajar UTBK. Mau mulai dari mana?
      </p>
    </div>
  );
}

/* ---------- Kotak input ---------- */

interface ComposerProps {
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  onSend: (text: string) => void;
}

export function Composer({ value, disabled, onChange, onSend }: ComposerProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-line p-4">
      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onSend(q)}
            className="rounded-full bg-blue-50 px-3.5 py-2 text-xs font-semibold text-navy-900 transition hover:bg-blue-100 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40"
          >
            {q}
          </button>
        ))}
      </div>
      <form
        className="flex items-center gap-2 rounded-xl border border-line bg-white py-1.5 pl-4 pr-1.5 focus-within:border-royal-600 focus-within:ring-2 focus-within:ring-royal-600/15"
        onSubmit={(e) => {
          e.preventDefault();
          onSend(value);
        }}
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={2000}
          placeholder="Tulis pertanyaanmu di sini..."
          aria-label="Pertanyaan untuk asisten"
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-navy-900 outline-none placeholder:text-muted disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Kirim"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-navy-800 text-cream-200 transition hover:bg-navy-900 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40"
        >
          {disabled ? <SpinnerIcon size={16} /> : <SendIcon size={16} />}
        </button>
      </form>
    </div>
  );
}

/* ---------- Panel kanan ---------- */

function dayLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  const diff = diffInDays(now, d);
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Kemarin';
  return formatShortDate(d, now);
}

interface HistoryCardProps {
  items: AiConversation[];
  activeId: string | null;
  showAll: boolean;
  now: Date;
  onToggleAll: () => void;
  onOpen: (c: AiConversation) => void;
}

export function HistoryCard({ items, activeId, showAll, now, onToggleAll, onOpen }: HistoryCardProps) {
  const shown = showAll ? items : items.slice(0, 4);
  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-2 !p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-navy-900">Riwayat percakapan</h2>
        {items.length > 4 ? (
          <button
            type="button"
            onClick={onToggleAll}
            className="text-xs font-semibold text-royal-600 hover:text-navy-900"
          >
            {showAll ? 'Ringkas' : 'Semua'}
          </button>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm font-medium text-muted">
          Belum ada percakapan. Mulai dengan bertanya sesuatu.
        </p>
      ) : (
        <ul className="min-h-0 overflow-y-auto">
          {shown.map((c) => (
            <li key={c.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => onOpen(c)}
                aria-current={c.id === activeId}
                className={cn(
                  'flex w-full flex-col gap-0.5 rounded-lg px-2 py-2.5 text-left transition hover:bg-blue-50',
                  c.id === activeId && 'bg-blue-50',
                )}
              >
                <span className="truncate text-[13px] font-bold text-navy-900">{c.title}</span>
                <span className="text-[11px] font-medium text-muted">{dayLabel(c.updated_at, now)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function SuggestionsCard({ disabled, onPick }: { disabled: boolean; onPick: (t: string) => void }) {
  return (
    <Card className="flex flex-col gap-3 !p-5">
      <h2 className="text-base font-bold text-navy-900">Coba tanyakan</h2>
      {SUGGESTIONS.map((t) => (
        <button
          key={t}
          type="button"
          disabled={disabled}
          onClick={() => onPick(t)}
          className="flex items-center gap-2.5 rounded-xl bg-blue-50 px-3.5 py-3 text-left text-[13px] font-semibold text-navy-900 transition hover:bg-blue-100 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40"
        >
          <SparklesIcon size={15} className="shrink-0 text-royal-600" />
          {t}
        </button>
      ))}
    </Card>
  );
}
