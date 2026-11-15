import type { EducationLevel } from '@/types/profile';

export const EDUCATION_LEVELS: EducationLevel[] = ['SMP', 'SMA', 'SMK', 'Kuliah'];

const range = (from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

/** Pilihan kelas (SMP/SMA/SMK) atau semester (Kuliah) menurut jenjang. */
export const GRADE_OPTIONS: Record<EducationLevel, string[]> = {
  SMP: range(7, 9),
  SMA: range(10, 12),
  SMK: range(10, 12),
  Kuliah: range(1, 14),
};

/**
 * Pilihan jurusan menurut jenjang.
 * - SMP: tidak ada jurusan
 * - Kuliah: diisi bebas (teks), jadi tidak ada daftar
 */
export const MAJOR_OPTIONS: Partial<Record<EducationLevel, string[]>> = {
  SMA: ['IPA', 'IPS', 'Bahasa', 'Umum'],
  SMK: [
    'Teknik Komputer dan Jaringan',
    'Rekayasa Perangkat Lunak',
    'Multimedia',
    'Akuntansi dan Keuangan Lembaga',
    'Otomatisasi dan Tata Kelola Perkantoran',
    'Bisnis Daring dan Pemasaran',
    'Teknik Kendaraan Ringan',
    'Lainnya',
  ],
};

export const SESSION_DURATIONS = [25, 30, 45, 60, 90] as const;

export const gradeLabel = (level: EducationLevel | ''): string =>
  level === 'Kuliah' ? 'Semester' : 'Kelas';

export const needsMajor = (level: EducationLevel | ''): boolean =>
  level === 'SMA' || level === 'SMK' || level === 'Kuliah';
