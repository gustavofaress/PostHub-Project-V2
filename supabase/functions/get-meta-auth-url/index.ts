import { corsHeaders } from '../_shared/cors.ts';
import {
  META_APP_ID,
  META_SCOPES,
  assertProfileAccess,
  corsJsonHeaders,
  getMetaRedirectUri,
  requireAuthenticatedUser,
  signOAuthState,
} from '../_shared/meta.ts';

interface GetMetaAuthUrlPayload {
  profileId?: string;
  redirectTo?: string;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (request.method !== 'POST') {
      throw new Error('Method not allowed.');
    }

    if (!META_APP_ID) {
      throw new Error('META_APP_ID is missing.');
    }

    const payload = (await request.json()) as GetMetaAuthUrlPayload;
    const profileId = payload.profileId?.trim();

    if (!profileId) {
      throw new Error('profileId is required.');
    }

    const { user, adminClient } = await requireAuthenticatedUser(request);
    await assertProfileAccess(adminClient, { userId: user.id, profileId });

    const state = await signOAuthState({
      userId: user.id,
      profileId,
      redirectTo: payload.redirectTo,
    });

    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.set('client_id', META_APP_ID);
    authUrl.searchParams.set('redirect_uri', getMetaRedirectUri());
    authUrl.searchParams.set('scope', META_SCOPES);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);

    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      status: 200,
      headers: {
        ...corsHeaders,
        ...corsJsonHeaders,
      },
    });
  } catch (error) {
    console.error('[get-meta-auth-url] error:', error);
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
