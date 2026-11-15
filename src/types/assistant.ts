export interface AiPlanSession {
  /** "YYYY-MM-DD" waktu lokal user. */
  date: string;
  /** "HH:mm". */
  start: string;
  durationMinutes: number;
  subject: string;
  title: string;
}

export interface AiPlan {
  sessions: AiPlanSession[];
}

export interface AiConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  plan: AiPlan | null;
  plan_applied_at: string | null;
  created_at: string;
}
