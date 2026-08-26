import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertProfileCommercialFeature,
  resolveProfileCommercialFeatureAccessForUser,
} from '../../../supabase/functions/_shared/profile-entitlements.ts';
import { buildFreeEntitlements } from '../../../shared/profile-entitlements.ts';

function createAdminClientStub(input: {
  entitlements?: Record<string, ReturnType<typeof buildFreeEntitlements>>;
  profileOwners?: Record<string, string>;
  users?: Record<string, { current_plan: string | null; is_admin: boolean }>;
}) {
  return {
    from(table: string) {
      return {
        select() {
          const filters = new Map<string, string>();

          return {
            eq(column: string, value: string) {
              filters.set(column, value);
              return this;
            },
            async maybeSingle() {
              if (table === 'profile_entitlements') {
                const profileId = filters.get('profile_id');
                return {
                  data: profileId ? input.entitlements?.[profileId] ?? null : null,
                  error: null,
                };
              }

              if (table === 'client_profiles') {
                const profileId = filters.get('id');
                const ownerUserId = profileId ? input.profileOwners?.[profileId] ?? null : null;

                return {
                  data: ownerUserId ? { user_id: ownerUserId } : null,
                  error: null,
                };
              }

              if (table === 'usuarios') {
                const userId = filters.get('id');
                return {
                  data: userId ? input.users?.[userId] ?? null : null,
                  error: null,
                };
              }

              throw new Error(`Unexpected table lookup: ${table}`);
            },
          };
        },
      };
    },
  };
}

test('materialized entitlement wins for backend access checks when actor is not admin', async () => {
  const adminClient = createAdminClientStub({
    entitlements: {
      profile_free: buildFreeEntitlements({ profileId: 'profile_free' }),
    },
    users: {
      actor_pro: {
        current_plan: 'pro',
        is_admin: false,
      },
    },
  });

  const access = await resolveProfileCommercialFeatureAccessForUser(adminClient as never, {
    profileId: 'profile_free',
    feature: 'references',
    actorUserId: 'actor_pro',
  });

  assert.equal(access.enabled, false);
  assert.equal(access.source, 'profile_entitlements');
});

test('materialized FREE entitlement denies backend commercial access even for ADMIN', async () => {
  const adminClient = createAdminClientStub({
    entitlements: {
      profile_free: buildFreeEntitlements({ profileId: 'profile_free' }),
    },
    users: {
      actor_admin: {
        current_plan: 'free',
        is_admin: true,
      },
    },
  });

  const access = await resolveProfileCommercialFeatureAccessForUser(adminClient as never, {
    profileId: 'profile_free',
    feature: 'references',
    actorUserId: 'actor_admin',
  });

  assert.equal(access.enabled, false);
  assert.equal(access.source, 'profile_entitlements');
});

test('missing entitlement keeps the backend admin commercial bypass', async () => {
  const adminClient = createAdminClientStub({
    profileOwners: {
      profile_missing: 'actor_admin',
    },
    users: {
      actor_admin: {
        current_plan: 'free',
        is_admin: true,
      },
    },
  });

  const access = await resolveProfileCommercialFeatureAccessForUser(adminClient as never, {
    profileId: 'profile_missing',
    feature: 'references',
    actorUserId: 'actor_admin',
  });

  assert.equal(access.enabled, true);
  assert.equal(access.source, 'admin_bypass');
});

test('missing entitlement keeps the legacy always-open backend fallback for metrics', async () => {
  const adminClient = createAdminClientStub({
    profileOwners: {
      profile_missing: 'owner_free',
    },
    users: {
      owner_free: {
        current_plan: 'free',
        is_admin: false,
      },
    },
  });

  const access = await resolveProfileCommercialFeatureAccessForUser(adminClient as never, {
    profileId: 'profile_missing',
    feature: 'metrics',
    actorUserId: 'owner_free',
  });

  assert.equal(access.enabled, true);
  assert.equal(access.source, 'legacy_runtime');
});

test('scheduled backend fallback uses the profile owner when there is no actor user', async () => {
  const adminClient = createAdminClientStub({
    profileOwners: {
      profile_missing: 'owner_pro',
    },
    users: {
      owner_pro: {
        current_plan: 'pro',
        is_admin: false,
      },
    },
  });

  const access = await resolveProfileCommercialFeatureAccessForUser(adminClient as never, {
    profileId: 'profile_missing',
    feature: 'approval',
  });

  assert.equal(access.enabled, true);
  assert.equal(access.source, 'legacy_runtime');
  assert.equal(access.fallbackUserId, 'owner_pro');
});

test('scheduled backend checks keep materialized FREE entitlements ahead of owner admin bypass', async () => {
  const adminClient = createAdminClientStub({
    entitlements: {
      profile_free: buildFreeEntitlements({ profileId: 'profile_free' }),
    },
    profileOwners: {
      profile_free: 'owner_admin',
    },
    users: {
      owner_admin: {
        current_plan: 'pro',
        is_admin: true,
      },
    },
  });

  const access = await resolveProfileCommercialFeatureAccessForUser(adminClient as never, {
    profileId: 'profile_free',
    feature: 'socialAnalytics',
    preferEntitlementsOverAdmin: true,
  });

  assert.equal(access.enabled, false);
  assert.equal(access.source, 'profile_entitlements');
});

test('backend assertion throws an identifiable commercial error when the feature is disabled', async () => {
  const adminClient = createAdminClientStub({
    entitlements: {
      profile_free: buildFreeEntitlements({ profileId: 'profile_free' }),
    },
    users: {
      actor_free: {
        current_plan: 'free',
        is_admin: false,
      },
    },
  });

  await assert.rejects(
    () =>
      assertProfileCommercialFeature(adminClient as never, {
        profileId: 'profile_free',
        feature: 'socialAnalytics',
        actorUserId: 'actor_free',
      }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'PROFILE_FEATURE_NOT_ENABLED');
      assert.equal((error as { feature?: string }).feature, 'socialAnalytics');
      assert.equal((error as { status?: number }).status, 403);
      return true;
    }
  );
});
