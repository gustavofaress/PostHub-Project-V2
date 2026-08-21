export async function runExistingAuthSeatReservationFlow<TReservation, TResult>(input: {
  reserveSeat: () => Promise<TReservation>;
  updateAuthUser: () => Promise<void>;
  finalizeMembership: () => Promise<TResult>;
  rollbackReservation: (reservation: TReservation) => Promise<void>;
}): Promise<TResult> {
  const reservation = await input.reserveSeat();

  try {
    await input.updateAuthUser();
  } catch (error) {
    try {
      await input.rollbackReservation(reservation);
    } catch {
      // Preserve the original auth error; rollback is best-effort.
    }

    throw error;
  }

  return input.finalizeMembership();
}

export async function runNewAuthMemberPersistenceFlow<TPreparedAuth, TResult>(input: {
  prepareAuthUser: () => Promise<TPreparedAuth>;
  persistMembership: (preparedAuth: TPreparedAuth) => Promise<TResult>;
  cleanupPreparedAuth: (preparedAuth: TPreparedAuth) => Promise<void>;
}): Promise<TResult> {
  const preparedAuth = await input.prepareAuthUser();

  try {
    return await input.persistMembership(preparedAuth);
  } catch (error) {
    try {
      await input.cleanupPreparedAuth(preparedAuth);
    } catch {
      // Preserve the original membership error; cleanup is best-effort.
    }

    throw error;
  }
}
