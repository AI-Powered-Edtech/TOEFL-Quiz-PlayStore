import { z } from 'zod';

export const CanonicalQuestionV1Schema = z.object({
  id: z.string(),
  skill_id: z.number(),
  section: z.string(),
  interaction: z.string(),
  stimulus: z.record(z.string(), z.any()),
  prompt: z.string(),
  choices: z.array(z.string()),
  correct_response: z.array(z.string()),
  cefr_target: z.string(),
  difficulty_score: z.number(),
  passage_id: z.string().optional(),
  metadata: z.record(z.string(), z.any()),
  created_at: z.string(),
});

export const FriendProfileSchema = z.object({
  full_name: z.string().nullable().optional().transform(v => v ?? undefined),
  avatar_url: z.string().nullable().optional().transform(v => v ?? undefined),
  xp: z.number().nullable().optional().transform(v => v ?? undefined),
});

export const FriendSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  friend_id: z.string(),
  created_at: z.string(),
  profile: FriendProfileSchema.nullable().optional().transform(v => v ?? undefined),
});

const NotificationTypeSchema = z.enum([
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
]);

export const NotificationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  data: z.any().nullable().optional().transform(v => v ?? undefined),
  is_read: z.boolean(),
  created_at: z.string(),
});

export const QuizReportAnswerSchema = z.object({
  question_number: z.number(),
  prompt_snippet: z.string(),
  is_correct: z.boolean(),
  correct_answer: z.string(),
  user_answer: z.string(),
  skill_type: z.string(),
});

export const QuizReportDataSchema = z.object({
  id: z.string(),
  student_name: z.string(),
  quiz_topic: z.string(),
  score: z.number(),
  total_questions: z.number(),
  correct_count: z.number(),
  answers_snapshot: z.array(QuizReportAnswerSchema),
  created_at: z.string(),
});
