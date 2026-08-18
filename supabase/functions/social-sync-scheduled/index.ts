import { withSupabase } from 'npm:@supabase/server@1.4.1';
import {
  createSyncError,
  listScheduledSocialConnections,
  syncSocialConnectionAccountMetrics,
  toSyncError,
} from '../_shared/social/sync/account-metrics.ts';

interface ScheduledSyncPayload {
  profileId?: unknown;
  connectionId?: unknown;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export default {
  fetch: withSupabase({ auth: 'secret:automations' }, async (request, ctx) => {
    try {
      if (request.method !== 'POST') {
        throw createSyncError('method_not_allowed', 'Method not allowed.', 405);
      }

      const payload = (await request.json().catch(() => ({}))) as ScheduledSyncPayload;
      if (payload.profileId || payload.connectionId) {
        throw createSyncError(
          'scheduled_sync_scope_override_not_allowed',
          'This function does not accept profileId or connectionId overrides.',
          400
        );
      }

      const eligibleConnections = await listScheduledSocialConnections(ctx.supabaseAdmin);
      const startedAt = new Date().toISOString();
      const results: Array<Record<string, unknown>> = [];

      for (const connection of eligibleConnections) {
        try {
          const result = await syncSocialConnectionAccountMetrics({
            adminClient: ctx.supabaseAdmin,
            connection,
            syncType: 'scheduled_account_metrics',
            loggerLabel: '[social-sync-scheduled]',
          });

          results.push({
            connectionId: connection.id,
            profileId: connection.profile_id,
            provider: connection.provider,
            platform: connection.platform,
            status: result.status,
            recordsReceived: result.recordsReceived,
            recordsProcessed: result.recordsProcessed,
            periodStart: result.periodStart,
            periodEnd: result.periodEnd,
          });
        } catch (error) {
          const syncError = toSyncError(error);

          results.push({
            connectionId: connection.id,
            profileId: connection.profile_id,
            provider: connection.provider,
            platform: connection.platform,
            status: 'failed',
            code: syncError.code,
          });
        }
      }

      const successfulConnections = results.filter((result) => result.status === 'success').length;
      const partialConnections = results.filter((result) => result.status === 'partial').length;
      const failedConnections = results.filter((result) => result.status === 'failed').length;

      return jsonResponse({
        status: failedConnections > 0 ? 'partial' : 'success',
        startedAt,
        finishedAt: new Date().toISOString(),
        frequencyPlan: '0 */6 * * *',
        totalConnections: eligibleConnections.length,
        successful: successfulConnections,
        partial: partialConnections,
        failed: failedConnections,
        eligibleConnections: eligibleConnections.length,
        processedConnections: results.length,
        successfulConnections,
        partialConnections,
        failedConnections,
        results,
      });
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
  }),
};
