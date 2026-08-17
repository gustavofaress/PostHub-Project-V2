import { corsHeaders } from '../_shared/cors.ts';
import { unlinkWindsorLinkedAccount } from '../_shared/social/providers/windsor.ts';
import { getSocialPlatformConfig } from '../_shared/social/registry.ts';
import { assertProfileAccess, requireAuthenticatedUser } from '../_shared/social/security.ts';
import type { SocialConnectionRecord } from '../_shared/social/types.ts';

interface DisconnectSocialConnectionPayload {
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

async function loadConnection(
  adminClient: Awaited<ReturnType<typeof requireAuthenticatedUser>>['adminClient'],
  connectionId: string
) {
  const { data, error } = await adminClient
    .from('social_connections')
    .select(
      'id, profile_id, provider, platform, provider_datasource, external_account_id, external_account_name, external_account_handle, external_account_avatar_url, status, connected_by, provider_metadata, connected_at, disconnected_at, last_sync_at, last_successful_sync_at, last_sync_error, created_at, updated_at'
    )
    .eq('id', connectionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('A conexão solicitada não foi encontrada.');

  return data as SocialConnectionRecord;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (request.method !== 'POST') {
      throw new Error('Method not allowed.');
    }

    const payload = (await request.json().catch(() => ({}))) as DisconnectSocialConnectionPayload;
    const connectionId = payload.connectionId?.trim();

    if (!connectionId) {
      throw new Error('connectionId is required.');
    }

    const { user, userClient, adminClient } = await requireAuthenticatedUser(request);
    const connection = await loadConnection(adminClient, connectionId);
    await assertProfileAccess(userClient, { profileId: connection.profile_id });

    if (connection.status === 'disconnected') {
      return jsonResponse({
        status: 'disconnected',
        connectionId: connection.id,
      });
    }

    const platformConfig = getSocialPlatformConfig(connection.platform);
    if (!platformConfig || platformConfig.provider !== connection.provider) {
      throw new Error('A configuração desta conexão não está disponível.');
    }

    const datasourceId = connection.provider_datasource || platformConfig.windsorDatasource;

    try {
      await unlinkWindsorLinkedAccount({
        datasourceId,
        accountId: connection.external_account_id,
      });
    } catch (error) {
      const maybeStatus = (error as Error & { status?: number }).status;
      if (maybeStatus !== 404) {
        throw error;
      }
    }

    const now = new Date().toISOString();
    const providerMetadata = isRecord(connection.provider_metadata)
      ? {
          ...connection.provider_metadata,
          unlink_result: 'disconnected',
        }
      : {
          unlink_result: 'disconnected',
        };

    const { error: updateError } = await adminClient
      .from('social_connections')
      .update({
        status: 'disconnected',
        disconnected_at: now,
        provider_metadata: providerMetadata,
        updated_at: now,
      })
      .eq('id', connection.id);

    if (updateError) {
      throw updateError;
    }

    return jsonResponse({
      status: 'disconnected',
      connectionId: connection.id,
    });
  } catch (error) {
    console.error('[social-disconnect] error:', error instanceof Error ? error.message : error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível desconectar a rede social.',
      },
      400
    );
  }
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
