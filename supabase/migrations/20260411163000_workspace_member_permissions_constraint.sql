alter table if exists public.workspace_members
  drop constraint if exists workspace_members_permissions_check;

alter table if exists public.workspace_members
  add constraint workspace_members_permissions_check
  check (
    permissions <@ array[
      'scripts',
      'ideas',
      'approval',
      'calendar',
      'kanban',
      'references',
      'scheduler',
      'reports',
      'performance'
    ]::text[]
  );
