import { AppView } from '../types';

export type ViewStatus = 'active' | 'hidden' | 'planned' | 'dev-only' | 'internal';
export type ViewMaturity = 'canonical-server-backed' | 'offline-cache-only' | 'dev-only' | 'legacy-adapter' | 'deprecated-remove' | 'static-content' | 'test-only' | 'planned';

export interface ViewRegistryEntry {
  view: AppView;
  label: string;
  status: ViewStatus;
  maturity: ViewMaturity;
  dataSource: 'rust-8082' | 'vwfd-8083' | 'local-cache' | 'static' | 'mixed';
  uxImpact: string;
}

const activeViews = new Set<AppView>([
  AppView.DASHBOARD,
  AppView.QUIZ,
  AppView.PRACTICE_HUB,
  AppView.MORE_HUB,
  AppView.ERROR_JAIL,
  AppView.BANK,
  AppView.PROFILE,
  AppView.PUBLIC_PROFILE,
  AppView.SETTINGS,
  AppView.PDF_UPLOAD,
  AppView.DEVILS_ADVOCATE,
  AppView.SOCIAL_HUB,
  AppView.PEER_REVIEW,
  AppView.ORACLE,
  AppView.SIMULATION,
  AppView.CEFR_SIMULATION,
  AppView.WRITING_GYM,
  AppView.WRITING_GYM_HUB,
  AppView.WRITING,
  AppView.LEADERBOARD,
  AppView.LEARNING_PATH,
  AppView.REPORT,
  AppView.AUTH_CALLBACK,
  AppView.WRITING_GYM_LEVEL_1,
  AppView.WRITING_GYM_LEVEL_2,
  AppView.WRITING_GYM_LEVEL_3,
  AppView.WRITING_GYM_TASK_1,
  AppView.WRITING_GYM_TASK_2,
  AppView.MODEL_ESSAY_LIBRARY,
  AppView.ESSAY_DOJO_HUB,
  AppView.BAND9_LIBRARY,
  AppView.COMPLEXITY_LADDER,
  AppView.MASON_LEADERBOARD,
  AppView.NOTIFICATIONS,
  AppView.BLOG,
  AppView.BLOG_POST,
  AppView.BLOG_SKILL_PICKER,
  AppView.SKILL_MODULE_LIST,
  AppView.SKILL_MODULE_READER,
]);

const plannedViews = new Set<AppView>([
  AppView.VOCAB_HUB,
  AppView.ANALYTICS,
  AppView.TUTORING,
  AppView.AI_CHAT,
  AppView.SOCRATIC,
  AppView.SHADOWING,
  AppView.PARAPHRASE_PRACTICE,
  AppView.LEXICAL_LAB,
  AppView.LANGUAGE_DOJO,
  AppView.FLASHCARDS,
  AppView.FRIEND_LIST,
  AppView.BAND9_READER,
  AppView.MASON_SKILL_MAP,
]);

export const VIEW_REGISTRY: Record<AppView, ViewRegistryEntry> = Object.values(AppView).reduce((acc, view) => {
  const isDev = view === AppView.TTS_BENCHMARK;
  const isPlanned = plannedViews.has(view);
  const status: ViewStatus = isDev ? 'dev-only' : isPlanned ? 'planned' : activeViews.has(view) ? 'active' : 'hidden';
  const maturity: ViewMaturity = isDev
    ? 'dev-only'
    : isPlanned
      ? 'planned'
      : [AppView.BLOG, AppView.BLOG_POST, AppView.BLOG_SKILL_PICKER, AppView.SKILL_MODULE_LIST, AppView.SKILL_MODULE_READER].includes(view)
        ? 'static-content'
        : [AppView.ORACLE, AppView.PUBLIC_PROFILE, AppView.PEER_REVIEW, AppView.SOCIAL_HUB].includes(view)
          ? 'legacy-adapter'
          : [AppView.QUIZ, AppView.WRITING, AppView.WRITING_GYM, AppView.WRITING_GYM_HUB].includes(view)
            ? 'canonical-server-backed'
            : 'offline-cache-only';
  const dataSource = isDev ? 'local-cache'
    : [AppView.BLOG, AppView.BLOG_POST, AppView.BLOG_SKILL_PICKER, AppView.SKILL_MODULE_LIST, AppView.SKILL_MODULE_READER].includes(view) ? 'static'
      : [AppView.LEADERBOARD, AppView.REPORT].includes(view) ? 'vwfd-8083'
        : [AppView.QUIZ, AppView.WRITING, AppView.WRITING_GYM, AppView.WRITING_GYM_HUB].includes(view) ? 'rust-8082'
          : 'mixed';
  acc[view] = {
    view,
    label: view.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
    status,
    maturity,
    dataSource: dataSource as ViewRegistryEntry['dataSource'],
    uxImpact: status === 'planned'
      ? 'Hidden from production navigation so learners do not land on unfinished tools.'
      : 'Available view with explicit release status for Play Store hardening.',
  };
  return acc;
}, {} as Record<AppView, ViewRegistryEntry>);

export const viewRegistry = Object.values(VIEW_REGISTRY);

export function getViewRegistryEntry(view: AppView): ViewRegistryEntry | undefined {
  return VIEW_REGISTRY[view];
}

export function getViewStatus(view: AppView): ViewStatus {
  return VIEW_REGISTRY[view]?.status ?? 'hidden';
}

export function isViewEnabledForRuntime(view: AppView, includeDev = import.meta.env.DEV): boolean {
  const status = getViewStatus(view);
  if (status === 'active') return true;
  if (status === 'dev-only') return includeDev;
  return false;
}
