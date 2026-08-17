# Social Analytics Architecture

## Tenant

- O tenant funcional do PostHub continua sendo `client_profiles.id`.
- Todas as tabelas de Social Analytics usam `profile_id`.
- `user_id` pode aparecer apenas para auditoria, nunca como ownership funcional.

## Provider vs Platform

- `provider`: quem fornece os dados. Nesta fase: `windsor`.
- `platform`: rede social real. Nesta fase: `instagram` disponível; `youtube`, `tiktok` e `linkedin` preparados.

## Tabelas desta fase

- `social_connections`
- `social_connection_attempts`
- `social_content`
- `social_content_metrics`
- `social_account_metrics`
- `social_sync_runs`

## Segurança

- Leitura por RLS usando `current_user_can_access_profile(profile_id)`.
- Escrita reservada ao backend com `service_role`.
- `social_connection_attempts` não é exposta diretamente ao frontend.
- Segredos temporários do provider ficam criptografados com `INTEGRATION_TOKEN_ENCRYPTION_KEY`.

## Edge Functions

- `social-create-connection`
- `social-check-connection`
- `social-disconnect`

## Secrets necessários

- `WINDSOR_API_KEY`
- `INTEGRATION_TOKEN_ENCRYPTION_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Fluxo desta fase

1. Usuário abre `Integrações`.
2. Seleciona `Instagram`.
3. O frontend chama `social-create-connection`.
4. O PostHub abre o link de autorização do Windsor em nova aba.
5. O usuário autoriza a conta.
6. O usuário volta ao PostHub e clica em `Verificar conexão`.
7. O backend consulta as contas vinculadas no Windsor e finaliza em `social_connections`.

## Limites desta fase

- Não migra o módulo `Performance`.
- Não remove a integração Meta antiga.
- Não cria cron.
- Não implementa sincronização real de métricas.
- Não cria vínculo com calendário.

## Próxima fase

- Sincronização manual de métricas via Windsor
- Normalização para `social_content_metrics` e `social_account_metrics`
- Integração do módulo `Performance`
