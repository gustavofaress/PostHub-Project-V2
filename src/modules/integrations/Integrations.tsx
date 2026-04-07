import * as React from 'react';
import { useLocation } from 'react-router-dom';
import {
  ExternalLink,
  Plus,
  RefreshCcw,
  Search,
  Share2,
  Zap,
} from 'lucide-react';
import { useProfile } from '../../app/context/ProfileContext';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Badge } from '../../shared/components/Badge';
import {
  InstagramConnection,
  metaInstagramService,
} from '../../services/meta-instagram.service';

type IntegrationStatus = 'connected' | 'not_connected';

interface IntegrationCard {
  id: string;
  name: string;
  description: string;
  category: string;
  status: IntegrationStatus;
  icon: string;
}

const DEFAULT_INTEGRATIONS: IntegrationCard[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Conecte contas Business via Meta OAuth e sincronize métricas reais.',
    category: 'Redes Sociais',
    status: 'not_connected',
    icon: '📸',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Automatize seus uploads de vídeo e tendências.',
    category: 'Redes Sociais',
    status: 'not_connected',
    icon: '🎵',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Agende shorts e gerencie os dados do canal.',
    category: 'Redes Sociais',
    status: 'not_connected',
    icon: '📺',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Receba notificações sobre aprovações e status.',
    category: 'Comunicação',
    status: 'not_connected',
    icon: '💬',
  },
  {
    id: 'drive',
    name: 'Google Drive',
    description: 'Importe mídias diretamente do seu drive.',
    category: 'Armazenamento',
    status: 'not_connected',
    icon: '📁',
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Sincronize seu conteúdo com suas newsletters.',
    category: 'Marketing',
    status: 'not_connected',
    icon: '📧',
  },
];

export const Integrations = () => {
  const location = useLocation();
  const { activeProfile } = useProfile();

  const [connections, setConnections] = React.useState<InstagramConnection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = React.useState(false);
  const [isConnectingInstagram, setIsConnectingInstagram] = React.useState(false);
  const [isSyncingInstagram, setIsSyncingInstagram] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const metaFeedback = React.useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const status = searchParams.get('meta_status');
    const message = searchParams.get('meta_message');

    if (!status || !message) {
      return null;
    }

    return { status, message };
  }, [location.search]);

  const loadConnections = React.useCallback(async () => {
    if (!activeProfile?.id) {
      setConnections([]);
      return;
    }

    setIsLoadingConnections(true);

    try {
      const data = await metaInstagramService.listConnections(activeProfile.id);
      setConnections(data);
    } catch (error) {
      console.error('[Integrations] Error loading Instagram connections:', error);
      setConnections([]);
      setErrorMessage('Não foi possível carregar as conexões do Instagram deste perfil.');
    } finally {
      setIsLoadingConnections(false);
    }
  }, [activeProfile?.id]);

  React.useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  const handleConnectInstagram = React.useCallback(async () => {
    if (!activeProfile?.id) {
      setErrorMessage('Selecione um perfil antes de conectar o Instagram.');
      return;
    }

    setIsConnectingInstagram(true);
    setErrorMessage(null);

    try {
      const authUrl = await metaInstagramService.getAuthUrl(activeProfile.id, '/workspace/integrations');
      window.location.assign(authUrl);
    } catch (error) {
      console.error('[Integrations] Error starting Instagram OAuth:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível iniciar a conexão com a Meta.'
      );
      setIsConnectingInstagram(false);
    }
  }, [activeProfile?.id]);

  const handleSyncInstagram = React.useCallback(async () => {
    if (!activeProfile?.id) {
      setErrorMessage('Selecione um perfil antes de sincronizar métricas.');
      return;
    }

    setIsSyncingInstagram(true);
    setErrorMessage(null);

    try {
      const result = await metaInstagramService.syncMetrics(activeProfile.id);
      const failedSync = result.results.find((item) => item.status === 'error');

      if (failedSync?.error) {
        setErrorMessage(failedSync.error);
      }

      await loadConnections();
    } catch (error) {
      console.error('[Integrations] Error syncing Instagram metrics:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível sincronizar as métricas do Instagram.'
      );
    } finally {
      setIsSyncingInstagram(false);
    }
  }, [activeProfile?.id, loadConnections]);

  const hasInstagramConnections = connections.length > 0;

  const integrations = React.useMemo(
    () =>
      DEFAULT_INTEGRATIONS.map((integration) =>
        integration.id === 'instagram'
          ? {
              ...integration,
              status: hasInstagramConnections ? 'connected' : 'not_connected',
              description: hasInstagramConnections
                ? `${connections.length} conta(s) conectada(s). Última sincronização: ${
                    connections[0]?.last_synced_at
                      ? new Date(connections[0].last_synced_at).toLocaleDateString()
                      : 'pendente'
                  }.`
                : integration.description,
            }
          : integration
      ),
    [connections, hasInstagramConnections]
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
            <Share2 className="h-6 w-6 text-brand" />
            Integrações
          </h1>
          <p className="text-text-secondary">
            Conecte o PostHub às suas ferramentas e plataformas favoritas.
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Solicitar Integração
        </Button>
      </div>

      {metaFeedback && (
        <Card
          className={
            metaFeedback.status === 'success'
              ? 'border-green-200 bg-green-50 p-4 text-green-700'
              : 'border-red-200 bg-red-50 p-4 text-red-700'
          }
        >
          {metaFeedback.message}
        </Card>
      )}

      {errorMessage && (
        <Card className="border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </Card>
      )}

      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="w-full md:w-96">
          <Input placeholder="Buscar integrações..." icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="flex w-full gap-2 overflow-x-auto pb-2 md:w-auto md:pb-0">
          {['Todas', 'Redes Sociais', 'Comunicação', 'Armazenamento', 'Marketing'].map((cat) => (
            <Button
              key={cat}
              variant={cat === 'Todas' ? 'primary' : 'ghost'}
              size="sm"
              className="whitespace-nowrap"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((app) => {
          const isInstagram = app.id === 'instagram';
          const isInstagramBusy =
            isInstagram && (isConnectingInstagram || isSyncingInstagram || isLoadingConnections);

          return (
            <Card
              key={app.id}
              className="group transition-all duration-300 hover:border-brand/50"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-2xl shadow-sm transition-transform group-hover:scale-110">
                  {app.icon}
                </div>
                <Badge variant={app.status === 'connected' ? 'success' : 'default'}>
                  {app.status === 'connected' ? 'Conectado' : 'Não Conectado'}
                </Badge>
              </div>

              <h3 className="mb-1 font-bold text-text-primary">{app.name}</h3>
              <p className="mb-6 line-clamp-2 text-xs text-text-secondary">
                {app.description}
              </p>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {app.category}
                </span>
                {isInstagram ? (
                  <Button
                    variant={app.status === 'connected' ? 'outline' : 'primary'}
                    size="sm"
                    className="h-8 gap-2"
                    onClick={() =>
                      app.status === 'connected'
                        ? void handleSyncInstagram()
                        : void handleConnectInstagram()
                    }
                    isLoading={isInstagramBusy}
                  >
                    {app.status === 'connected' ? (
                      <>
                        Atualizar
                        <RefreshCcw className="h-3 w-3" />
                      </>
                    ) : (
                      <>
                        Conectar
                        <ExternalLink className="h-3 w-3" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="h-8 gap-2">
                    Em breve
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="relative overflow-hidden border-none bg-gradient-to-r from-brand to-blue-600 p-8 text-white">
        <div className="relative z-10 max-w-lg">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-md">
            <Zap className="h-3 w-3" />
            NOVA INTEGRAÇÃO
          </div>
          <h2 className="mb-4 text-3xl font-bold">PostHub para Slack</h2>
          <p className="mb-6 text-white/80">
            Receba notificações em tempo real sobre aprovações de conteúdo, comentários e status de
            publicação diretamente nos seus canais do Slack.
          </p>
          <Button className="gap-2 bg-white text-brand hover:bg-white/90">
            Adicionar ao Slack
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-10">
          <div className="absolute right-[-10%] top-[-20%] h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-[-20%] right-[10%] h-48 w-48 rounded-full bg-white blur-2xl" />
        </div>
      </Card>
    </div>
  );
};
