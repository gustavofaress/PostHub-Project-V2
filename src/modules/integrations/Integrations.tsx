import * as React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCcw,
  Share2,
} from 'lucide-react';
import { useProfile } from '../../app/context/ProfileContext';
import { useSocialConnections } from '../../hooks/useSocialConnections';
import { useWorkspacePermissions } from '../../hooks/useWorkspacePermissions';
import { useActiveProfileCommercialAccess } from '../../hooks/useActiveProfileCommercialAccess';
import { Card, CardDescription, CardTitle } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { SOCIAL_PLATFORM_LIST } from '../../shared/constants/socialPlatforms';
import { socialAnalyticsService } from '../../services/social-analytics.service';
import type {
  SocialConnectionAttemptAccount,
} from '../../types/social-analytics';

type InstagramUiState = 'idle' | 'authorizing' | 'selecting' | 'connected';

const WINDSOR_POLL_INTERVAL_MS = 4000;
const WINDSOR_POLL_TIMEOUT_MS = 2 * 60 * 1000;

export const Integrations = () => {
  const { activeProfile } = useProfile();
  const { canAccess, isLoadingPermissions } = useWorkspacePermissions();
  const commercialAccess = useActiveProfileCommercialAccess();
  const {
    connections,
    isLoadingConnections,
    connectionsError,
    reloadConnections,
  } = useSocialConnections(activeProfile?.id);
  const [isCreatingConnection, setIsCreatingConnection] = React.useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = React.useState(false);
  const [isDisconnectingConnection, setIsDisconnectingConnection] = React.useState(false);
  const [isSyncingConnection, setIsSyncingConnection] = React.useState(false);
  const [currentAttemptId, setCurrentAttemptId] = React.useState<string | null>(null);
  const [attemptExpiresAt, setAttemptExpiresAt] = React.useState<string | null>(null);
  const [pendingAccounts, setPendingAccounts] = React.useState<SocialConnectionAttemptAccount[]>(
    []
  );
  const [selectedExternalAccountId, setSelectedExternalAccountId] = React.useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [infoMessage, setInfoMessage] = React.useState<string | null>(null);
  const [pollCycle, setPollCycle] = React.useState(0);
  const [hasAutoPollingTimedOut, setHasAutoPollingTimedOut] = React.useState(false);
  const pollingStartedAtRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setCurrentAttemptId(null);
    setAttemptExpiresAt(null);
    setPendingAccounts([]);
    setSelectedExternalAccountId(null);
    setErrorMessage(null);
    setInfoMessage(null);
    setPollCycle(0);
    setHasAutoPollingTimedOut(false);
    pollingStartedAtRef.current = null;
  }, [activeProfile?.id]);

  React.useEffect(() => {
    if (connectionsError) {
      setErrorMessage(connectionsError);
    }
  }, [connectionsError]);

  const instagramConnection = React.useMemo(
    () =>
      connections.find(
        (connection) => connection.platform === 'instagram' && connection.status === 'active'
      ) ?? null,
    [connections]
  );

  const instagramUiState: InstagramUiState = React.useMemo(() => {
    if (instagramConnection) return 'connected';
    if (pendingAccounts.length > 0) return 'selecting';
    if (currentAttemptId) return 'authorizing';
    return 'idle';
  }, [currentAttemptId, instagramConnection, pendingAccounts.length]);
  const socialAnalyticsFeatureAccess = commercialAccess.resolveFeatureAccess('socialAnalytics');
  const hasPerformancePermission =
    activeProfile?.role === 'owner' ? true : !isLoadingPermissions && canAccess('performance');
  const canStartSocialAnalyticsActions =
    socialAnalyticsFeatureAccess.enabled && hasPerformancePermission;
  const canDisconnectSocialAnalytics = hasPerformancePermission;
  const socialAnalyticsGuardMessage = React.useMemo(() => {
    if (socialAnalyticsFeatureAccess.status === 'loading') {
      return 'Estamos verificando o acesso comercial deste perfil para liberar analytics social.';
    }

    if (isLoadingPermissions && activeProfile?.role !== 'owner') {
      return 'Estamos verificando as permissões deste workspace para liberar analytics social.';
    }

    if (socialAnalyticsFeatureAccess.status === 'error') {
      return 'Não foi possível verificar o acesso comercial deste perfil agora. Tente novamente.';
    }

    if (!hasPerformancePermission) {
      return 'Seu papel atual não libera métricas e integrações de performance neste workspace.';
    }

    if (!socialAnalyticsFeatureAccess.enabled) {
      return 'As integrações de analytics social ficam disponíveis apenas no PRO do perfil ativo.';
    }

    return null;
  }, [
    activeProfile?.role,
    hasPerformancePermission,
    isLoadingPermissions,
    socialAnalyticsFeatureAccess.enabled,
    socialAnalyticsFeatureAccess.status,
  ]);
  const showSocialAnalyticsNotice = !!socialAnalyticsGuardMessage;

  const clearAttemptState = React.useCallback(() => {
    setCurrentAttemptId(null);
    setAttemptExpiresAt(null);
    setPendingAccounts([]);
    setSelectedExternalAccountId(null);
    setPollCycle(0);
    setHasAutoPollingTimedOut(false);
    pollingStartedAtRef.current = null;
  }, []);

  const handleConnectInstagram = React.useCallback(async () => {
    if (!activeProfile?.id) {
      setErrorMessage('Selecione um perfil antes de conectar o Instagram.');
      return;
    }

    if (!canStartSocialAnalyticsActions) {
      setErrorMessage(
        socialAnalyticsGuardMessage ||
          'As integrações de analytics social não estão disponíveis para este perfil agora.'
      );
      return;
    }

    setIsCreatingConnection(true);
    setErrorMessage(null);
    setInfoMessage(null);
    setPendingAccounts([]);
    setSelectedExternalAccountId(null);
    setPollCycle(0);
    setHasAutoPollingTimedOut(false);
    pollingStartedAtRef.current = null;

    try {
      const result = await socialAnalyticsService.createConnection(activeProfile.id, 'instagram');
      setCurrentAttemptId(result.attemptId);
      setAttemptExpiresAt(result.expiresAt);
      pollingStartedAtRef.current = Date.now();
      window.open(result.authorizationUrl, '_blank', 'noopener,noreferrer');
      setInfoMessage(
        'Aguardando conclusão da conexão no Windsor. Assim que a autorização terminar, vamos verificar automaticamente.'
      );
    } catch (error) {
      console.error('[Integrations] Error starting social authorization:', error);
      setErrorMessage('Não foi possível iniciar a conexão. Tente novamente.');
    } finally {
      setIsCreatingConnection(false);
    }
  }, [activeProfile?.id, canStartSocialAnalyticsActions, socialAnalyticsGuardMessage]);

  const handleCheckConnection = React.useCallback(async (mode: 'manual' | 'poll' = 'manual') => {
    if (!canStartSocialAnalyticsActions) {
      if (mode === 'manual') {
        setErrorMessage(
          socialAnalyticsGuardMessage ||
            'As integrações de analytics social não estão disponíveis para este perfil agora.'
        );
      }
      return null;
    }

    if (!currentAttemptId) {
      if (mode === 'manual') {
        setErrorMessage('Gere um novo link para continuar a conexão.');
      }
      return null;
    }

    const isManualCheck = mode === 'manual';

    setIsCheckingConnection(true);
    if (isManualCheck) {
      setErrorMessage(null);
      setInfoMessage(null);
    }

    try {
      const result = await socialAnalyticsService.checkConnection(
        currentAttemptId,
        pendingAccounts.length > 0 ? selectedExternalAccountId : undefined
      );

      if (result.status === 'pending') {
        setPendingAccounts([]);
        setSelectedExternalAccountId(null);
        setInfoMessage(
          result.message ||
            'Aguardando conclusão da conexão...'
        );
      } else if (result.status === 'awaiting_account_selection') {
        const nextAccounts = result.accounts ?? [];
        setPendingAccounts(nextAccounts);
        setSelectedExternalAccountId(nextAccounts[0]?.externalAccountId ?? null);
        setHasAutoPollingTimedOut(false);
        setInfoMessage('Escolha qual conta você quer conectar ao PostHub.');
      } else if (result.status === 'expired') {
        clearAttemptState();
        setErrorMessage(result.message || 'Sua autorização expirou. Gere um novo link.');
      } else if (result.status === 'failed') {
        setHasAutoPollingTimedOut(true);
        setErrorMessage(
          result.message || 'Não conseguimos confirmar a conexão agora. Tente novamente em alguns instantes.'
        );
      } else if (result.status === 'completed') {
        await reloadConnections();
        clearAttemptState();
        setInfoMessage('Instagram conectado com sucesso.');
      }

      return result.status;
    } catch (error) {
      console.error('[Integrations] Error checking social connection:', error);
      setErrorMessage('Não foi possível verificar a conexão. Tente novamente.');
      return null;
    } finally {
      setIsCheckingConnection(false);
    }
  }, [
    canStartSocialAnalyticsActions,
    clearAttemptState,
    currentAttemptId,
    pendingAccounts.length,
    reloadConnections,
    selectedExternalAccountId,
    socialAnalyticsGuardMessage,
  ]);

  React.useEffect(() => {
    if (
      !canStartSocialAnalyticsActions ||
      !currentAttemptId ||
      pendingAccounts.length > 0 ||
      instagramConnection ||
      hasAutoPollingTimedOut
    ) {
      return;
    }

    if (isCheckingConnection) {
      return;
    }

    const startedAt = pollingStartedAtRef.current;
    if (!startedAt) {
      pollingStartedAtRef.current = Date.now();
    }

    const elapsedMs = Date.now() - (pollingStartedAtRef.current ?? Date.now());
    const remainingMs = WINDSOR_POLL_TIMEOUT_MS - elapsedMs;

    if (remainingMs <= 0) {
      setHasAutoPollingTimedOut(true);
      setInfoMessage(
        'Aguardando conclusão da conexão... Você pode continuar nesta tela e usar "Verificar conexão" com o mesmo link.'
      );
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void handleCheckConnection('poll').then((status) => {
        if (status === 'pending') {
          setPollCycle((currentCycle) => currentCycle + 1);
        }
      });
    }, Math.min(WINDSOR_POLL_INTERVAL_MS, remainingMs));

    return () => window.clearTimeout(timeoutId);
  }, [
    canStartSocialAnalyticsActions,
    currentAttemptId,
    pendingAccounts.length,
    instagramConnection,
    hasAutoPollingTimedOut,
    isCheckingConnection,
    handleCheckConnection,
    pollCycle,
  ]);

  const handleDisconnectInstagram = React.useCallback(async () => {
    if (!instagramConnection) {
      return;
    }

    if (!canDisconnectSocialAnalytics) {
      setErrorMessage('Seu papel atual não pode desconectar integrações deste workspace.');
      return;
    }

    setIsDisconnectingConnection(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      await socialAnalyticsService.disconnect(instagramConnection.id);
      await reloadConnections();
      setInfoMessage('Instagram desconectado com sucesso.');
    } catch (error) {
      console.error('[Integrations] Error disconnecting social connection:', error);
      setErrorMessage('Não foi possível desconectar o Instagram. Tente novamente.');
    } finally {
      setIsDisconnectingConnection(false);
    }
  }, [canDisconnectSocialAnalytics, instagramConnection, reloadConnections]);

  const handleSyncInstagramMetrics = React.useCallback(async () => {
    if (!activeProfile?.id || !instagramConnection) {
      setErrorMessage('Selecione um perfil com Instagram conectado antes de sincronizar.');
      return;
    }

    if (!canStartSocialAnalyticsActions) {
      setErrorMessage(
        socialAnalyticsGuardMessage ||
          'As métricas sociais não estão disponíveis para este perfil agora.'
      );
      return;
    }

    setIsSyncingConnection(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      console.info('[Integrations] Sync Instagram metrics start:', {
        profileId: activeProfile.id,
        connectionId: instagramConnection.id,
      });

      const result = await socialAnalyticsService.syncConnection(
        activeProfile.id,
        instagramConnection.id
      );

      console.info('[Integrations] Sync Instagram metrics result:', {
        profileId: result.profileId,
        connectionId: result.connectionId,
        status: result.status,
        recordsReceived: result.recordsReceived,
        recordsProcessed: result.recordsProcessed,
      });

      await reloadConnections();

      setInfoMessage(
        result.status === 'success'
          ? 'Métricas do Instagram sincronizadas com sucesso.'
          : 'Sincronização concluída, mas ainda não encontramos novas métricas disponíveis.'
      );
    } catch (error) {
      console.error('[Integrations] Error syncing Instagram metrics:', {
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      setErrorMessage('Não foi possível sincronizar as métricas agora. Tente novamente em alguns minutos.');
    } finally {
      setIsSyncingConnection(false);
    }
  }, [
    activeProfile?.id,
    canStartSocialAnalyticsActions,
    instagramConnection,
    reloadConnections,
    socialAnalyticsGuardMessage,
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
            <Share2 className="h-6 w-6 text-brand" />
            Integrações
          </h1>
          <p className="text-text-secondary">
            Conecte o PostHub às suas ferramentas e plataformas favoritas.
          </p>
        </div>

        {activeProfile ? <Badge variant="brand">Perfil ativo: {activeProfile.name}</Badge> : null}
      </div>

      {infoMessage ? (
        <Card className="border-blue-200 bg-blue-50 p-4 text-blue-700">{infoMessage}</Card>
      ) : null}

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50 p-4 text-red-700">{errorMessage}</Card>
      ) : null}

      <Card className="space-y-6">
        <div>
          <CardTitle>Redes sociais</CardTitle>
          <CardDescription>
            Conecte suas redes sociais para acompanhar resultados dentro do PostHub.
          </CardDescription>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {SOCIAL_PLATFORM_LIST.map((platform) => {
            const Icon = platform.icon;

            return (
              <Card key={platform.id} className="border-slate-200/90">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-brand">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">{platform.label}</h3>
                      <p className="mt-1 text-sm text-text-secondary">{platform.description}</p>
                    </div>
                  </div>
                  <Badge variant={platform.available ? 'brand' : 'default'}>
                    {platform.availabilityLabel}
                  </Badge>
                </div>

                {platform.id === 'instagram' ? (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    {showSocialAnalyticsNotice ? (
                      <Card
                        className={
                          socialAnalyticsFeatureAccess.status === 'error'
                            ? 'mb-4 border-red-200 bg-red-50 p-4 text-red-700'
                            : socialAnalyticsFeatureAccess.status === 'loading'
                            ? 'mb-4 border-slate-200 bg-white p-4 text-slate-600'
                            : isLoadingPermissions && activeProfile?.role !== 'owner'
                            ? 'mb-4 border-slate-200 bg-white p-4 text-slate-600'
                            : !hasPerformancePermission
                            ? 'mb-4 border-amber-200 bg-amber-50 p-4 text-amber-700'
                            : 'mb-4 border-brand/20 bg-brand/5 p-4 text-brand'
                        }
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-medium">{socialAnalyticsGuardMessage}</p>
                          {socialAnalyticsFeatureAccess.status === 'error' ? (
                            <Button
                              variant="secondary"
                              className="gap-2"
                              onClick={() => void commercialAccess.refetch()}
                            >
                              <RefreshCcw className="h-4 w-4" />
                              Tentar novamente
                            </Button>
                          ) : null}
                        </div>
                      </Card>
                    ) : null}

                    {instagramUiState === 'connected' && instagramConnection ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-medium">Conectado</span>
                        </div>

                        <div className="space-y-1">
                          <p className="font-medium text-text-primary">
                            {instagramConnection.externalAccountHandle
                              ? `@${instagramConnection.externalAccountHandle.replace(/^@/, '')}`
                              : 'Conta conectada'}
                          </p>
                          <p className="text-sm text-text-secondary">
                            {instagramConnection.externalAccountName || 'Nome da conta não informado'}
                          </p>
                          <p className="text-sm text-text-secondary">
                            Última sincronização:{' '}
                            {instagramConnection.lastSuccessfulSyncAt
                              ? new Date(instagramConnection.lastSuccessfulSyncAt).toLocaleString()
                              : 'Ainda não sincronizado'}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant="outline"
                            onClick={() => void handleSyncInstagramMetrics()}
                            isLoading={isSyncingConnection}
                            disabled={
                              !canStartSocialAnalyticsActions ||
                              isSyncingConnection ||
                              isDisconnectingConnection
                            }
                            className="gap-2"
                          >
                            <RefreshCcw className="h-4 w-4" />
                            {isSyncingConnection ? 'Sincronizando...' : 'Sincronizar métricas'}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => void handleDisconnectInstagram()}
                            isLoading={isDisconnectingConnection}
                            disabled={!canDisconnectSocialAnalytics || isSyncingConnection}
                          >
                            Desconectar
                          </Button>
                        </div>
                      </div>
                    ) : instagramUiState === 'selecting' ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-text-primary">
                          <AlertCircle className="h-4 w-4 text-brand" />
                          <span className="text-sm font-medium">Qual conta você quer conectar?</span>
                        </div>

                        <div className="space-y-2">
                          {pendingAccounts.map((account) => (
                            <label
                              key={account.externalAccountId}
                              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3"
                            >
                              <input
                                type="radio"
                                name="instagram-account"
                                value={account.externalAccountId}
                                checked={selectedExternalAccountId === account.externalAccountId}
                                onChange={() => setSelectedExternalAccountId(account.externalAccountId)}
                                className="mt-1"
                              />
                              <div>
                                <p className="font-medium text-text-primary">
                                  {account.accountName || 'Conta sem nome'}
                                </p>
                                <p className="text-sm text-text-secondary">
                                  {account.accountHandle
                                    ? `@${account.accountHandle.replace(/^@/, '')}`
                                    : 'Handle não informado'}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button
                            onClick={() => void handleCheckConnection()}
                            isLoading={isCheckingConnection}
                            disabled={!selectedExternalAccountId || !canStartSocialAnalyticsActions}
                          >
                            Conectar esta conta
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => void handleConnectInstagram()}
                            isLoading={isCreatingConnection}
                            disabled={!canStartSocialAnalyticsActions || isCheckingConnection}
                          >
                            Gerar novo link
                          </Button>
                        </div>
                      </div>
                    ) : instagramUiState === 'authorizing' ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-text-primary">
                          {isCheckingConnection ? (
                            <Loader2 className="h-4 w-4 animate-spin text-brand" />
                          ) : (
                            <ExternalLink className="h-4 w-4 text-brand" />
                          )}
                          <span className="text-sm font-medium">Aguardando conclusão da conexão...</span>
                        </div>

                        <div className="space-y-1 text-sm text-text-secondary">
                          <p>Autorize seu Instagram na página que foi aberta.</p>
                          <p>
                            Vamos verificar automaticamente por alguns instantes. Se preferir, você também pode
                            clicar em verificar conexão com este mesmo link.
                          </p>
                          {attemptExpiresAt ? (
                            <p>Esta autorização expira em {new Date(attemptExpiresAt).toLocaleString()}.</p>
                          ) : null}
                          {hasAutoPollingTimedOut ? (
                            <p>A conexão ainda pode ser concluída. Use o botão abaixo para verificar novamente.</p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button
                            onClick={() => void handleCheckConnection()}
                            isLoading={isCheckingConnection}
                            disabled={!canStartSocialAnalyticsActions}
                          >
                            Verificar conexão
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => void handleConnectInstagram()}
                            isLoading={isCreatingConnection}
                            disabled={!canStartSocialAnalyticsActions || isCheckingConnection}
                          >
                            Gerar novo link
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="font-medium text-text-primary">Instagram</p>
                          <p className="text-sm text-text-secondary">
                            Conecte sua conta do Instagram para acompanhar seus resultados dentro do PostHub.
                          </p>
                        </div>

                        <Button
                          onClick={() => void handleConnectInstagram()}
                          isLoading={isCreatingConnection}
                          disabled={!canStartSocialAnalyticsActions}
                          className="gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Conectar Instagram
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-6">
                    <Button variant="outline" disabled>
                      Em breve
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </Card>

      <Card className="border-slate-200/90 bg-slate-50/70">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Estado desta fase</CardTitle>
            <CardDescription>
	              A conexão estrutural com Instagram já fica centralizada em Social Analytics. Use o botão do Instagram para executar o primeiro teste manual de métricas.
            </CardDescription>
          </div>
          <Badge variant="info">
            {isLoadingConnections
              ? 'Carregando conexões...'
              : `${connections.length} conexão(ões) neste perfil`}
          </Badge>
        </div>
      </Card>
    </div>
  );
};
