import { corsHeaders } from '../_shared/cors.ts';
import {
  META_APP_ID,
  META_APP_SECRET,
  assertProfileAccess,
  createAdminClient,
  encryptSecret,
  exchangeCodeForAccessToken,
  exchangeForLongLivedToken,
  fetchInstagramAccountFromPage,
  fetchInstagramUserProfile,
  fetchUserPages,
  getFrontendPerformanceUrl,
  syncInstagramConnection,
  verifyOAuthState,
} from '../_shared/meta.ts';

function redirectToApp(params: Record<string, string | null | undefined>) {
  return Response.redirect(getFrontendPerformanceUrl(params), 302);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!META_APP_ID || !META_APP_SECRET) {
      throw new Error('Meta environment variables are missing.');
    }

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errorReason = url.searchParams.get('error_reason');
    const errorDescription = url.searchParams.get('error_description');

    if (errorReason) {
      return redirectToApp({
        meta_status: 'error',
        meta_message: errorDescription ?? errorReason,
      });
    }

    if (!code || !state) {
      throw new Error('Missing OAuth callback parameters.');
    }

    const statePayload = await verifyOAuthState(state);
    const adminClient = createAdminClient();
    await assertProfileAccess(adminClient, {
      userId: statePayload.userId,
      profileId: statePayload.profileId,
    });

    const shortLivedToken = await exchangeCodeForAccessToken(code);
    const longLivedToken = await exchangeForLongLivedToken(shortLivedToken.access_token);
    const accessToken = longLivedToken?.access_token ?? shortLivedToken.access_token;
    const expiresIn = longLivedToken?.expires_in ?? shortLivedToken.expires_in ?? null;
    const tokenExpiresAt =
      typeof expiresIn === 'number'
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null;

    const pages = await fetchUserPages(accessToken);
    const connections = [];

    for (const page of pages.data ?? []) {
      const pageToken = page.access_token ?? accessToken;
      const igAccount = await fetchInstagramAccountFromPage(page.id, pageToken);
      const instagramUserId = igAccount?.instagram_business_account?.id;

      if (!instagramUserId) {
        continue;
      }

      const profile = await fetchInstagramUserProfile(instagramUserId, pageToken);

      const { data, error } = await adminClient
        .from('contas_instagram')
        .upsert(
          {
            user_id: statePayload.userId,
            profile_id: statePayload.profileId,
            page_id: page.id,
            instagram_user_id: instagramUserId,
            username: profile?.username ?? null,
            profile_picture_url: profile?.profile_picture_url ?? null,
            access_token: await encryptSecret(pageToken),
            token_expires_at: tokenExpiresAt,
            last_sync_status: 'pending',
            last_sync_error: null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'profile_id,instagram_user_id',
          }
        )
        .select(
          'id, user_id, profile_id, page_id, instagram_user_id, username, profile_picture_url, access_token, token_expires_at'
        )
        .single();

      if (error) {
        throw error;
      }

      connections.push(data);
    }

    if (connections.length === 0) {
      return redirectToApp({
        meta_status: 'error',
        meta_message:
          'Nenhuma conta do Instagram Business vinculada a uma página do Facebook foi encontrada.',
      });
    }

    for (const connection of connections) {
      try {
        await syncInstagramConnection(adminClient, connection);
      } catch (error) {
        console.error('[meta-callback] initial sync failed:', error);

        await adminClient
          .from('contas_instagram')
          .update({
            last_sync_status: 'error',
            last_sync_error:
              error instanceof Error ? error.message : 'Falha ao sincronizar métricas iniciais.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id);
      }
    }

    return redirectToApp({
      meta_status: 'success',
      meta_message: `${connections.length} conta(s) do Instagram conectada(s) com sucesso.`,
      profile_id: statePayload.profileId,
    });
  } catch (error) {
    console.error('[meta-callback] error:', error);
    return redirectToApp({
      meta_status: 'error',
      meta_message: error instanceof Error ? error.message : 'Erro ao concluir a conexão com a Meta.',
    });
  }
});
