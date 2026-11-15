import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { MoreIcon, PlusIcon, SpinnerIcon, TrashIcon } from '@/components/icons';
import { useAuth } from '@/context/AuthContext';
import {
  AssistantBubble,
  ChatHeaderAvatar,
  Composer,
  HistoryCard,
  SuggestionsCard,
  TypingBubble,
  UserBubble,
  WelcomeBubble,
} from '@/features/assistant/widgets';
import { Card } from '@/features/dashboard/widgets';
import { AssistantError, sendAssistantMessage } from '@/lib/assistant';
import { isMissingTable } from '@/lib/dbErrors';
import { supabase } from '@/lib/supabase';
import type { AiConversation, AiMessage } from '@/types/assistant';

const MIGRATION_0004 =
  'Tabel riwayat chat belum ada. Jalankan supabase/migrations/0004_ai_chat.sql di SQL Editor Supabase.';

export default function Assistant() {
  const { profile } = useAuth();
  const name = profile?.nickname ?? 'Pelajar';

  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedCounts, setAppliedCounts] = useState<Record<string, number>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const bottomRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const sending = pending !== null;

  const loadConversations = useCallback(async () => {
    const { data, error: dbError } = await supabase
      .from('ai_conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (dbError) {
      console.error('Gagal memuat riwayat:', dbError);
      if (isMissingTable(dbError)) setError(MIGRATION_0004);
      return;
    }
    setConversations((data ?? []) as AiConversation[]);
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, pending]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  function newConversation() {
    if (sending) return;
    setActiveId(null);
    setMessages([]);
    setInput('');
    setError(null);
    setMenuOpen(false);
  }

  async function openConversation(c: AiConversation) {
    if (sending || c.id === activeId) return;
    setActiveId(c.id);
    setMessages([]);
    setError(null);
    setLoadingMessages(true);
    const { data, error: dbError } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', c.id)
      .order('created_at', { ascending: true })
      .limit(200);
    setLoadingMessages(false);
    if (dbError) {
      console.error('Gagal memuat pesan:', dbError);
      setError('Percakapan belum bisa dibuka. Coba lagi.');
      return;
    }
    setMessages((data ?? []) as AiMessage[]);
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || sending) return;
    setError(null);
    setPending(text);
    setInput('');
    try {
      const reply = await sendAssistantMessage(text, activeId);
      setActiveId(reply.conversationId);
      setMessages((prev) => [...prev, reply.userMessage, reply.assistantMessage]);
      void loadConversations();
    } catch (e) {
      setInput(text); // kembalikan teks supaya bisa dikirim ulang
      setError(e instanceof AssistantError ? e.message : 'Asisten belum bisa menjawab. Coba lagi.');
    } finally {
      setPending(null);
      setNow(new Date());
    }
  }

  async function applyPlan(m: AiMessage) {
    if (!m.plan || applyingId) return;
    setApplyingId(m.id);
    setError(null);
    const rows = m.plan.sessions.map((s) => ({
      title: s.title,
      subject: s.subject,
      starts_at: new Date(`${s.date}T${s.start}:00`).toISOString(),
      duration_minutes: s.durationMinutes,
    }));
    const { error: insertError } = await supabase.from('study_sessions').insert(rows);
    if (insertError) {
      console.error('Gagal menerapkan rencana:', insertError);
      setError('Rencana belum bisa disimpan ke Rencana Belajar. Coba lagi.');
      setApplyingId(null);
      return;
    }
    const appliedAt = new Date().toISOString();
    const { error: markError } = await supabase
      .from('ai_messages')
      .update({ plan_applied_at: appliedAt })
      .eq('id', m.id);
    if (markError) console.error('Gagal menandai rencana diterapkan:', markError);
    // Sesi sudah tersimpan, jadi tombol tetap dikunci di layar walau penandaan gagal.
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, plan_applied_at: appliedAt } : x)));
    setAppliedCounts((prev) => ({ ...prev, [m.id]: rows.length }));
    setApplyingId(null);
  }

  async function deleteConversation() {
    if (!activeId) return;
    const id = activeId;
    const { error: dbError } = await supabase.from('ai_conversations').delete().eq('id', id);
    setMenuOpen(false);
    setConfirmDelete(false);
    if (dbError) {
      console.error('Gagal menghapus percakapan:', dbError);
      setError('Percakapan belum bisa dihapus. Coba lagi.');
      return;
    }
    setActiveId(null);
    setMessages([]);
    void loadConversations();
  }

  const empty = messages.length === 0 && !sending && !loadingMessages;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-[26px] font-extrabold text-navy-900 sm:text-[30px]">Asisten AI</h1>
          <p className="text-[15px] font-medium text-muted">
            Tanya apa saja soal jadwal dan strategi belajarmu
          </p>
        </div>
        <button
          type="button"
          onClick={newConversation}
          disabled={sending}
          className="flex h-12 items-center gap-2 self-start rounded-xl border border-line bg-white px-5 text-sm font-bold text-navy-900 transition hover:bg-cream-50 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-600/40"
        >
          <PlusIcon size={18} />
          Percakapan baru
        </button>
      </header>

      <div className="grid gap-6 lg:h-[calc(100vh-12rem)] lg:min-h-[540px] lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="flex h-[70vh] min-h-[480px] min-w-0 flex-col !p-0 lg:h-auto">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex items-center gap-3">
              <ChatHeaderAvatar />
              <div className="flex flex-col">
                <p className="text-sm font-bold text-navy-900">Asisten EduPlan</p>
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Siap membantu rencana belajarmu
                </p>
              </div>
            </div>
            <div ref={menuRef} className="relative">
              <button
                type="button"
                aria-label="Menu percakapan"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                disabled={!activeId || sending}
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-lg p-1.5 text-muted transition hover:bg-blue-50 hover:text-navy-900 disabled:opacity-40"
              >
                <MoreIcon size={18} />
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-10 mt-1 w-52 rounded-xl border border-line bg-white p-1 shadow-card"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      if (!confirmDelete) {
                        setConfirmDelete(true);
                        return;
                      }
                      void deleteConversation();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger-soft"
                  >
                    <TrashIcon size={14} />
                    {confirmDelete ? 'Yakin hapus?' : 'Hapus percakapan'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
            {loadingMessages ? (
              <div className="flex justify-center py-10 text-royal-600" role="status" aria-label="Memuat">
                <SpinnerIcon size={24} />
              </div>
            ) : null}
            {empty ? <WelcomeBubble name={name} /> : null}
            {messages.map((m) =>
              m.role === 'user' ? (
                <UserBubble key={m.id} text={m.content} />
              ) : (
                <AssistantBubble
                  key={m.id}
                  message={m}
                  now={now}
                  applying={applyingId === m.id}
                  appliedCount={appliedCounts[m.id] ?? null}
                  onApply={(msg) => void applyPlan(msg)}
                />
              ),
            )}
            {pending ? <UserBubble text={pending} /> : null}
            {sending ? <TypingBubble /> : null}
            {error ? <Alert variant="error">{error}</Alert> : null}
            <div ref={bottomRef} />
          </div>

          <Composer value={input} disabled={sending} onChange={setInput} onSend={(t) => void send(t)} />
        </Card>

        <div className="flex min-h-0 flex-col gap-6">
          <HistoryCard
            items={conversations}
            activeId={activeId}
            showAll={showAll}
            now={now}
            onToggleAll={() => setShowAll((v) => !v)}
            onOpen={(c) => void openConversation(c)}
          />
          <SuggestionsCard disabled={sending} onPick={(t) => void send(t)} />
        </div>
      </div>
    </div>
  );
}
