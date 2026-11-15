/**
 * Kesiapan UTBK (rumus dari pemilik project):
 *   tugas berkategori 'latihan' atau 'tugas' yang berstatus 'selesai'
 *   dibagi jumlah SELURUH tugas (semua kategori dan status).
 * Mengembalikan persen bulat 0-100, atau null bila belum ada tugas sama sekali.
 */
export function computeReadiness(doneCount: number, totalCount: number): number | null {
  if (totalCount <= 0) return null;
  const pct = Math.round((doneCount / totalCount) * 100);
  return Math.min(100, Math.max(0, pct));
}
