import { AppView } from '../types';

export type ViewMaturity = 'canonical-server-backed' | 'offline-cache-only' | 'dev-only' | 'legacy-adapter' | 'deprecated-remove' | 'static-content' | 'test-only';

export interface ViewRegistryEntry {
  view: AppView;
  label: string;
  maturity: ViewMaturity;
  dataSource: 'rust-8082' | 'vwfd-8083' | 'local-cache' | 'static' | 'mixed';
  uxImpact: string;
}

const mixed = 'mixed' as const;
const local = 'local-cache' as const;
const rust = 'rust-8082' as const;
const vwfd = 'vwfd-8083' as const;
const stat = 'static' as const;

export const viewRegistry: ViewRegistryEntry[] = Object.values(AppView).map((view) => ({
  view,
  label: view.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
  maturity: (() => {
    if (view === AppView.TTS_BENCHMARK) return 'dev-only';
    if ([AppView.BLOG, AppView.BLOG_POST, AppView.SKILL_MODULE_LIST, AppView.SKILL_MODULE_READER].includes(view)) return 'static-content';
    if ([AppView.ORACLE, AppView.PUBLIC_PROFILE, AppView.PEER_REVIEW, AppView.SOCIAL_HUB].includes(view)) return 'legacy-adapter';
    if ([AppView.QUIZ, AppView.WRITING, AppView.WRITING_GYM, AppView.WRITING_GYM_HUB].includes(view)) return 'canonical-server-backed';
    return 'offline-cache-only';
  })() as ViewMaturity,
  dataSource: (() => {
    if (view === AppView.TTS_BENCHMARK) return local;
    if ([AppView.BLOG, AppView.BLOG_POST, AppView.SKILL_MODULE_LIST, AppView.SKILL_MODULE_READER].includes(view)) return stat;
    if ([AppView.ORACLE, AppView.PUBLIC_PROFILE, AppView.PEER_REVIEW, AppView.SOCIAL_HUB].includes(view)) return mixed;
    if ([AppView.QUIZ, AppView.WRITING, AppView.WRITING_GYM, AppView.WRITING_GYM_HUB].includes(view)) return rust;
    if ([AppView.LEADERBOARD, AppView.REPORT].includes(view)) return vwfd;
    return local;
  })(),
  uxImpact: 'Registry lock: user-facing fallback and source-of-truth status are visible before Play Store hardening.',
}));

export function getViewRegistryEntry(view: AppView): ViewRegistryEntry | undefined {
  return viewRegistry.find((entry) => entry.view === view);
}
