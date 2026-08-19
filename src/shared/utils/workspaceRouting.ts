import type { WorkspaceModule } from '../constants/navigation';

const WORKSPACE_DEFAULT_MODULE: WorkspaceModule = 'dashboard';

const KNOWN_WORKSPACE_MODULES: WorkspaceModule[] = [
  'onboarding',
  'dashboard',
  'consultant',
  'scripts',
  'ideas',
  'approval',
  'calendar',
  'kanban',
  'clients',
  'scheduler',
  'performance',
  'reports',
  'references',
  'integrations',
  'settings',
  'account',
  'credits',
  'support',
  'admin',
];

const LEGACY_WORKSPACE_REDIRECTS: Partial<Record<WorkspaceModule | 'onboarding', WorkspaceModule>> = {
  onboarding: 'dashboard',
  scripts: 'ideas',
};

const KNOWN_WORKSPACE_MODULE_SET = new Set<WorkspaceModule>(KNOWN_WORKSPACE_MODULES);

export const normalizeWorkspaceModule = (
  module: string | WorkspaceModule | null | undefined
): WorkspaceModule => {
  const normalizedModule = String(module ?? '').trim();

  if (!normalizedModule) {
    return WORKSPACE_DEFAULT_MODULE;
  }

  const redirectedModule =
    LEGACY_WORKSPACE_REDIRECTS[normalizedModule as keyof typeof LEGACY_WORKSPACE_REDIRECTS];
  if (redirectedModule) {
    return redirectedModule;
  }

  if (KNOWN_WORKSPACE_MODULE_SET.has(normalizedModule as WorkspaceModule)) {
    return normalizedModule as WorkspaceModule;
  }

  return WORKSPACE_DEFAULT_MODULE;
};

export const resolveWorkspaceRoute = (pathname: string) => {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';

  if (normalizedPath === '/workspace') {
    return {
      activeModule: WORKSPACE_DEFAULT_MODULE,
      redirectTo: '/workspace/dashboard',
    };
  }

  const moduleSegment = normalizedPath.split('/')[2] ?? null;
  const activeModule = normalizeWorkspaceModule(moduleSegment);
  const redirectTo =
    moduleSegment === 'onboarding'
      ? '/workspace/dashboard'
      : moduleSegment === 'scripts'
      ? '/workspace/ideas'
      : null;

  return {
    activeModule,
    redirectTo,
  };
};
