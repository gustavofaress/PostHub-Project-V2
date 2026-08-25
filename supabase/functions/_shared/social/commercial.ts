export async function runSocialCreateConnectionFlow<TResult>(input: {
  assertSocialAnalyticsAccess: () => Promise<void>;
  createAuthorizationLink: () => Promise<TResult>;
}) {
  await input.assertSocialAnalyticsAccess();
  return input.createAuthorizationLink();
}

export async function runSocialCheckConnectionFlow<TResult>(input: {
  assertSocialAnalyticsAccess: () => Promise<void>;
  listLinkedAccounts: () => Promise<TResult>;
}) {
  await input.assertSocialAnalyticsAccess();
  return input.listLinkedAccounts();
}

export async function runSocialSyncConnectionFlow<TResult>(input: {
  assertSocialAnalyticsAccess: () => Promise<void>;
  assertMetricsAccess: () => Promise<void>;
  syncConnection: () => Promise<TResult>;
}) {
  await input.assertSocialAnalyticsAccess();
  await input.assertMetricsAccess();
  return input.syncConnection();
}
