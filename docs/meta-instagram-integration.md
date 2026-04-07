# Meta Instagram Integration

## Edge Functions

- `get-meta-auth-url`: valida o usuário autenticado, valida o `profile_id` e gera a URL de OAuth da Meta com `state` assinado.
- `meta-callback`: recebe `code`, troca por token, busca páginas e contas do Instagram Business, salva em `contas_instagram` com token criptografado e dispara a sincronização inicial.
- `fetch-instagram-metrics`: sincroniza métricas de uma conta específica, de um perfil inteiro ou de um cron autenticado por `META_SYNC_SECRET`.

## Banco

Execute a migration [20260406103000_meta_instagram_integration.sql](/Users/gustavofares/Documents/GitHub/PostHub-Project-V2/supabase/migrations/20260406103000_meta_instagram_integration.sql) para criar:

- `contas_instagram`
- `instagram_metrics`

Ela também aplica:

- RLS por `user_id` e `profile_id`
- privilégio de leitura sem a coluna `access_token` para o role `authenticated`
- índice e chave única para upsert de métricas

## Variáveis de ambiente

Preencha no projeto Supabase:

- `APP_URL`
- `META_APP_ID`
- `META_APP_SECRET`
- `META_API_VERSION`
- `META_REDIRECT_URI`
- `META_STATE_SECRET`
- `META_TOKEN_ENCRYPTION_KEY`
- `META_SYNC_SECRET` (opcional para cron)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Fluxo esperado

1. Usuário abre `/workspace/performance`.
2. Clica em `Conectar Instagram`.
3. O frontend chama `get-meta-auth-url`.
4. A Meta autentica o usuário e redireciona para `meta-callback`.
5. A callback salva as contas conectadas em `contas_instagram`.
6. A callback dispara a sincronização inicial em `instagram_metrics`.
7. O frontend recarrega conexões e métricas do `profile_id` ativo.

## Cron sugerido

Use um worker externo, GitHub Actions ou agendador interno para chamar:

`POST /functions/v1/fetch-instagram-metrics`

Com o header:

`x-meta-sync-secret: <META_SYNC_SECRET>`

E, se quiser limitar por perfil:

```json
{
  "profileId": "uuid-do-profile"
}
```
