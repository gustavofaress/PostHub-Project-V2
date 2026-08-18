import { corsHeaders } from '../_shared/cors.ts';
import { assertProfileAccess, requireAuthenticatedUser } from '../_shared/social/security.ts';
import {
  createSyncError,
  loadSocialConnectionById,
  syncSocialConnectionAccountMetrics,
  toSyncError,
} from '../_shared/social/sync/account-metrics.ts';

interface SyncConnectionPayload {
  profileId?: string;
  connectionId?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (request.method !== 'POST') {
      throw createSyncError('method_not_allowed', 'Method not allowed.', 405);
    }

    const payload = (await request.json().catch(() => ({}))) as SyncConnectionPayload;
    const profileId = payload.profileId?.trim();
    const connectionId = payload.connectionId?.trim();

    if (!profileId) {
      throw createSyncError('profile_id_required', 'profileId is required.');
    }

    if (!connectionId) {
      throw createSyncError('connection_id_required', 'connectionId is required.');
    }

    const authContext = await requireAuthenticatedUser(request);

    await assertProfileAccess(authContext.userClient, { profileId });

    const connection = await loadSocialConnectionById(authContext.adminClient, {
      profileId,
      connectionId,
    });

    const result = await syncSocialConnectionAccountMetrics({
      adminClient: authContext.adminClient,
      connection,
      syncType: 'manual_account_metrics',
      loggerLabel: '[social-sync-connection]',
    });

    return jsonResponse(result);
  } catch (error) {
    const syncError = toSyncError(error);

    return jsonResponse(
      {
        error: syncError.publicMessage,
        code: syncError.code,
      },
      syncError.status
    );
  }
});
