import { CanonicalQuestionV1, Friend, Notification, QuizReportData } from '../types';

const tryParseJson = (v: unknown): unknown => {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

export const mapFriendRowToFriend = (row: any): Friend => {
  const friendId = row?.friend_id ?? row?.id ?? '';
  const profile =
    row?.profile ??
    ({
      full_name: row?.full_name ?? null,
      avatar_url: row?.avatar_url ?? null,
      xp: row?.xp ?? null,
    } as any);

  return {
    id: String(row?.id ?? friendId),
    user_id: String(row?.user_id ?? ''),
    friend_id: String(friendId),
    created_at: String(row?.created_at ?? new Date().toISOString()),
    profile: profile,
  };
};

export const mapNotificationRowToNotification = (row: any): Notification => {
  const isRead = typeof row?.is_read === 'boolean' ? row.is_read : !!row?.read;
  const t = row?.type ?? row?.notif_type ?? 'system';
  return {
    id: String(row?.id ?? ''),
    user_id: String(row?.user_id ?? ''),
    type: t,
    title: String(row?.title ?? t),
    message: String(row?.message ?? ''),
    data: row?.data ?? null,
    is_read: isRead,
    created_at: String(row?.created_at ?? new Date().toISOString()),
  };
};

export const mapApiQuestionToCanonical = (q: any): CanonicalQuestionV1 => {
  const stimulus = (tryParseJson(q?.stimulus) as any) ?? {};
  const metadata = (tryParseJson(q?.metadata) as any) ?? {};
  if (metadata && typeof metadata === 'object' && !('source' in metadata)) {
    metadata.source = 'ai';
  }

  const choices = tryParseJson(q?.choices);
  const correct = tryParseJson(q?.correct_response);

  const section = typeof q?.section === 'string' ? q.section.toLowerCase() : 'structure';

  return {
    id: String(q?.id ?? crypto.randomUUID()),
    skill_id: String(q?.skill_id ?? ''),
    section,
    interaction: String(q?.interaction ?? 'multiple_choice'),
    stimulus: stimulus && typeof stimulus === 'object' ? stimulus : {},
    prompt: String(q?.prompt ?? ''),
    choices: Array.isArray(choices) ? choices.map(String) : [],
    correct_response: Array.isArray(correct) ? correct.map(String) : [],
    cefr_target: String(q?.cefr_target ?? 'B2'),
    difficulty_score: Number.isFinite(q?.difficulty_score) ? q.difficulty_score : 50,
    passage_id: q?.passage_id != null ? String(q.passage_id) : undefined,
    metadata: metadata && typeof metadata === 'object' ? metadata : { source: 'ai' },
    created_at: String(q?.created_at ?? new Date().toISOString()),
  };
};

export const mapQuizReportResponseToQuizReportData = (row: any): QuizReportData => {
  return {
    id: String(row?.id ?? ''),
    student_name: String(row?.student_name ?? ''),
    quiz_topic: String(row?.quiz_topic ?? ''),
    score: Number(row?.score ?? 0),
    total_questions: Number(row?.total_questions ?? 0),
    correct_count: Number(row?.correct_count ?? 0),
    answers_snapshot: Array.isArray(row?.answers_snapshot) ? row.answers_snapshot : [],
    created_at: String(row?.created_at ?? new Date().toISOString()),
  };
};

