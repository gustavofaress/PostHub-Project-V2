import type { WorkspaceModule } from './navigation';
import type { TeamPermissionId } from './workspaceMembers';

export const WORKSPACE_MODULE_PERMISSION_MAP: Partial<
  Record<WorkspaceModule, TeamPermissionId>
> = {
  scripts: 'scripts',
  ideas: 'ideas',
  approval: 'approval',
  calendar: 'calendar',
  kanban: 'kanban',
  references: 'references',
  scheduler: 'scheduler',
  reports: 'reports',
  performance: 'performance',
};
