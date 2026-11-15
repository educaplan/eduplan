import { useEffect, useMemo, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FlameIcon, SpinnerIcon, TasksIcon, TimerIcon } from '@/components/icons';
import { computeProgress } from '@/features/progress/model';
import type { Period } from '@/features/progress/model';
import { useProgressData } from '@/features/progress/useProgressData';
import {
  AchievementsCard,
  HoursChart,
  PeriodToggle,
  ProgressStat,
  SubjectProgressCard,
  TaskDonut,
} from '@/features/progress/widgets';
import { NotificationsBell } from '@/features/study/NotificationsBell';
import { hoursText } from '@/features/study/model';

function hoursDiffText(cur: number, prev: number, unit: string): string {
  if (cur === 0 && prev === 0) return `Belum ada sesi selesai ${unit}`;
  const diff = cur - prev;
  if (diff === 0) return `Sama dengan ${unit.replace(' ini', ' lalu')}`;
  return `${diff > 0 ? 'Naik' : 'Turun'} ${hoursText(Math.abs(diff))} jam dari ${unit.replace(' ini', ' lalu')}`;
}

export default function Progress() {
  const [period, setPeriod] = useState<Period>('minggu');
  const [now, setNow] = useState(() => new Date());
  const { sessions, tasks, loading, error, reload } = useProgressData();

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const data = useMemo(() => computeProgress(period, sessions, tasks, now), [period, sessions, tasks, now]);
  const weekly = period === 'minggu';
  const unit = weekly ? 'minggu ini' : 'bulan ini';
  const targetLabel =
    data.targetPerBarMin === null
      ? null
      : `Target ${hoursText(data.targetPerBarMin)} jam/${weekly ? 'hari' : 'minggu'}`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[26px] font-extrabold text-navy-900 sm:text-[30px]">Progres</h1>
          <p className="text-[15px] font-medium text-muted">
            Pantau perkembangan belajarmu dari waktu ke waktu
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodToggle value={period} onChange={setPeriod} />
          <NotificationsBell />
        </div>
      </header>

      {error ? (
        <div className="flex flex-col items-start gap-3">
          <Alert variant="error">{error}</Alert>
          <Button variant="secondary" className="!h-auto !px-0" onClick={() => void reload()}>
            Coba lagi
          </Button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-24 text-royal-600" role="status" aria-label="Memuat">
          <SpinnerIcon size={28} />
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <ProgressStat
              label="Jam belajar"
              value={`${hoursText(data.hoursMin)} jam`}
              caption={hoursDiffText(data.hoursMin, data.prevHoursMin, unit)}
              icon={<TimerIcon />}
            />
            <ProgressStat
              label="Tugas selesai"
              value={`${data.tasks.onTime} / ${data.tasks.total}`}
              caption={
                data.tasks.pct === null
                  ? 'Belum ada tugas bertenggat di periode ini'
                  : `${data.tasks.pct}% selesai tepat waktu`
              }
              icon={<TasksIcon />}
            />
            <ProgressStat
              label="Streak belajar"
              value={`${data.streak.current} hari`}
              caption={
                data.streak.best > 0
                  ? `Rekor terbaikmu ${data.streak.best} hari`
                  : 'Selesaikan sesi belajar untuk memulai streak'
              }
              icon={<FlameIcon />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <HoursChart
              title={weekly ? 'Jam belajar per hari' : 'Jam belajar per minggu'}
              targetLabel={targetLabel}
              bars={data.chart}
              targetMin={data.targetPerBarMin}
            />
            <TaskDonut tasks={data.tasks} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
            <SubjectProgressCard subjects={data.subjects} />
            <AchievementsCard
              focusText={`${hoursText(data.hoursMin)} jam fokus`}
              tasksDone={data.tasksDone}
              periodLabel={unit}
              focusIcon={<TimerIcon size={22} />}
              taskIcon={<TasksIcon size={22} />}
            />
          </div>
        </>
      )}
    </div>
  );
}
