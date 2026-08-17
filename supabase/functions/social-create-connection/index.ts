import { corsHeaders } from '../_shared/cors.ts';
import { createWindsorAuthorizationLink } from '../_shared/social/providers/windsor.ts';
import { getSocialPlatformConfig } from '../_shared/social/registry.ts';
import {
  assertProfileAccess,
  encryptSecret,
  requireAuthenticatedUser,
} from '../_shared/social/security.ts';

interface CreateSocialConnectionPayload {
  profileId?: string;
  platform?: string;
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
      throw new Error('Method not allowed.');
    }

    const payload = (await request.json().catch(() => ({}))) as CreateSocialConnectionPayload;
    const profileId = payload.profileId?.trim();
    const platform = payload.platform?.trim().toLowerCase();

    if (!profileId) {
      throw new Error('profileId is required.');
    }

    if (!platform) {
      throw new Error('platform is required.');
    }

    const platformConfig = getSocialPlatformConfig(platform);
    if (!platformConfig || !platformConfig.available) {
      throw new Error('A plataforma solicitada ainda não está disponível.');
    }

    const { user, userClient, adminClient } = await requireAuthenticatedUser(request);
    await assertProfileAccess(userClient, { profileId });

    const { authorizationUrl, accessToken } = await createWindsorAuthorizationLink(
      platformConfig.windsorDatasource
    );

    const now = Date.now();
    const expiresAt = new Date(now + 4 * 24 * 60 * 60 * 1000).toISOString();

    const { data: attempt, error } = await adminClient
      .from('social_connection_attempts')
      .insert({
        profile_id: profileId,
        provider: platformConfig.provider,
        platform: platformConfig.platform,
        requested_by: user.id,
        status: 'pending',
        provider_correlation_secret_encrypted: await encryptSecret(accessToken),
        expires_at: expiresAt,
      })
      .select('id, status, expires_at')
      .single();

    if (error) {
      throw error;
    }

    return jsonResponse({
      attemptId: attempt.id,
      status: attempt.status,
      expiresAt: attempt.expires_at,
      authorizationUrl,
    });
  } catch (error) {
    console.error('[social-create-connection] error:', error instanceof Error ? error.message : error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível iniciar a conexão com a rede social.',
      },
      400
    );
  }
});
