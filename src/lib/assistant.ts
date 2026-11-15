import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AiMessage } from '@/types/assistant';

export class AssistantError extends Error {}

export interface AssistantReply {
  conversationId: string;
  userMessage: AiMessage;
  assistantMessage: AiMessage;
}

/** Kirim pesan ke Asisten AI. Server menyimpan kedua pesan dan menambahkan konteks tugas/sesi user. */
export async function sendAssistantMessage(
  message: string,
  conversationId: string | null,
): Promise<AssistantReply> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data, error } = await supabase.functions.invoke<AssistantReply>('ai-assistant', {
    body: { message, conversationId, timeZone },
  });
  if (!error && data) return data;

  if (error instanceof FunctionsFetchError) {
    throw new AssistantError(
      'Tidak bisa terhubung ke server. Periksa koneksi internetmu, atau pastikan Edge Function ai-assistant sudah dideploy.',
    );
  }
  if (error instanceof FunctionsHttpError) {
    const payload = (await error.context.json().catch(() => null)) as { message?: string } | null;
    throw new AssistantError(payload?.message ?? 'Asisten belum bisa menjawab. Coba lagi.');
  }
  throw new AssistantError('Asisten belum bisa menjawab. Coba lagi.');
}
