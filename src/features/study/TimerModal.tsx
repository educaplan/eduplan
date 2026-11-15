import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { clock, remainingSeconds } from './model';
import type { StudySession } from '@/types/tasks';

interface TimerModalProps {
  session: StudySession | null;
  busy: boolean;
  onClose: () => void;
  onFinish: (s: StudySession) => void;
  onCancel: (s: StudySession) => void;
}

function TimerBody({ session, busy, onFinish, onCancel }: Omit<TimerModalProps, 'session' | 'onClose'> & { session: StudySession }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const left = remainingSeconds(session, now) ?? session.duration_minutes * 60;
  const total = session.duration_minutes * 60;
  const pct = Math.min(100, Math.max(0, ((total - left) / total) * 100));
  const over = left < 0;

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-center text-sm font-medium text-muted">
        {session.subject ? `${session.subject} · ` : ''}
        {session.title}
      </p>
      <p
        className="text-[56px] font-extrabold leading-none tabular-nums text-navy-900"
        role="timer"
        aria-live="off"
      >
        {clock(left)}
      </p>
      <p className="text-sm font-semibold text-royal-600">
        {over ? 'Waktu sesi sudah habis' : `Durasi ${session.duration_minutes} menit`}
      </p>
      <div className="h-2 w-full overflow-hidden rounded bg-cream-300">
        <div className="h-2 rounded bg-navy-800 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex w-full justify-end gap-3 pt-1">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => onCancel(session)}
          className="!h-11 rounded-xl border border-line bg-white"
        >
          Batalkan
        </Button>
        <Button loading={busy} onClick={() => onFinish(session)} className="!h-11 !w-auto px-5 !text-sm">
          Selesai
        </Button>
      </div>
    </div>
  );
}

export function TimerModal({ session, busy, onClose, onFinish, onCancel }: TimerModalProps) {
  return (
    <Modal
      open={session !== null}
      onClose={onClose}
      title="Sesi sedang berjalan"
      description="Timer tetap jalan walau jendela ini ditutup. Buka lagi lewat tombol di daftar sesi."
    >
      {session ? (
        <TimerBody session={session} busy={busy} onFinish={onFinish} onCancel={onCancel} />
      ) : null}
    </Modal>
  );
}
