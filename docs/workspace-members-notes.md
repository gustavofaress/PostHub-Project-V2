# Workspace Members SQL

O arquivo [workspace-members.sql](/Users/gustavofares/Documents/GitHub/PostHub-Project-V2/docs/workspace-members.sql) cria a base do módulo de membros no Supabase.
O arquivo [workspace-collaboration-rls.sql](/Users/gustavofares/Documents/GitHub/PostHub-Project-V2/docs/workspace-collaboration-rls.sql) libera os módulos compartilhados por permissão.

## O que ele cobre

- tabela `public.workspace_members`
- permissões por workspace usando `client_profiles.id` como identificador
- status de convite e aceite
- funções auxiliares de autorização
- função `accept_workspace_invite(...)`
- políticas de RLS para owner, admin e membros ativos
- políticas de colaboração para `client_profiles`, `script_drafts`, `ideas`, `editorial_columns` e `editorial_calendar`

## O que ainda falta fora do SQL

1. Deploy da Edge Function `invite-workspace-member`.
2. Configurar as env vars `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `APP_URL` na function.
3. Garantir que o template de email do Supabase Auth aceite o redirecionamento para `/invite/:token`.
4. Reaplicar ou revisar as policies dos outros módulos que ainda não entraram no MVP de colaboração.

## Branch

Não consegui criar a branch porque este snapshot não contém a pasta `.git`, então o diretório atual não está conectado a um repositório Git daqui.
