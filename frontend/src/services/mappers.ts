import { CanonicalQuestionV1, Friend, Notification, NotificationType, QuizReportData } from '../types';

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
  const rawProfile =
    row?.profile ??
    ({
      full_name: row?.full_name ?? undefined,
      avatar_url: row?.avatar_url ?? undefined,
      xp: row?.xp ?? undefined,
    } as any);

  const profile =
    rawProfile && typeof rawProfile === 'object'
      ? {
          full_name: rawProfile.full_name ?? undefined,
          avatar_url: rawProfile.avatar_url ?? undefined,
          xp: rawProfile.xp ?? undefined,
        }
      : undefined;

  return {
    id: String(row?.id ?? friendId),
    user_id: String(row?.user_id ?? ''),
    friend_id: String(friendId),
    created_at: String(row?.created_at ?? new Date().toISOString()),
    profile,
  };
};

const ALLOWED_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'friend_request',
  'friend_accept',
  'circle_invite',
  'level_up',
  'leaderboard_overtake',
  'streak_warning',
  'system_announcement',
  'reward_claim',
  'peer_review',
  'ai_quota_warning',
];

const normalizeNotificationType = (v: unknown): NotificationType => {
  if (typeof v !== 'string') return 'system_announcement';
  return (ALLOWED_NOTIFICATION_TYPES as readonly string[]).includes(v)
    ? (v as NotificationType)
    : 'system_announcement';
};

export const mapNotificationRowToNotification = (row: any): Notification => {
  const isRead = typeof row?.is_read === 'boolean' ? row.is_read : !!row?.read;
  const t = normalizeNotificationType(row?.type ?? row?.notif_type);
  return {
    id: String(row?.id ?? ''),
    user_id: String(row?.user_id ?? ''),
    type: t,
    title: String(row?.title ?? t),
    message: String(row?.message ?? ''),
    data: row?.data ?? undefined,
    is_read: isRead,
    created_at: String(row?.created_at ?? new Date().toISOString()),
  };
};

const ALLOWED_SECTIONS: readonly CanonicalQuestionV1['section'][] = [
  'structure',
  'written',
  'reading',
  'listening',
];

const ALLOWED_INTERACTIONS: readonly CanonicalQuestionV1['interaction'][] = [
  'fill_blank',
  'identify_error',
  'multiple_choice',
];

const ALLOWED_CEFR: readonly CanonicalQuestionV1['cefr_target'][] = ['A2', 'B1', 'B2', 'C1'];

export const mapApiQuestionToCanonical = (q: any): CanonicalQuestionV1 => {
  const stimulus = (tryParseJson(q?.stimulus) as any) ?? {};
  const metadata = (tryParseJson(q?.metadata) as any) ?? {};
  if (metadata && typeof metadata === 'object' && !('source' in metadata)) {
    metadata.source = 'ai';
  }

  const choices = tryParseJson(q?.choices);
  const correct = tryParseJson(q?.correct_response);

  const sectionCandidate = typeof q?.section === 'string' ? q.section.toLowerCase() : 'structure';
  const section = (ALLOWED_SECTIONS as readonly string[]).includes(sectionCandidate)
    ? (sectionCandidate as CanonicalQuestionV1['section'])
    : 'structure';

  const interactionCandidate = typeof q?.interaction === 'string' ? q.interaction : 'multiple_choice';
  const interaction = (ALLOWED_INTERACTIONS as readonly string[]).includes(interactionCandidate)
    ? (interactionCandidate as CanonicalQuestionV1['interaction'])
    : 'multiple_choice';

  const cefrCandidate = typeof q?.cefr_target === 'string' ? q.cefr_target : 'B2';
  const cefr_target = (ALLOWED_CEFR as readonly string[]).includes(cefrCandidate)
    ? (cefrCandidate as CanonicalQuestionV1['cefr_target'])
    : 'B2';

  return {
    id: String(q?.id ?? crypto.randomUUID()),
    skill_id: Number(q?.skill_id ?? 0),
    section,
    interaction,
    stimulus: stimulus && typeof stimulus === 'object' ? stimulus : {},
    prompt: String(q?.prompt ?? ''),
    choices: Array.isArray(choices) ? choices.map(String) : [],
    correct_response: Array.isArray(correct) ? correct.map(String) : [],
    cefr_target,
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
