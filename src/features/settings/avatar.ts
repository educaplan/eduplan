import { supabase } from '@/lib/supabase';

const BUCKET = 'avatars';
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export function validateAvatarFile(file: File): string | null {
  if (!(file.type in TYPES)) return 'Format foto harus PNG, JPG, atau WebP.';
  if (file.size > AVATAR_MAX_BYTES) return 'Ukuran foto maksimal 2 MB.';
  return null;
}

/** Path objek di bucket avatars dari URL publiknya; null bila URL bukan milik bucket ini (mis. foto Google). */
export function avatarPathFromUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  const path = decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
  return path || null;
}

/** Unggah foto baru ke avatars/<userId>/<waktu>.<ext> dan kembalikan URL publiknya. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const path = `${userId}/${Date.now()}.${TYPES[file.type]}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Hapus objek lama. Kegagalan hanya dicatat: foto yatim tidak merusak apa pun. */
export async function removeAvatarObject(url: string | null): Promise<void> {
  const path = avatarPathFromUrl(url);
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error('Gagal menghapus foto lama:', error);
}
