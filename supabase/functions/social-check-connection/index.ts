import { corsHeaders } from '../_shared/cors.ts';
import { assertProfileCommercialFeature } from '../_shared/profile-entitlements.ts';
import { runSocialCheckConnectionFlow } from '../_shared/social/commercial.ts';
import {
  listWindsorLinkedAccounts,
  sanitizeLinkedAccount,
} from '../_shared/social/providers/windsor.ts';
import { getSocialPlatformConfig } from '../_shared/social/registry.ts';
import {
  assertProfileAccess,
  decryptSecret,
  requireAuthenticatedUser,
} from '../_shared/social/security.ts';
import type {
  SocialConnectionAttemptRecord,
  SocialConnectionRecord,
} from '../_shared/social/types.ts';

interface CheckSocialConnectionPayload {
  attemptId?: string;
  externalAccountId?: string;
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

function joinDiagnosticValues(values: string[]) {
  return values.length > 0 ? values.join(',') : 'none';
}

function buildParserMismatchMessage(params: {
  itemCount: number;
  isArray: boolean;
  itemKeys: string[];
  hasAccountId: boolean;
  hasAccessToken: boolean;
  statuses: string[];
}) {
  return [
    `itemCount=${params.itemCount}`,
    `isArray=${params.isArray}`,
    `keys=${joinDiagnosticValues(params.itemKeys)}`,
    `hasAccountId=${params.hasAccountId}`,
    `hasAccessToken=${params.hasAccessToken}`,
    `statuses=${joinDiagnosticValues(params.statuses)}`,
  ].join('; ');
}

function buildDatasourceMismatchMessage(params: {
  expectedDatasource: string;
  returnedDatasources: string[];
  itemCount: number;
}) {
  return [
    `expectedDatasource=${params.expectedDatasource}`,
    `returnedDatasources=${joinDiagnosticValues(params.returnedDatasources)}`,
    `itemCount=${params.itemCount}`,
  ].join('; ');
}

async function loadAttempt(
  adminClient: Awaited<ReturnType<typeof requireAuthenticatedUser>>['adminClient'],
  attemptId: string
) {
  const { data, error } = await adminClient
    .from('social_connection_attempts')
    .select(
      'id, profile_id, provider, platform, requested_by, status, provider_correlation_secret_encrypted, expires_at, last_checked_at, completed_at, error_code, error_message'
    )
    .eq('id', attemptId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('A tentativa de conexão não foi encontrada.');

  return data as SocialConnectionAttemptRecord;
}

async function updateAttempt(
  adminClient: Awaited<ReturnType<typeof requireAuthenticatedUser>>['adminClient'],
  attemptId: string,
  updates: Record<string, unknown>
) {
  const { error } = await adminClient
    .from('social_connection_attempts')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', attemptId);

  if (error) throw error;
}

async function finalizeConnection(params: {
  adminClient: Awaited<ReturnType<typeof requireAuthenticatedUser>>['adminClient'];
  attempt: SocialConnectionAttemptRecord;
  connectedBy: string;
  datasourceId: string;
  selectedAccount: ReturnType<typeof sanitizeLinkedAccount> & { metadata: Record<string, unknown> };
}) {
  const { adminClient, attempt, connectedBy, datasourceId, selectedAccount } = params;
  const now = new Date().toISOString();

  const providerMetadata = {
    datasource: datasourceId,
    account_status: selectedAccount.metadata.status ?? null,
    linked_account: {
      account_name: selectedAccount.accountName,
      account_handle: selectedAccount.accountHandle,
      account_avatar_url: selectedAccount.accountAvatarUrl,
    },
  };

  const { data, error } = await adminClient
    .from('social_connections')
    .upsert(
      {
        profile_id: attempt.profile_id,
        provider: attempt.provider,
        platform: attempt.platform,
        provider_datasource: datasourceId,
        external_account_id: selectedAccount.externalAccountId,
        external_account_name: selectedAccount.accountName,
        external_account_handle: selectedAccount.accountHandle,
        external_account_avatar_url: selectedAccount.accountAvatarUrl,
        status: 'active',
        connected_by: connectedBy,
        provider_metadata: providerMetadata,
        connected_at: now,
        disconnected_at: null,
        updated_at: now,
      },
      {
        onConflict: 'profile_id,provider,platform,external_account_id',
      }
    )
    .select(
      'id, profile_id, provider, platform, provider_datasource, external_account_id, external_account_name, external_account_handle, external_account_avatar_url, status, connected_by, provider_metadata, connected_at, disconnected_at, last_sync_at, last_successful_sync_at, last_sync_error, created_at, updated_at'
    )
    .single();

  if (error) throw error;

  const connection = data as SocialConnectionRecord;

  const { error: deactivateOthersError } = await adminClient
    .from('social_connections')
    .update({
      status: 'disconnected',
      disconnected_at: now,
      updated_at: now,
    })
    .eq('profile_id', attempt.profile_id)
    .eq('provider', attempt.provider)
    .eq('platform', attempt.platform)
    .eq('status', 'active')
    .neq('id', connection.id);

  if (deactivateOthersError) {
    throw deactivateOthersError;
  }

  await updateAttempt(adminClient, attempt.id, {
    status: 'completed',
    completed_at: now,
    last_checked_at: now,
    error_code: null,
    error_message: null,
  });

  return connection;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (request.method !== 'POST') {
      throw new Error('Method not allowed.');
    }

    const payload = (await request.json().catch(() => ({}))) as CheckSocialConnectionPayload;
    const attemptId = payload.attemptId?.trim();
    const externalAccountId = payload.externalAccountId?.trim();

    if (!attemptId) {
      throw new Error('attemptId is required.');
    }

    const { user, userClient, adminClient } = await requireAuthenticatedUser(request);
    const attempt = await loadAttempt(adminClient, attemptId);
    await assertProfileAccess(userClient, { profileId: attempt.profile_id });
    await assertProfileCommercialFeature(adminClient, {
      profileId: attempt.profile_id,
      feature: 'socialAnalytics',
      actorUserId: user.id,
    });

    try {
      const platformConfig = getSocialPlatformConfig(attempt.platform);
      if (!platformConfig || platformConfig.provider !== attempt.provider) {
        throw new Error('A configuração desta plataforma não está disponível.');
      }

      const now = new Date();

      if (attempt.expires_at && new Date(attempt.expires_at).getTime() < now.getTime()) {
        await updateAttempt(adminClient, attempt.id, {
          status: 'expired',
          last_checked_at: now.toISOString(),
          error_code: 'authorization_expired',
          error_message: 'A autorização expirou.',
        });

        return jsonResponse({
          status: 'expired',
          message: 'Sua autorização expirou. Gere um novo link.',
        });
      }

      if (!attempt.provider_correlation_secret_encrypted) {
        throw new Error('Não foi possível localizar o segredo de correlação desta tentativa.');
      }

      const authorizationAccessToken = await decryptSecret(attempt.provider_correlation_secret_encrypted);
      const {
        accounts: linkedAccounts,
        diagnostic: linkedAccountsDiagnostic,
      } = await runSocialCheckConnectionFlow({
        assertSocialAnalyticsAccess: async () => undefined,
        listLinkedAccounts: () => listWindsorLinkedAccounts({
          accessToken: authorizationAccessToken,
        }),
      });

      if (linkedAccounts.length === 0) {
        const diagnosticCode =
          linkedAccountsDiagnostic.itemCount > 0
            ? 'windsor_linked_accounts_parser_mismatch'
            : 'windsor_no_accounts_for_authorization_token';
        const diagnosticMessage =
          linkedAccountsDiagnostic.itemCount > 0
            ? buildParserMismatchMessage({
                itemCount: linkedAccountsDiagnostic.itemCount,
                isArray: linkedAccountsDiagnostic.isArray,
                itemKeys: linkedAccountsDiagnostic.itemKeys,
                hasAccountId: linkedAccountsDiagnostic.hasAccountId,
                hasAccessToken: linkedAccountsDiagnostic.hasAccessToken,
                statuses: linkedAccountsDiagnostic.statuses,
              })
            : null;

        console.info(
          '[social-check-connection] Windsor linked accounts diagnostic:',
          JSON.stringify({
            code: diagnosticCode,
            profileId: attempt.profile_id,
            platform: attempt.platform,
            expectedDatasource: platformConfig.windsorDatasource,
            itemCount: linkedAccountsDiagnostic.itemCount,
            isArray: linkedAccountsDiagnostic.isArray,
            itemKeys: linkedAccountsDiagnostic.itemKeys,
            returnedDatasources: linkedAccountsDiagnostic.datasources,
            hasAccountId: linkedAccountsDiagnostic.hasAccountId,
            hasAccessToken: linkedAccountsDiagnostic.hasAccessToken,
            statuses: linkedAccountsDiagnostic.statuses,
          })
        );

        await updateAttempt(adminClient, attempt.id, {
          status: 'pending',
          last_checked_at: now.toISOString(),
          error_code: diagnosticCode,
          error_message: diagnosticMessage,
        });

        return jsonResponse({
          status: 'pending',
          message:
            'Ainda não encontramos uma conta conectada. Conclua a autorização e tente novamente.',
        });
      }

      const compatibleAccounts = linkedAccounts
        .filter((account) => account.datasource === platformConfig.windsorDatasource)
        .map((account) => ({
          ...sanitizeLinkedAccount(account),
          metadata: account.metadata,
        }));

      if (linkedAccounts.length > 0 && compatibleAccounts.length === 0) {
        const diagnosticMessage = buildDatasourceMismatchMessage({
          expectedDatasource: platformConfig.windsorDatasource,
          returnedDatasources: linkedAccountsDiagnostic.datasources,
          itemCount: linkedAccountsDiagnostic.itemCount,
        });

        console.info(
          '[social-check-connection] Windsor datasource mismatch diagnostic:',
          JSON.stringify({
            code: 'windsor_authorization_token_datasource_mismatch',
            profileId: attempt.profile_id,
            platform: attempt.platform,
            expectedDatasource: platformConfig.windsorDatasource,
            returnedDatasources: linkedAccountsDiagnostic.datasources,
            itemCount: linkedAccountsDiagnostic.itemCount,
          })
        );

        await updateAttempt(adminClient, attempt.id, {
          status: 'pending',
          last_checked_at: now.toISOString(),
          error_code: 'windsor_authorization_token_datasource_mismatch',
          error_message: diagnosticMessage,
        });

        return jsonResponse({
          status: 'pending',
          message:
            'Ainda não encontramos uma conta conectada. Conclua a autorização e tente novamente.',
        });
      }

      if (!externalAccountId && compatibleAccounts.length > 1) {
        await updateAttempt(adminClient, attempt.id, {
          status: 'awaiting_account_selection',
          last_checked_at: now.toISOString(),
          error_code: null,
          error_message: null,
        });

        return jsonResponse({
          status: 'awaiting_account_selection',
          accounts: compatibleAccounts.map((account) => ({
            externalAccountId: account.externalAccountId,
            accountName: account.accountName,
            accountHandle: account.accountHandle,
            accountAvatarUrl: account.accountAvatarUrl,
          })),
        });
      }

      const selectedAccount =
        externalAccountId
          ? compatibleAccounts.find((account) => account.externalAccountId === externalAccountId)
          : compatibleAccounts[0];

      if (!selectedAccount) {
        await updateAttempt(adminClient, attempt.id, {
          status: 'awaiting_account_selection',
          last_checked_at: now.toISOString(),
        });

        return jsonResponse({
          status: 'awaiting_account_selection',
          message: 'A conta selecionada não está mais disponível. Escolha outra conta.',
          accounts: compatibleAccounts.map((account) => ({
            externalAccountId: account.externalAccountId,
            accountName: account.accountName,
            accountHandle: account.accountHandle,
            accountAvatarUrl: account.accountAvatarUrl,
          })),
        });
      }

      const connection = await finalizeConnection({
        adminClient,
        attempt,
        connectedBy: user.id,
        datasourceId: platformConfig.windsorDatasource,
        selectedAccount,
      });

      return jsonResponse({
        status: 'completed',
        connection: {
          id: connection.id,
          profileId: connection.profile_id,
          provider: connection.provider,
          platform: connection.platform,
          providerDatasource: connection.provider_datasource,
          externalAccountId: connection.external_account_id,
          externalAccountName: connection.external_account_name,
          externalAccountHandle: connection.external_account_handle,
          externalAccountAvatarUrl: connection.external_account_avatar_url,
          status: connection.status,
          connectedAt: connection.connected_at,
          disconnectedAt: connection.disconnected_at,
          lastSyncAt: connection.last_sync_at,
          lastSuccessfulSyncAt: connection.last_successful_sync_at,
          lastSyncError: connection.last_sync_error,
        },
      });
    } catch (error) {
      await updateAttempt(adminClient, attempt.id, {
        status: 'failed',
        last_checked_at: new Date().toISOString(),
        error_code: 'windsor_check_failed',
        error_message: error instanceof Error ? error.message : 'Falha ao verificar a conexão.',
      });

      console.error(
        '[social-check-connection] Windsor check failed:',
        error instanceof Error ? error.message : error
      );

      return jsonResponse({
        status: 'failed',
        message: 'Não conseguimos confirmar a conexão agora. Tente novamente em alguns instantes.',
      });
    }
  } catch (error) {
    console.error('[social-check-connection] error:', error instanceof Error ? error.message : error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? ((error as Error & { publicMessage?: string }).publicMessage ?? error.message)
            : 'Não foi possível verificar a conexão com a rede social.',
        code: (error as Error & { code?: string }).code,
        feature: (error as Error & { feature?: string }).feature,
      },
      (error as Error & { status?: number }).status ?? 400
    );
  }
});
