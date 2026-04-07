import { corsHeaders } from '../_shared/cors.ts';
import {
  META_SYNC_SECRET,
  assertProfileAccess,
  corsJsonHeaders,
  createAdminClient,
  requireAuthenticatedUser,
  syncInstagramConnection,
} from '../_shared/meta.ts';

interface FetchInstagramMetricsPayload {
  profileId?: string;
  connectionId?: string;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (request.method !== 'POST') {
      throw new Error('Method not allowed.');
    }

    const payload = (await request.json().catch(() => ({}))) as FetchInstagramMetricsPayload;
    const syncSecret = request.headers.get('x-meta-sync-secret');
    const isCronRun = Boolean(syncSecret && META_SYNC_SECRET && syncSecret === META_SYNC_SECRET);

    let adminClient = createAdminClient();
    let profileId = payload.profileId?.trim();
    let connectionId = payload.connectionId?.trim();
    let userId: string | null = null;

    if (!isCronRun) {
      const authContext = await requireAuthenticatedUser(request);
      adminClient = authContext.adminClient;
      userId = authContext.user.id;

      if (!profileId) {
        throw new Error('profileId is required.');
      }

      await assertProfileAccess(adminClient, {
        userId,
        profileId,
      });
    }

    let query = adminClient
      .from('contas_instagram')
      .select(
        'id, user_id, profile_id, page_id, instagram_user_id, username, profile_picture_url, access_token, token_expires_at'
      );

    if (connectionId) {
      query = query.eq('id', connectionId);
    }

    if (profileId) {
      query = query.eq('profile_id', profileId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: connections, error } = await query;

    if (error) {
      throw error;
    }

    if (!connections || connections.length === 0) {
      throw new Error('Nenhuma conta do Instagram conectada foi encontrada para sincronização.');
    }

    const results = [];

    for (const connection of connections) {
      try {
        const result = await syncInstagramConnection(adminClient, connection);
        results.push({
          connectionId: connection.id,
          instagramUserId: connection.instagram_user_id,
          status: 'success',
          ...result,
        });
      } catch (syncError) {
        console.error('[fetch-instagram-metrics] sync error:', syncError);

        await adminClient
          .from('contas_instagram')
          .update({
            last_sync_status: 'error',
            last_sync_error:
              syncError instanceof Error ? syncError.message : 'Falha ao sincronizar métricas.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);

        results.push({
          connectionId: connection.id,
          instagramUserId: connection.instagram_user_id,
          status: 'error',
          error: syncError instanceof Error ? syncError.message : 'Falha ao sincronizar métricas.',
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: {
        ...corsHeaders,
        ...corsJsonHeaders,
      },
    });
  } catch (error) {
    console.error('[fetch-instagram-metrics] error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          ...corsJsonHeaders,
        },
      }
    );
  }
});
