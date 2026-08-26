import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migrationSql = readFileSync(
  new URL('../../../supabase/migrations/20260825151423_enforce_profile_premium_features.sql', import.meta.url),
  'utf8'
);

test('premium enforcement migration preserves the public approval token policies', () => {
  assert.doesNotMatch(migrationSql, /Public can read active calendar approval links by token/);
  assert.doesNotMatch(migrationSql, /Public can read calendar post approvals by token/);
  assert.doesNotMatch(migrationSql, /Public can update calendar post approvals by token/);
  assert.doesNotMatch(migrationSql, /Public can read calendar approval feedback by token/);
  assert.doesNotMatch(migrationSql, /Public can create calendar approval feedback by token/);
});

test('premium enforcement migration adds commercial helper checks to the authenticated premium surfaces', () => {
  assert.match(
    migrationSql,
    /private\.current_user_has_profile_commercial_feature\(profile_id, 'references'\)/
  );
  assert.match(
    migrationSql,
    /private\.current_user_has_profile_commercial_feature\(profile_id, 'approval_link_creation'\)/
  );
  assert.match(
    migrationSql,
    /private\.current_user_has_profile_commercial_feature\(profile_id, 'metrics'\)/
  );
  assert.match(
    migrationSql,
    /private\.current_user_has_profile_commercial_feature\(profile_id, 'social_analytics'\)/
  );
});

test('reference_items policies require authorship, profile access, and commercial access together', () => {
  const referencePolicyClauses = migrationSql.match(
    /auth\.uid\(\) = user_id[\s\S]*?public\.current_user_can_access_profile\(profile_id\)[\s\S]*?private\.current_user_has_profile_commercial_feature\(profile_id, 'references'\)/g
  );

  assert.ok(referencePolicyClauses);
  assert.equal(referencePolicyClauses.length, 5);
});

test('commercial helper checks materialized entitlements before admin fallback', () => {
  const materializedIndex = migrationSql.indexOf("where pe.profile_id = target_profile_id;");
  const foundIndex = migrationSql.indexOf('if found then');
  const actorLookupIndex = migrationSql.indexOf("from public.usuarios u");
  const adminBypassIndex = migrationSql.indexOf('if actor_is_admin then');

  assert.notEqual(materializedIndex, -1);
  assert.notEqual(foundIndex, -1);
  assert.notEqual(actorLookupIndex, -1);
  assert.notEqual(adminBypassIndex, -1);
  assert.ok(materializedIndex < foundIndex);
  assert.ok(foundIndex < actorLookupIndex);
  assert.ok(actorLookupIndex < adminBypassIndex);
});
