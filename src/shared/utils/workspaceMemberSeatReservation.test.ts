import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runExistingAuthSeatReservationFlow,
  runNewAuthMemberPersistenceFlow,
} from '../../../shared/workspace-member-seat-reservation.ts';

test('existing Auth member limit failure stops before any Auth mutation', async () => {
  const order: string[] = [];

  await assert.rejects(
    () =>
      runExistingAuthSeatReservationFlow({
        reserveSeat: async () => {
          order.push('reserve');
          throw new Error('MEMBER_LIMIT_REACHED');
        },
        updateAuthUser: async () => {
          order.push('auth');
        },
        finalizeMembership: async () => {
          order.push('finalize');
          return 'ok';
        },
        rollbackReservation: async () => {
          order.push('rollback');
        },
      }),
    /MEMBER_LIMIT_REACHED/
  );

  assert.deepEqual(order, ['reserve']);
});

test('existing Auth reservation succeeds before updating Auth and finalizing membership', async () => {
  const order: string[] = [];

  const result = await runExistingAuthSeatReservationFlow({
    reserveSeat: async () => {
      order.push('reserve');
      return { memberId: 'member-1' };
    },
    updateAuthUser: async () => {
      order.push('auth');
    },
    finalizeMembership: async () => {
      order.push('finalize');
      return 'member-finalized';
    },
    rollbackReservation: async () => {
      order.push('rollback');
    },
  });

  assert.equal(result, 'member-finalized');
  assert.deepEqual(order, ['reserve', 'auth', 'finalize']);
});

test('existing Auth rollback runs when Auth update fails after seat reservation', async () => {
  const order: string[] = [];

  await assert.rejects(
    () =>
      runExistingAuthSeatReservationFlow({
        reserveSeat: async () => {
          order.push('reserve');
          return { memberId: 'member-1' };
        },
        updateAuthUser: async () => {
          order.push('auth');
          throw new Error('AUTH_UPDATE_FAILED');
        },
        finalizeMembership: async () => {
          order.push('finalize');
          return 'ok';
        },
        rollbackReservation: async () => {
          order.push('rollback');
        },
      }),
    /AUTH_UPDATE_FAILED/
  );

  assert.deepEqual(order, ['reserve', 'auth', 'rollback']);
});

test('new Auth cleanup runs if membership persistence fails after Auth preparation', async () => {
  const order: string[] = [];

  await assert.rejects(
    () =>
      runNewAuthMemberPersistenceFlow({
        prepareAuthUser: async () => {
          order.push('prepare-auth');
          return { userId: 'auth-user-1', createdNewUser: true };
        },
        persistMembership: async () => {
          order.push('persist-member');
          throw new Error('MEMBER_LIMIT_REACHED');
        },
        cleanupPreparedAuth: async () => {
          order.push('cleanup-auth');
        },
      }),
    /MEMBER_LIMIT_REACHED/
  );

  assert.deepEqual(order, ['prepare-auth', 'persist-member', 'cleanup-auth']);
});
