interface AuthLikeError {
  message?: string;
  code?: string;
  status?: number;
}

/** Ubah error Supabase Auth menjadi pesan Bahasa Indonesia yang ramah. */
export function mapAuthError(error: AuthLikeError | null | undefined): string {
  if (!error) return 'Terjadi kesalahan. Coba lagi.';
  const message = (error.message ?? '').toLowerCase();
  const code = error.code ?? '';

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'Email atau kata sandi salah.';
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Email belum diverifikasi. Cek kotak masuk emailmu dan klik tautan verifikasinya.';
  }
  if (code === 'user_already_exists' || message.includes('already registered')) {
    return 'Email ini sudah terdaftar. Silakan masuk.';
  }
  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    error.status === 429 ||
    message.includes('rate limit')
  ) {
    return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
  }
  if (code === 'weak_password' || message.includes('password should be')) {
    return 'Kata sandi terlalu lemah. Gunakan minimal 8 karakter.';
  }
  if (code === 'same_password' || message.includes('different from the old password')) {
    return 'Kata sandi baru harus berbeda dari yang lama.';
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Tidak bisa terhubung ke server. Periksa koneksi internetmu.';
  }
  if (message.includes('provider is not enabled') || message.includes('unsupported provider')) {
    return 'Login dengan Google belum diaktifkan di Supabase. Lihat README bagian Google OAuth.';
  }
  return 'Terjadi kesalahan. Coba lagi.';
}
