export type TaskCategory = 'tugas' | 'ujian' | 'latihan' | 'proyek';
export type TaskPriority = 'tinggi' | 'sedang' | 'rendah';
export type TaskStatus = 'todo' | 'selesai';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  category: TaskCategory;
  priority: TaskPriority | null;
  due_at: string | null;
  due_all_day: boolean;
  status: TaskStatus;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  starts_at: string;
  duration_minutes: number;
  completed_at: string | null;
  notes: string | null;
  /** Terisi saat tombol Mulai ditekan; null bila belum dimulai. */
  started_at: string | null;
  remind_me: boolean;
  created_at: string;
  updated_at: string;
}

export const CATEGORY_LABEL: Record<TaskCategory, string> = {
  tugas: 'Tugas',
  ujian: 'Ujian',
  latihan: 'Latihan soal',
  proyek: 'Proyek / presentasi',
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  tinggi: 'Tinggi',
  sedang: 'Sedang',
  rendah: 'Rendah',
};
