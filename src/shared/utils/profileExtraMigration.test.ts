import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migrationSql = readFileSync(
  new URL(
    '../../../supabase/migrations/20260826181930_profile_extra_subscriptions_foundation.sql',
    import.meta.url
  ),
  'utf8'
);

test('profile extra migration creates isolated billing table without data backfill', () => {
  assert.match(migrationSql, /create table if not exists public\.profile_extra_subscriptions/i);
  assert.match(
    migrationSql,
    /purchased_by_user_id uuid not null references auth\.users\(id\) on delete restrict/i
  );
  assert.match(
    migrationSql,
    /source_profile_id uuid references public\.client_profiles\(id\) on delete set null/i
  );
  assert.match(
    migrationSql,
    /target_profile_id uuid references public\.client_profiles\(id\) on delete set null deferrable initially deferred/i
  );
  assert.match(migrationSql, /stripe_checkout_session_id text/i);
  assert.match(migrationSql, /checkout_expires_at timestamptz/i);
  assert.match(migrationSql, /stripe_subscription_id text/i);
  assert.match(migrationSql, /constraint profile_extra_subscriptions_subscription_unique\s+unique \(stripe_subscription_id\)/i);
  assert.match(migrationSql, /constraint profile_extra_subscriptions_checkout_session_unique\s+unique \(stripe_checkout_session_id\)/i);
  assert.match(migrationSql, /constraint profile_extra_subscriptions_target_profile_unique\s+unique \(target_profile_id\)/i);
  assert.doesNotMatch(migrationSql, /\bon delete cascade\b/i);
  assert.doesNotMatch(migrationSql, /\bupdate public\.usuarios\b/i);
  assert.doesNotMatch(migrationSql, /\binsert into public\.profile_extra_subscriptions\b/i);
  assert.doesNotMatch(migrationSql, /\bdelete from public\.profile_extra_subscriptions\b/i);
});

test('profile extra unlinked reservation index only blocks in-flight checkout states', () => {
  assert.match(
    migrationSql,
    /create unique index if not exists profile_extra_subscriptions_unlinked_checkout_reservation_unique_idx/i
  );
  assert.match(
    migrationSql,
    /where target_profile_id is null\s+and status in \('checkout_pending', 'incomplete', 'trialing'\)/i
  );
  assert.doesNotMatch(
    migrationSql.match(
      /profile_extra_subscriptions_unlinked_checkout_reservation_unique_idx[\s\S]*?;/i
    )?.[0] ?? '',
    /'active'|'past_due'|'paused'|'unpaid'|'canceled'|'incomplete_expired'/i
  );
});

test('profile extra schema permits multiple paid active unlinked slots after profile deletion', () => {
  assert.match(
    migrationSql,
    /target_profile_id uuid references public\.client_profiles\(id\) on delete set null deferrable initially deferred/i
  );
  assert.match(
    migrationSql,
    /constraint profile_extra_subscriptions_target_profile_unique\s+unique \(target_profile_id\)/i
  );

  const reservationIndex =
    migrationSql.match(
      /profile_extra_subscriptions_unlinked_checkout_reservation_unique_idx[\s\S]*?;/i
    )?.[0] ?? '';

  assert.match(reservationIndex, /target_profile_id is null/i);
  assert.doesNotMatch(reservationIndex, /'active'/i);
  assert.doesNotMatch(reservationIndex, /'past_due'/i);
  assert.doesNotMatch(reservationIndex, /'paused'/i);
});

test('profile extra table is service-role only and not exposed to anon/authenticated', () => {
  assert.match(migrationSql, /alter table public\.profile_extra_subscriptions enable row level security/i);
  assert.match(
    migrationSql,
    /create policy "Service role full access to profile extra subscriptions"/i
  );
  assert.match(migrationSql, /revoke all on public\.profile_extra_subscriptions from anon, authenticated/i);
  assert.match(migrationSql, /grant all privileges on public\.profile_extra_subscriptions to service_role/i);
  assert.doesNotMatch(migrationSql, /grant select on public\.profile_extra_subscriptions to authenticated/i);
});

test('profile creation trigger preserves legacy order before using new paid extra slot', () => {
  const functionBody =
    migrationSql.match(
      /create or replace function public\.check_profile_subscription_available\(\)[\s\S]*?end;\n\$\$;/i
    )?.[0] ?? '';

  assert.match(functionBody, /v_is_admin = true[\s\S]*return new/i);
  assert.match(functionBody, /profile_count = 0[\s\S]*return new/i);
  assert.match(functionBody, /from public\.profile_subscriptions[\s\S]*status = 'available'[\s\S]*new\.subscription_id := available_subscription_id/i);
  assert.match(functionBody, /from public\.profile_extra_subscriptions[\s\S]*status = 'active'[\s\S]*target_profile_id = new\.id/i);
  assert.match(functionBody, /new\.subscription_id := null/i);
  assert.match(functionBody, /order by created_at asc[\s\S]*for update skip locked/i);
  assert.ok(
    functionBody.indexOf('from public.profile_subscriptions') <
      functionBody.indexOf('from public.profile_extra_subscriptions')
  );
  assert.doesNotMatch(functionBody, /profile_purchase_credits/i);
});

test('profile creation trigger only consumes active extra slots and leaves grace states unconsumed', () => {
  const functionBody =
    migrationSql.match(
      /create or replace function public\.check_profile_subscription_available\(\)[\s\S]*?end;\n\$\$;/i
    )?.[0] ?? '';

  const extraSlotSelect =
    functionBody.match(
      /select id[\s\S]*?from public\.profile_extra_subscriptions[\s\S]*?for update skip locked;/i
    )?.[0] ?? '';

  assert.match(extraSlotSelect, /target_profile_id is null/i);
  assert.match(extraSlotSelect, /status = 'active'/i);
  assert.doesNotMatch(extraSlotSelect, /status in \([^)]*past_due/i);
  assert.doesNotMatch(extraSlotSelect, /status in \([^)]*paused/i);
});

test('default entitlement trigger materializes PRO only for active profile extra subscription', () => {
  const functionBody =
    migrationSql.match(
      /create or replace function private\.ensure_default_profile_entitlement\(\)[\s\S]*?end;\n\$\$;/i
    )?.[0] ?? '';

  assert.match(functionBody, /from public\.profile_extra_subscriptions/i);
  assert.match(functionBody, /pes\.target_profile_id = new\.id/i);
  assert.match(functionBody, /pes\.status = 'active'/i);
  assert.match(functionBody, /pes\.stripe_subscription_id is not null/i);
  assert.match(functionBody, /'pro'[\s\S]*'stripe'[\s\S]*stripe_extra_subscription_ref/i);
  assert.match(functionBody, /max_additional_members[\s\S]*null/i);
  assert.match(functionBody, /'free'[\s\S]*'default_free'[\s\S]*2/i);
});

test('active profile access helpers exclude inactive profiles without relying on commercial entitlement', () => {
  const ownsProfileBody =
    migrationSql.match(
      /create or replace function private\.current_user_owns_profile\(target_profile_id uuid\)[\s\S]*?revoke all on function private\.current_user_owns_profile/i
    )?.[0] ?? '';
  const accessProfileBody =
    migrationSql.match(
      /create or replace function private\.current_user_can_access_profile\(target_profile_id uuid\)[\s\S]*?revoke all on function private\.current_user_can_access_profile/i
    )?.[0] ?? '';

  assert.match(
    ownsProfileBody,
    /cp\.user_id = auth\.uid\(\)[\s\S]*coalesce\(cp\.is_active, true\)/i
  );
  assert.doesNotMatch(
    ownsProfileBody,
    /current_user_is_admin\(\)/i
  );
  assert.match(
    accessProfileBody,
    /private\.current_user_is_admin\(\)[\s\S]*private\.current_user_owns_profile\(target_profile_id\)[\s\S]*wm\.status = 'active'[\s\S]*coalesce\(cp\.is_active, true\)/i
  );
  assert.match(
    migrationSql,
    /create or replace function public\.current_user_can_access_profile\(target_profile_id uuid\)[\s\S]*private\.current_user_can_access_profile\(target_profile_id\)/i
  );
  assert.match(
    migrationSql,
    /create or replace function public\.current_user_can_access_workspace\(target_profile_id uuid\)[\s\S]*private\.current_user_can_access_profile\(target_profile_id\)/i
  );
  assert.match(
    migrationSql,
    /create or replace function private\.current_user_can_manage_profile_members\(target_profile_id uuid\)[\s\S]*private\.current_user_is_admin\(\)[\s\S]*private\.current_user_owns_profile\(target_profile_id\)[\s\S]*coalesce\(cp\.is_active, true\)/i
  );
  assert.match(
    migrationSql,
    /create or replace function public\.current_user_can_manage_workspace_members\(target_profile_id uuid\)[\s\S]*private\.current_user_can_manage_profile_members\(target_profile_id\)/i
  );
  assert.match(
    migrationSql,
    /create or replace function public\.current_user_has_workspace_permission\([\s\S]*private\.current_user_is_admin\(\)[\s\S]*private\.current_user_owns_profile\(target_profile_id\)[\s\S]*coalesce\(cp\.is_active, true\)/i
  );
});

test('direct profile policies keep authorship and add active profile tenancy where local history exposes names', () => {
  assert.match(
    migrationSql,
    /create policy "Users can create their own profiles"[\s\S]*auth\.uid\(\) = user_id[\s\S]*coalesce\(is_active, true\)/i
  );
  assert.match(
    migrationSql,
    /create policy "Users can view their own tasks"[\s\S]*auth\.uid\(\) = user_id[\s\S]*public\.current_user_can_access_profile\(profile_id\)/i
  );
  assert.match(
    migrationSql,
    /create policy "Users can update their own tasks"[\s\S]*auth\.uid\(\) = user_id[\s\S]*public\.current_user_can_access_profile\(profile_id\)[\s\S]*with check/i
  );
  assert.match(
    migrationSql,
    /create policy "Users can view columns of their profiles"[\s\S]*user_id = auth\.uid\(\)[\s\S]*coalesce\(is_active, true\)/i
  );
  assert.match(
    migrationSql,
    /create policy "Usuários podem ver suas próprias ideias"[\s\S]*auth\.uid\(\) = user_id[\s\S]*profile_id is not null[\s\S]*public\.current_user_can_access_profile\(profile_id\)/i
  );
  assert.match(
    migrationSql,
    /create policy "Usuários podem atualizar suas próprias ideias"[\s\S]*auth\.uid\(\) = user_id[\s\S]*profile_id is not null[\s\S]*public\.current_user_can_access_profile\(profile_id\)[\s\S]*with check[\s\S]*auth\.uid\(\) = user_id[\s\S]*public\.current_user_can_access_profile\(profile_id\)/i
  );
  assert.match(
    migrationSql,
    /create policy "Users can view their own script drafts"[\s\S]*auth\.uid\(\) = user_id[\s\S]*profile_id is not null[\s\S]*public\.current_user_can_access_profile\(profile_id\)/i
  );
  assert.match(
    migrationSql,
    /create policy "Users can update their own script drafts"[\s\S]*auth\.uid\(\) = user_id[\s\S]*profile_id is not null[\s\S]*public\.current_user_can_access_profile\(profile_id\)[\s\S]*with check[\s\S]*auth\.uid\(\) = user_id[\s\S]*public\.current_user_can_access_profile\(profile_id\)/i
  );
});

test('approval_posts token and owner policies require an active profile', () => {
  assert.match(
    migrationSql,
    /create policy "Users can view their own approval posts"[\s\S]*auth\.uid\(\) = user_id[\s\S]*profile_id is not null[\s\S]*public\.current_user_can_access_profile\(profile_id\)/i
  );
  assert.match(
    migrationSql,
    /create policy "Users can update their own approval posts"[\s\S]*auth\.uid\(\) = user_id[\s\S]*profile_id is not null[\s\S]*public\.current_user_can_access_profile\(profile_id\)[\s\S]*with check/i
  );
  assert.match(
    migrationSql,
    /create policy "Anyone can view approval post with valid token"[\s\S]*x-approval-token[\s\S]*join|create policy "Anyone can view approval post with valid token"[\s\S]*x-approval-token[\s\S]*client_profiles cp[\s\S]*coalesce\(cp\.is_active, true\)/i
  );
  assert.match(
    migrationSql,
    /create policy "Anyone can update approval post with valid token"[\s\S]*x-approval-token[\s\S]*client_profiles cp[\s\S]*coalesce\(cp\.is_active, true\)[\s\S]*with check[\s\S]*client_profiles cp[\s\S]*coalesce\(cp\.is_active, true\)/i
  );
  assert.match(
    migrationSql,
    /create policy "Anyone can create feedback with valid token"[\s\S]*join public\.client_profiles cp on cp\.id = ap\.profile_id[\s\S]*coalesce\(cp\.is_active, true\)/i
  );
  assert.match(
    migrationSql,
    /create or replace function public\.current_calendar_approval_link_id\(\)[\s\S]*join public\.client_profiles cp on cp\.id = cal\.profile_id[\s\S]*coalesce\(cp\.is_active, true\)/i
  );
});

test('workspace member self updates and legacy instagram policies cannot bypass inactive profiles', () => {
  assert.match(
    migrationSql,
    /create policy "workspace_members_update_managers_or_self_accept"[\s\S]*private\.current_user_can_manage_profile_members\(profile_id\)[\s\S]*user_id = auth\.uid\(\)[\s\S]*client_profiles cp[\s\S]*coalesce\(cp\.is_active, true\)/i
  );
  assert.match(
    migrationSql,
    /create policy "Users can read instagram connections for accessible profiles"[\s\S]*profile_id is not null[\s\S]*public\.current_user_can_access_profile\(profile_id\)/i
  );
  assert.match(
    migrationSql,
    /create policy "Users can read instagram metrics for accessible profiles"[\s\S]*profile_id is not null[\s\S]*public\.current_user_can_access_profile\(profile_id\)/i
  );
});

test('social and reference surfaces inherit inactive-profile suspension through central helpers', () => {
  const premiumMigrationSql = readFileSync(
    new URL(
      '../../../supabase/migrations/20260825151423_enforce_profile_premium_features.sql',
      import.meta.url
    ),
    'utf8'
  );

  assert.match(
    premiumMigrationSql,
    /reference_items[\s\S]*current_user_can_access_profile\(profile_id\)[\s\S]*current_user_has_profile_commercial_feature\(profile_id, 'references'/i
  );
  assert.match(
    premiumMigrationSql,
    /social_account_metrics[\s\S]*current_user_can_access_profile\(profile_id\)[\s\S]*current_user_has_profile_commercial_feature\(profile_id, 'metrics'/i
  );
  assert.match(
    premiumMigrationSql,
    /social_connections[\s\S]*current_user_can_access_profile\(profile_id\)[\s\S]*current_user_has_profile_commercial_feature\(profile_id, 'social_analytics'/i
  );
});
