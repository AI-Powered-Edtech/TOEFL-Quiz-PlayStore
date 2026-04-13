

export type SectionType = 'STRUCTURE' | 'WRITTEN' | 'LISTENING' | 'READING' | 'SPEAKING';

/**
 * Passage entity for reading/listening comprehension
 * Stored in separate 'passages' table to avoid duplication
 */
export interface Passage {
  id: string;
  text: string;
  title?: string;
  topic?: string;
  word_count?: number;
  cefr_level: string;
  section: 'reading' | 'listening';
  created_at: string;
  metadata?: Record<string, any>;
}

// --- PHASE 2: DATABASE HARDENING CONTRACT ---

export interface CanonicalQuestionV1 {
  id?: string; // UUID
  skill_id: number; // Numeric ID

  // Strict Enum from Phase 2 Schema
  section: 'structure' | 'written' | 'reading' | 'listening';

  // Strict Enum for Interaction Type
  interaction: 'fill_blank' | 'identify_error' | 'multiple_choice';

  // Structured Stimulus Object
  stimulus: {
    text?: string;       // For Reading/Structure Context (deprecated for reading, use passage_id)
    audio_url?: string;  // For Listening
    passage_id?: string; // Foreign key to passages table (for reading questions)
    image_url?: string;
  };

  prompt: string;
  choices: string[]; // JSONB in DB
  correct_response: string[]; // JSONB in DB

  cefr_target: 'A2' | 'B1' | 'B2' | 'C1';
  difficulty_score: number; // 1-100

  metadata: {
    source: 'ai' | 'db' | 'pdf';
    explanation?: string;
    pattern_tip?: string;
    qti_compliant?: boolean;
    cefr_compliant?: boolean;
    validated_at?: string;
    referenced_text?: string;
    hints?: string[];
    topic?: string;
    generation_model?: string;
  };

  // Deprecated fields kept optional for UI backward compatibility during migration
  skill_type?: string;
}

export interface IELTSWritingTask {
  type: 'Task 1' | 'Task 2';
  prompt: string;
  source_text?: string; // For Task 1 data description or Task 2 context
  suggested_structure?: string[];
  time_limit: number;
  model_answer?: string;
}

// Alias for backward compatibility
export type QuizData = CanonicalQuestionV1;

export interface QuizState {
  status: 'idle' | 'generating' | 'playing' | 'answered' | 'error';
  currentData: CanonicalQuestionV1 | null;
  selectedOptionIndex: number | null;
  score: number;
  error?: string;
  queue: CanonicalQuestionV1[];
  queueIndex: number;
  answers: Record<number, number>;
  marked: number[];
  topic?: string;
}

export interface QuizResult {
  id: string;
  userName: string;
  date: string;
  topic: string;
  skillId?: number;
  section: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  xpEarned: number;
}

export interface QuizReportData {
  id: string;
  student_name: string;
  quiz_topic: string;
  score: number;
  total_questions: number;
  correct_count: number;
  created_at: string;
  answers_snapshot: {
    question_number: number;
    prompt_snippet: string;
    is_correct: boolean;
    correct_answer: string;
    user_answer: string;
    skill_type: string;
  }[];
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  QUIZ = 'QUIZ',

  PRACTICE_HUB = 'PRACTICE_HUB',
  VOCAB_HUB = 'VOCAB_HUB',
  MORE_HUB = 'MORE_HUB',
  ANALYTICS = 'ANALYTICS',
  ERROR_JAIL = 'ERROR_JAIL',
  BANK = 'BANK',
  TUTORING = 'TUTORING',
  PROFILE = 'PROFILE',
  SETTINGS = 'SETTINGS',
  PDF_UPLOAD = 'PDF_UPLOAD',
  AI_CHAT = 'AI_CHAT',
  SOCRATIC = 'SOCRATIC',
  DEVILS_ADVOCATE = 'DEVILS_ADVOCATE',
  SOCIAL_HUB = 'SOCIAL_HUB',
  PEER_REVIEW = 'PEER_REVIEW',
  ORACLE = 'ORACLE',
  SIMULATION = 'SIMULATION',
  CEFR_SIMULATION = 'CEFR_SIMULATION',
  WRITING_GYM = 'WRITING_GYM',
  WRITING = 'WRITING',
  SHADOWING = 'SHADOWING',
  PARAPHRASE_PRACTICE = 'PARAPHRASE_PRACTICE',

  LEXICAL_LAB = 'LEXICAL_LAB',
  LANGUAGE_DOJO = 'LANGUAGE_DOJO',
  FLASHCARDS = 'FLASHCARDS',
  LEADERBOARD = 'LEADERBOARD',
  FRIEND_LIST = 'FRIEND_LIST',
  LEARNING_PATH = 'LEARNING_PATH',
  REPORT = 'REPORT',

  // Writing Gym Views
  WRITING_GYM_HUB = 'WRITING_GYM_HUB',
  WRITING_GYM_LEVEL_1 = 'WRITING_GYM_LEVEL_1', // Mason
  WRITING_GYM_LEVEL_2 = 'WRITING_GYM_LEVEL_2', // Logic Weaver
  WRITING_GYM_LEVEL_3 = 'WRITING_GYM_LEVEL_3', // IELTS Paragraph Builder
  WRITING_GYM_TASK_1 = 'WRITING_GYM_TASK_1',   // Integrated
  WRITING_GYM_TASK_2 = 'WRITING_GYM_TASK_2',    // Academic Discussion
  MODEL_ESSAY_LIBRARY = 'MODEL_ESSAY_LIBRARY',
  ESSAY_DOJO_HUB = 'ESSAY_DOJO_HUB',
  BAND9_LIBRARY = 'BAND9_LIBRARY',
  BAND9_READER = 'BAND9_READER',
  COMPLEXITY_LADDER = 'COMPLEXITY_LADDER',
  MASON_LEADERBOARD = 'MASON_LEADERBOARD',
  MASON_SKILL_MAP = 'MASON_SKILL_MAP',

  NOTIFICATIONS = 'NOTIFICATIONS',
  BLOG = 'BLOG',
  BLOG_POST = 'BLOG_POST',
  BLOG_SKILL_PICKER = 'BLOG_SKILL_PICKER',
  SKILL_MODULE_LIST = 'SKILL_MODULE_LIST',
  SKILL_MODULE_READER = 'SKILL_MODULE_READER',
  TTS_BENCHMARK = 'TTS_BENCHMARK',
}

export enum SkillType {
  STRUCTURE = 'Structure',
  LISTENING = 'Listening',
  READING = 'Reading',
  SPEAKING = 'Speaking'
}

export interface Skill {
  id: string;
  numeric_id?: number;
  name: string;
  description: string;
  category: string;
  part?: string;
}

export interface UserProgress {
  completedSkills: number;
  totalSkills: number;
  streak: number;
  level: number;
  xp: number;
  currentStreak: number;
  totalQuizzes: number;
  totalCorrect: number;
  unlockedBadges: string[];
  show_oracle_score?: boolean; // Preference from profiles table
  bio?: string; // User bio
}


export interface OnboardingProfile {
  name: string;
  targetScore: number;
}
export type OnboardingStatus = 'new' | 'completed';

/**
 * Full Simulation Configuration
 * Defines question counts and time limits for TOEFL PBT Section 2 simulation
 */
export interface SimulationConfig {
  listening: number;           // 50 questions
  structure: number;           // 15 questions (sentence completion, #1-15)
  writtenExpression: number;   // 25 questions (error identification, #16-40)
  reading: number;             // 50 questions
  timers: {
    listening: number;        // 40 minutes (2400 seconds)
    structureWritten: number; // 25 minutes (1500 seconds) - shared timer
    reading: number;          // 55 minutes (3300 seconds)
  };
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  listening: 50,
  structure: 15,
  writtenExpression: 25,
  reading: 50,
  timers: {
    listening: 2400,          // 40 min
    structureWritten: 1500,   // 25 min
    reading: 3300             // 55 min
  }
};

/**
 * Minimum question counts per section (30 total minimum)
 */
export const MIN_SIMULATION_CONFIG = {
  listening: 10,
  structure: 5,
  writtenExpression: 5,
  reading: 10
};

/**
 * Custom Simulation Config for user-adjustable question counts
 */
export interface CustomSimulationConfig {
  listening: number;           // 10-50
  structure: number;           // 5-15
  writtenExpression: number;   // 5-25
  reading: number;             // 10-50
}

/**
 * Section generation status for tracking hybrid source progress
 */
export interface SectionGenerationStatus {
  section: 'listening' | 'structure' | 'written' | 'reading';
  fromBank: number;
  toGenerate: number;
  generated: number;
  status: 'pending' | 'fetching' | 'generating' | 'complete' | 'error';
  error?: string;
}

// ===== FULL SIMULATION (IBT-STYLE) TYPES =====

/**
 * Phase state machine for Full Simulation flow
 */
export type FullSimulationPhase =
  | 'config'           // Section config + question count sliders
  | 'instructions'     // Pre-test instructions screen
  | 'loading'          // Generating first section
  | 'section_active'   // User is answering questions in current section
  | 'section_review'   // Brief review of section results
  | 'section_break'    // 2-minute rest + background generation
  | 'results';         // Final results with per-section breakdown

/**
 * Adaptive difficulty levels based on previous section performance
 */
export type AdaptiveDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Definition for each simulation section (IBT order)
 */
export interface SimulationSectionDef {
  key: 'reading' | 'listening' | 'structure' | 'writtenExpression';
  dbSection: 'reading' | 'listening' | 'structure' | 'written';
  aiSection: SectionType;
  label: string;
  subtitle: string;
  timerSeconds: number;       // Per-section timer
  questionCount: number;      // Configured count
  icon: string;               // Lucide icon name
  color: string;
  bgColor: string;
}

/**
 * Result for a completed section
 */
export interface SimulationSectionResult {
  section: string;
  correct: number;
  total: number;
  accuracy: number;
  timeUsedSeconds: number;
  difficulty: AdaptiveDifficulty;
}

/**
 * IBT-style section order with timers
 * Reading → Listening → Structure + Written Expression
 */
export const SIMULATION_SECTIONS_ORDER: Array<{
  key: SimulationSectionDef['key'];
  dbSection: SimulationSectionDef['dbSection'];
  aiSection: SectionType;
  label: string;
  subtitle: string;
  defaultTimer: number;   // seconds
  icon: string;
  color: string;
  bgColor: string;
}> = [
    {
      key: 'reading', dbSection: 'reading', aiSection: 'READING',
      label: 'Reading', subtitle: 'Comprehension & Vocabulary',
      defaultTimer: 3300, icon: 'BookOpen',
      color: 'text-emerald-600', bgColor: 'bg-emerald-50'
    },
    {
      key: 'listening', dbSection: 'listening', aiSection: 'LISTENING',
      label: 'Listening', subtitle: 'Comprehension & Inference',
      defaultTimer: 2400, icon: 'Headphones',
      color: 'text-pink-600', bgColor: 'bg-pink-50'
    },
    {
      key: 'structure', dbSection: 'structure', aiSection: 'STRUCTURE',
      label: 'Structure', subtitle: 'Grammar & Sentence Completion',
      defaultTimer: 900, icon: 'Wrench',
      color: 'text-orange-600', bgColor: 'bg-orange-50'
    },
    {
      key: 'writtenExpression', dbSection: 'written', aiSection: 'STRUCTURE',
      label: 'Written Expression', subtitle: 'Error Identification',
      defaultTimer: 600, icon: 'FileEdit',
      color: 'text-amber-600', bgColor: 'bg-amber-50'
    },
  ];

/**
 * Calculate adaptive difficulty based on accuracy
 */
export const getAdaptiveDifficulty = (accuracy: number): AdaptiveDifficulty => {
  if (accuracy >= 0.75) return 'hard';
  if (accuracy >= 0.45) return 'medium';
  return 'easy';
};

/**
 * Get difficulty score range for question bank filtering
 */
export const getDifficultyRange = (difficulty: AdaptiveDifficulty): [number, number] => {
  switch (difficulty) {
    case 'easy': return [1, 35];
    case 'medium': return [36, 65];
    case 'hard': return [66, 100];
  }
};

// --- WRITING GYM TYPES ---

export type WritingGymLevel = 'mason' | 'logic_weaver' | 'complexity_ladder' | 'ielts_paragraph';

export interface WritingGymProgress {
  id: string;
  user_id: string;
  level: WritingGymLevel;
  skill_id: string;
  exercises_completed: number;
  exercises_total: number;
  stars_earned: number; // 0-3
  best_score: number;
  best_time_ms?: number;
  unlocked_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  history?: LadderHistoryItem[];
}

export interface IELTSStepOption {
  id: string;
  text: string;
  band_level: number;
  feedback: string;
}

export interface IELTSStep {
  step_type: string;
  options: IELTSStepOption[];
}

export interface IELTSParagraphData {
  task_prompt: string;
  steps: IELTSStep[];
}

export interface MasonItem {
  id: string;
  content: string;
  type: 'word' | 'punctuation';
  role?: 'subject' | 'verb' | 'object' | 'modifier'; // For syntax highlighting
  isLocked?: boolean;
}

export interface WritingExercise {
  id: string;
  level: WritingGymLevel;
  skill_id: string;
  type: 'drag_drop' | 'puzzle_fit' | 'error_tap' | 'paraphrase' | 'opinion_boost' | 'ielts_paragraph';

  // Content
  fragments?: string[]; // Mason: ["The student", "claims that", ...]
  target_sentence?: string;

  clauses?: { // Logic Weaver
    main: string;
    subordinate: string;
  };
  connectors?: string[]; // Logic Weaver options


  explanation: string;
  grammar_point?: string;
  hints?: string[];
  translation?: string; // Indonesian translation for hints

  // Universal Validation
  correct_answer?: string;
  options?: string[]; // Multiple choice options (for Logic Weaver etc)
  ielts_data?: IELTSParagraphData;
}

export interface EssaySubmission {
  id: string;
  user_id: string;
  task_type: 'integrated' | 'academic_discussion';
  prompt: string;
  reading_passage?: string; // Integrated
  user_essay: string;
  word_count: number;
  ai_score?: number;
  ai_feedback?: {
    overall_score: number;
    linguistic_range: number;
    coherence: number;
    task_response: number;
    suggestions: string[];
    improvements: {
      original: string;
      improved: string;
      skill_ref?: string;
    }[];
    // Rich analysis from essay evaluation
    grammatical_range?: number;
    lexical_heatmap?: Array<{ word: string; level: string; comment?: string }>;
    coherence_flow?: Array<{ paragraph: number; transition_strength: string; suggestion?: string }>;
    grammar_errors?: Array<{ type: string; original: string; correction: string; explanation: string }>;
    grammar_summary?: string;
  };
  created_at: string;
}

export interface MasonAnalytics {
  exerciseId: string;
  userId: string;
  totalTime: number; // in milliseconds
  attempts: number;
  wrongMoves: {
    index: number;
    expectedWord: string;
    placedWord: string;
  }[];
  skillId: string;
}

export interface MasonSession {
  userId: string;
  skillId: string;
  exerciseData: WritingExercise;
  score: number;
  totalTime: number; // in milliseconds
  attempts: number;
  completedAt?: string;
  wrongMoves: {
    index: number;
    expectedWord: string;
    placedWord: string;
  }[];
  starsEarned: 0 | 1 | 2 | 3;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl?: string;
  score: number;
  timeMs: number;
  stars: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface IELTSAssessment {
  band_score: number;
  breakdown: {
    task_response: number;
    coherence_cohesion: number;
    lexical_resource: number;
    grammatical_range: number;
  };
  feedback: string;
  vocabulary_srs: {
    word: string;
    definition: string;
    example: string;
    type: 'strength' | 'weakness'; // or 'tip'
  }[];
  lexical_heatmap: {
    t: string; // token
    l?: string; // level (B1, B2, C1, C2)
    r?: boolean; // repetitive?
  }[];
  coherence_flow: {
    type: string; // 'thesis', 'argument', 'supporting', 'conclusion'
    quality: 'strong' | 'weak';
    snippet: string;
  }[];
  indoglish_analysis: {
    fragment: string;
    correction: string;
    explanation: string;
  }[];
  confidence: number;
  confidence_factors?: {
    factor: string;
    impact: string;
    score: number;
  }[];
  grammar_errors?: {
    category: string;
    subcategory: string;
    rule: string;
    position: number; // Token index roughly
    severity: 'low' | 'medium' | 'high';
    fragment: string;
    correction: string;
    explanation: string;
  }[];
  grammar_summary?: {
    total_errors: number;
    by_category: Record<string, number>;
    by_severity: Record<string, number>;
    most_frequent_error: string;
  };
}

export interface ModelEssay {
  id: string;
  topic: string;
  task_type: 'Task 1' | 'Task 2';
  content: string;
  word_count: number;
  band_score: number;
  breakdown: {
    task_response: number;
    coherence_cohesion: number;
    lexical_resource: number;
    grammatical_range: number;
  };
  annotations: Annotation[];
  source: 'ai_generated' | 'curated' | 'community';
  category?: string;
  created_at?: string;
  views_count?: number;
  saves_count?: number;
}

export interface Annotation {
  id: string;
  quote: string;
  start_index: number;
  end_index: number;
  type: 'grammar' | 'vocabulary' | 'coherence' | 'task_response' | 'technique';
  comment: string;
  skill_ref?: string;
  vocabulary?: VocabularyItem;
}

// ===== PEER REVIEW TYPES =====

export interface PeerReviewSubmission {
  id: string;
  user_id: string;
  essay_content: string;
  prompt?: string;
  task_type: 'Task 1' | 'Task 2';
  word_count: number;
  is_anonymous: boolean;
  status: 'pending' | 'in_review' | 'completed' | 'expired';
  claimed_by?: string;
  claimed_at?: string;
  created_at: string;
  expires_at: string;
}

export interface InlineCorrection {
  start: number;
  end: number;
  original: string;
  correction: string;
  comment: string;
}

export interface PeerReview {
  id: string;
  submission_id: string;
  reviewer_id: string;
  task_response_score: number;
  coherence_score: number;
  lexical_score: number;
  grammar_score: number;
  overall_band: number;
  strengths: string;
  weaknesses: string;
  suggestions?: string;
  inline_corrections: InlineCorrection[];
  time_spent_seconds: number;
  created_at: string;
  helpfulness_rating?: number;
  author_comment?: string;
}

export interface ReviewerStats {
  user_id: string;
  total_reviews: number;
  avg_helpfulness: number;
  xp_earned: number;
  tier: 'Novice' | 'Helper' | 'Mentor' | 'Expert' | 'Master';
  updated_at: string;
}

export interface EssayFilters {
  category?: string;
  band_score_min?: number;
  task_type?: 'Task 1' | 'Task 2' | 'all';
  source?: 'ai_generated' | 'curated';
  search?: string;
}

export interface EssayInteraction {
  id: string;
  user_id: string;
  essay_id: string;
  viewed_at: string;
  time_spent_ms: number;
  annotations_clicked: string[];
  completed: boolean;
}

export interface VocabularyItem {
  id?: string;
  word: string;
  definition: string;
  cefr_level: string;
  example_sentence: string;
  source_essay_id?: string;
  collected_at?: string;
  review_count?: number;
  next_review_at?: string;
}

export interface ComplexityLadderLevel {
  name: string;
  instruction: string;
  example: string;
}

export interface LadderHistoryItem {
  levelName: string;
  instruction: string;
  userSentence: string;
  timestamp: string;
}

// --- DEVIL'S ADVOCATE TYPES ---

export interface AdvocateChallenge {
  detected_claim: string;
  counter_point: string;
  logical_fallacy_check: string;
  suggested_starters: string[];
}

export interface AdvocateDefenseResult {
  is_successful: boolean;
  score: number; // 0-100
  feedback: string;
  improved_version: string;
}

export interface DevilsAdvocateSession {
  id: string;
  user_id: string;
  user_argument: string;
  detected_claim: string;
  counter_point: string;
  logical_fallacy_check: string;
  suggested_starters: string[];
  user_defense?: string;
  is_successful?: boolean;
  score?: number;
  feedback?: string;
  improved_version?: string;
  created_at: string;
  completed_at?: string;
  time_spent_seconds?: number;
}

// ===== INTEGRATED WRITING TYPES =====

export type IntegratedWritingCategory = 'science' | 'social' | 'environment' | 'education' | 'business';

export interface IntegratedWritingTask {
  id: string;
  topic: string;
  category: IntegratedWritingCategory;
  reading_passage: {
    title: string;
    content: string;
    word_count: number;
    key_points: string[];
  };
  lecture: {
    transcript: string;
    key_counterpoints: string[];
    audioId?: string; // TTS audio ID
  };
  sample_response?: string;
  difficulty: number;
  created_at: string;
}

export interface IntegratedWritingEvaluation {
  overall_score: number; // 0-5
  task_development: number;
  organization: number;
  language_use: number;
  strengths: string[];
  improvements: {
    original: string;
    improved: string;
    explanation: string;
  }[];
}

export interface IntegratedWritingSession {
  id: string;
  user_id: string;
  task_id?: string;
  reading_passage: string;
  lecture_summary: string;
  user_notes?: string;
  user_essay: string;
  word_count: number;
  phase_durations: {
    reading: number;
    listening: number;
    writing: number;
  };
  evaluation: IntegratedWritingEvaluation;
  created_at: string;
}

// ===== SCORE ORACLE TYPES =====

export interface ScorePrediction {
  id: string;
  user_id: string;
  toefl_pbt_score: number | null;
  toefl_ibt_score: number | null;
  toefl_itp_score: number | null;
  ielts_score: number | null;
  toefl_pbt_breakdown: { listening: number; structure_written: number; reading: number };
  toefl_ibt_breakdown: { reading: number; listening: number; speaking: number; writing: number };
  toefl_itp_breakdown: { listening: number; structure_written: number; reading: number };
  ielts_breakdown: { listening: number; reading: number; writing: number; speaking: number };
  confidence_level: 'low' | 'medium' | 'high';
  data_points: number;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PredictionHistoryItem {
  id: string;
  user_id: string;
  test_type: 'toefl_pbt' | 'toefl_ibt' | 'toefl_itp' | 'ielts';
  predicted_score: number;
  breakdown: Record<string, number>;
  confidence_level: string;
  data_points: number;
  created_at: string;
}

export interface OracleRecommendation {
  id: string;
  user_id: string;
  recommendation_type: 'weak_skill' | 'practice_more' | 'ready_for_test';
  section: string;
  message: string;
  priority: number;
  is_read: boolean;
  created_at: string;
}

// Today's Focus Result - for auto-recommended skill based on weakest accuracy
export interface TodaysFocusResult {
  skill: Skill;
  accuracy: number;
  quizCount: number;
  section: SectionType;
  message: string;
}

export interface AggregatedOracleData {
  quizzes: {
    listening: { correct: number; total: number };
    reading: { correct: number; total: number };
    structure: { correct: number; total: number };
    written: { correct: number; total: number };
  };
  writingGym: {
    mason_avg_stars: number;
    logic_weaver_avg_stars: number;
    total_exercises: number;
  };
  essays: {
    integrated_avg_score: number;
    ielts_avg_band: number;
    total_submissions: number;
  };
  totalActivities: number;
  lastActivityDate: string | null;
  totalQuizzes: number;
  totalCorrect: number;
  quizDates: string[];
  gymDates: string[];
  essayDates: string[];
  skillsBreakdown?: {
    listening: number;
    reading: number;
    structure: number;
    written: number;
  };
  lastQuizScore?: number;
  trend?: number[];
}

// ===== SOCIAL CIRCLES TYPES =====

export interface Circle {
  id: string;
  name: string;
  code: string;
  description?: string;
  avatar_url?: string;
  created_by: string;
  created_at: string;
  _count?: {
    members: number;
  };
  chat_mode?: 'everyone' | 'admin_only';
  // Aggregated data for UI
  member_count?: number;
  weekly_xp?: number;
  current_user_role?: 'admin' | 'member' | 'owner';
}

export interface CircleMember {
  circle_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'owner';
  joined_at: string;
  profile?: {
    full_name: string;
    avatar_url: string;
    xp?: number;
    level?: number;
  } | null;
}

// ===== NOTIFICATION TYPES =====

export type NotificationType =
  | 'friend_request'
  | 'friend_accept'
  | 'circle_invite'
  | 'level_up'
  | 'leaderboard_overtake'
  | 'streak_warning'
  | 'level_up'
  | 'system_announcement'
  | 'reward_claim'
  | 'peer_review'
  | 'ai_quota_warning';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}
