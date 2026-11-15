const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const PASSWORD_MIN_LENGTH = 8;

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Email wajib diisi.';
  if (!EMAIL_RE.test(v)) return 'Format email tidak valid.';
  return null;
}

export function validateNickname(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Nama panggilan wajib diisi.';
  if (v.length < 2) return 'Nama panggilan minimal 2 karakter.';
  if (v.length > 30) return 'Nama panggilan maksimal 30 karakter.';
  return null;
}

export function validateNewPassword(value: string): string | null {
  if (!value) return 'Kata sandi wajib diisi.';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.`;
  }
  return null;
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return 'Konfirmasi kata sandi wajib diisi.';
  if (password !== confirm) return 'Konfirmasi kata sandi tidak cocok.';
  return null;
}

export function validateRequired(value: string, label: string): string | null {
  return value.trim() ? null : `${label} wajib diisi.`;
}
