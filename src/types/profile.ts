export type EducationLevel = 'SMP' | 'SMA' | 'SMK' | 'Kuliah';

export interface Profile {
  id: string;
  email: string | null;
  nickname: string | null;
  avatar_url: string | null;
  education_level: EducationLevel | null;
  school_name: string | null;
  grade: string | null;
  major: string | null;
  academic_goal: string | null;
  study_session_minutes: number;
  /** Kolom dari migrasi 0005; opsional agar aplikasi tetap jalan sebelum migrasi dijalankan. */
  weekly_target_hours?: number;
  /** 1 = Senin, 0 = Minggu. */
  week_starts_on?: number;
  notif_deadline?: boolean;
  notif_daily?: boolean;
  notif_ai?: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}
