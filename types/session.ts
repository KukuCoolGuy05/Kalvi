/**
 * Conversation + session types shared across client and server.
 */

export type ChatRole = "user" | "assistant" | "system";

/**
 * A single chat message as stored in LearningSession.messages (Json) and sent
 * over the wire. `id` is client-generated for React keys / optimistic UI.
 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string; // ISO timestamp
  /** Set when this assistant turn was produced by the RETEACH protocol. */
  reteach?: boolean;
}

/** Quick-reply actions surfaced in the chat UI. */
export type QuickReplyAction = "confused" | "slow_down" | "speed_up";

export interface DashboardSubject {
  subject: string;
  topic: string;
  masteryLevel: number; // 0..1
  lastReviewedAt: string;
  nextReviewAt: string | null;
  reviewCount: number;
  dueForReview: boolean;
}

export interface DashboardData {
  name: string | null;
  streak: number;
  lastSessionSummary: string | null;
  subjects: DashboardSubject[];
  dueReviews: DashboardSubject[];
}

/** Summary persisted at session end and used by get_session_context. */
export interface SessionSummary {
  id: string;
  subject: string;
  topic: string;
  startedAt: string;
  endedAt: string | null;
  messageCount: number;
  confusionCount: number;
  completionRate: number;
}
