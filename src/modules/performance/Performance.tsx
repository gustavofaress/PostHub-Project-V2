import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Instagram,
  RefreshCcw,
} from 'lucide-react';
import { Card, CardDescription, CardTitle } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { EmptyState } from '../../shared/components/EmptyState';
import { Tabs } from '../../shared/components/Tabs';
import { useProfile } from '../../app/context/ProfileContext';
import { useAuth } from '../../app/context/AuthContext';
import { supabase } from '../../shared/utils/supabase';
import {
  InstagramConnection,
  metaInstagramService,
} from '../../services/meta-instagram.service';
import { PerformanceInstagramUploads } from './PerformanceInstagramUploads';

interface InstagramMetricRow {
  id: string;
  metric_external_id?: string | null;
  metric_scope?: 'account' | 'media' | null;
  user_id?: string | null;
  customer_id: string;
  profile_id: string | null;
  page_id?: string | null;
  instagram_user_id?: string | null;
  media_id?: string | null;
  date?: string | null;
  data?: string | null;
  likes?: number | null;
  comments?: number | null;
  total_interactions?: number | null;
  accounts_engaged?: number | null;
  saves?: number | null;
  shares?: number | null;
  follows?: number | null;
  unfollows?: number | null;
  profile_link_taps?: number | null;
  website_clicks?: number | null;
  profile_views?: number | null;
  impressions?: number | null;
  reach?: number | null;
  impressoes?: number | null;
  alcance?: number | null;
  seguidores?: number | null;
  caption?: string | null;
  permalink?: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface MetricCard {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
}

interface TopPostRow {
  id: string;
  title: string;
  platform: string;
  reach: number;
  engagement: number;
  createdAt: string;
}

interface MetricsSummary {
  reach: number;
  impressions: number;
  engagementRate: number;
  profileViews: number;
}

interface PerformanceSection {
  id: 'overview' | 'instagram-uploads';
  label: string;
  description: string;
  badge?: string;
}

function cn(...inputs: Array<string | boolean | null | undefined>) {
  return inputs.filter(Boolean).join(' ');
}

function safeNumber(value: number | null | undefined): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getMetricDate(row: InstagramMetricRow): Date {
  const raw = row.data || row.date || row.created_at;
  const parsed = new Date(raw || '');

  if (Number.isNaN(parsed.getTime())) {
    return new Date(row.created_at);
  }

  return parsed;
}

function getReach(row: InstagramMetricRow): number {
  return safeNumber(row.alcance ?? row.reach);
}

function getImpressions(row: InstagramMetricRow): number {
  return safeNumber(row.impressoes ?? row.impressions);
}

function getFollowers(row: InstagramMetricRow): number {
  return safeNumber(row.seguidores);
}

function getProfileViews(row: InstagramMetricRow): number {
  return safeNumber(row.profile_views);
}

function getEngagementSignals(row: InstagramMetricRow): number {
  return (
    safeNumber(row.likes) +
    safeNumber(row.comments) +
    safeNumber(row.shares) +
    safeNumber(row.saves)
  );
}

function getEngagementRate(row: InstagramMetricRow): number {
  const explicitTotal = safeNumber(row.total_interactions);
  const explicitEngaged = safeNumber(row.accounts_engaged);
  const reach = getReach(row);

  if (reach <= 0) return 0;

  if (explicitTotal > 0) {
    return (explicitTotal / reach) * 100;
  }

  if (explicitEngaged > 0) {
    return (explicitEngaged / reach) * 100;
  }

  return (getEngagementSignals(row) / reach) * 100;
}

function calculateMetrics(rows: InstagramMetricRow[]) {
  const now = new Date();
  const currentStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));

  const filteredRows = rows.filter((row) => getMetricDate(row) >= currentStart);
  const currentRows = filteredRows.length > 0 ? filteredRows : rows;
  const accountRows = currentRows.filter((row) => row.metric_scope === 'account');
  const mediaRows = currentRows.filter(
    (row) => row.metric_scope === 'media' || (!row.metric_scope && Boolean(row.caption || row.permalink))
  );
  const summaryRows = accountRows.length > 0 ? accountRows : mediaRows;

  const sumBy = (items: InstagramMetricRow[], getter: (row: InstagramMetricRow) => number) =>
    items.reduce((acc, item) => acc + getter(item), 0);

  const avgBy = (items: InstagramMetricRow[], getter: (row: InstagramMetricRow) => number) => {
    if (!items.length) return 0;
    return sumBy(items, getter) / items.length;
  };

  const accountRowsSorted = [...summaryRows].sort(
    (a, b) => getMetricDate(a).getTime() - getMetricDate(b).getTime()
  );

  const followerGrowth =
    accountRowsSorted.length >= 2
      ? getFollowers(accountRowsSorted[accountRowsSorted.length - 1]) - getFollowers(accountRowsSorted[0])
      : accountRowsSorted.length === 1
      ? getFollowers(accountRowsSorted[0])
      : 0;

  const totalLikes = sumBy(mediaRows, (row) => safeNumber(row.likes));
  const totalComments = sumBy(mediaRows, (row) => safeNumber(row.comments));
  const totalAccountsEngaged = sumBy(mediaRows, (row) => safeNumber(row.accounts_engaged));
  const totalSavesAndShares = sumBy(
    mediaRows,
    (row) => safeNumber(row.saves) + safeNumber(row.shares)
  );

  const totalReach = sumBy(summaryRows, getReach);
  const totalImpressions = sumBy(summaryRows, getImpressions);
  const totalProfileViews = sumBy(summaryRows, getProfileViews);
  const avgEngagementRate = avgBy(mediaRows, getEngagementRate);

  const metrics: MetricCard[] = [
    {
      label: 'Curtidas',
      value: formatCompactNumber(totalLikes),
      change: `${mediaRows.length} posts`,
      trend: 'up',
    },
    {
      label: 'Comentários',
      value: formatCompactNumber(totalComments),
      change: `${mediaRows.length} posts`,
      trend: 'up',
    },
    {
      label: 'Contas Engajadas',
      value: formatCompactNumber(totalAccountsEngaged),
      change: `${mediaRows.length} posts`,
      trend: 'up',
    },
    {
      label: 'Salvamentos + Compartilhamentos',
      value: formatCompactNumber(totalSavesAndShares),
      change: `${mediaRows.length} posts`,
      trend: 'up',
    },
  ];

  const summary: MetricsSummary = {
    reach: totalReach,
    impressions: totalImpressions,
    engagementRate: avgEngagementRate,
    profileViews: totalProfileViews,
  };

  const topPosts: TopPostRow[] = mediaRows
    .filter((row) => Boolean(row.caption || row.permalink))
    .map((row) => ({
      id: row.id,
      title: row.caption?.trim() || 'Post sem legenda',
      platform: 'Instagram',
      reach: getReach(row),
      engagement: getEngagementRate(row),
      createdAt: row.created_at,
    }))
    .sort((a, b) => b.reach - a.reach)
    .slice(0, 8);

  return {
    metrics,
    topPosts,
    summary,
    followerGrowth,
    hasAccountData: summaryRows.length > 0,
    hasMediaData: mediaRows.length > 0,
  };
}

function formatConnectionStatus(connection: InstagramConnection) {
  if (connection.last_sync_status === 'error') {
    return {
      label: 'Erro na sincronização',
      variant: 'default' as const,
    };
  }

  if (connection.last_sync_status === 'success') {
    return {
      label: 'Sincronizado',
      variant: 'success' as const,
    };
  }

  return {
    label: 'Pendente',
    variant: 'default' as const,
  };
}

export const Performance = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeProfile } = useProfile();
  const { user } = useAuth();

  const [rows, setRows] = React.useState<InstagramMetricRow[]>([]);
  const [connections, setConnections] = React.useState<InstagramConnection[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
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

  const loadMetrics = React.useCallback(async () => {
    if (!supabase || !user?.id || !activeProfile?.id) {
      setRows([]);
      return;
    }

    const { data, error } = await supabase
      .from('instagram_metrics')
      .select('*')
      .eq('customer_id', user.id)
      .eq('profile_id', activeProfile.id)
      .order('data', { ascending: false });

    if (error) {
      throw error;
    }

    setRows((data ?? []) as InstagramMetricRow[]);
  }, [activeProfile?.id, user?.id]);

  const loadConnections = React.useCallback(async () => {
    if (!activeProfile?.id) {
      setConnections([]);
      return;
    }

    const data = await metaInstagramService.listConnections(activeProfile.id);
    setConnections(data);
  }, [activeProfile?.id]);

  const loadData = React.useCallback(async () => {
    if (!activeProfile?.id || !user?.id) {
      setRows([]);
      setConnections([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await Promise.all([loadConnections(), loadMetrics()]);
    } catch (error) {
      console.error('[Performance] Error loading performance data:', error);
      setRows([]);
      setConnections([]);
      setErrorMessage(
        'Não foi possível carregar as conexões e métricas do Instagram para este perfil.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeProfile?.id, loadConnections, loadMetrics, user?.id]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleConnectInstagram = React.useCallback(async () => {
    if (!activeProfile?.id) {
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const authUrl = await metaInstagramService.getAuthUrl(activeProfile.id);
      window.location.assign(authUrl);
    } catch (error) {
      console.error('[Performance] Error starting Meta OAuth:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível iniciar a conexão com a Meta.'
      );
      setIsConnecting(false);
    }
  }, [activeProfile?.id]);

  const handleSyncMetrics = React.useCallback(async () => {
    if (!activeProfile?.id) {
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);

    try {
      const result = await metaInstagramService.syncMetrics(activeProfile.id);
      const failedSync = result.results.find((item) => item.status === 'error');

      if (failedSync?.error) {
        setErrorMessage(failedSync.error);
      }

      await loadData();
    } catch (error) {
      console.error('[Performance] Error syncing instagram metrics:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível sincronizar as métricas do Instagram.'
      );
    } finally {
      setIsSyncing(false);
    }
  }, [activeProfile?.id, loadData]);

  const { metrics, topPosts, summary, followerGrowth, hasAccountData, hasMediaData } =
    React.useMemo(() => calculateMetrics(rows), [rows]);

  const hasConnections = connections.length > 0;
  const hasData = rows.length > 0;
  const sections: PerformanceSection[] = React.useMemo(
    () => [
      {
        id: 'overview',
        label: 'Visão Geral',
        description: 'Métricas atuais vindas da Meta e ranking do Instagram conectado.',
      },
      {
        id: 'instagram-uploads',
        label: 'Instagram Uploads',
        description:
          'Nova página para subir imagens e PDFs, revisar extrações e consolidar dashboard próprio.',
        badge: 'Novo',
      },
    ],
    []
  );
  const activeTab = React.useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('tab') === 'instagram-uploads' ? 'instagram-uploads' : 'overview';
  }, [location.search]);

  const handleTabChange = React.useCallback(
    (nextTab: string) => {
      const searchParams = new URLSearchParams(location.search);

      if (nextTab === 'overview') {
        searchParams.delete('tab');
      } else {
        searchParams.set('tab', nextTab);
      }

      const nextSearch = searchParams.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : '',
        },
        { replace: true }
      );
    },
    [location.pathname, location.search, navigate]
  );

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
            <BarChart3 className="h-6 w-6 text-brand" />
            Análise de Performance
          </h1>
          <p className="text-text-secondary">
            Acompanhe métricas reais da Meta e evolua para dashboards dedicados por plataforma.
          </p>
          {activeProfile && (
            <p className="mt-1 text-sm text-text-secondary">
              Perfil ativo: <span className="font-medium">{activeProfile.name}</span>
            </p>
          )}
        </div>

        <Tabs
          tabs={[
            { id: 'overview', label: 'Visão Geral' },
            { id: 'instagram-uploads', label: 'Instagram Uploads' },
          ]}
          activeTab={activeTab}
          onChange={handleTabChange}
        />
      </div>

      <Card className="border-gray-200 bg-white">
        <div className="mb-4">
          <CardTitle>Seções do módulo</CardTitle>
          <CardDescription>
            O Performance agora está dividido em páginas internas. Você pode navegar por aqui sem
            depender da sidebar.
          </CardDescription>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {sections.map((section) => {
            const isActiveSection = activeTab === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => handleTabChange(section.id)}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-all',
                  isActiveSection
                    ? 'border-brand bg-brand/[0.05] shadow-sm'
                    : 'border-gray-200 bg-gray-50/70 hover:border-brand/30 hover:bg-white'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-text-primary">{section.label}</p>
                      {section.badge ? <Badge variant="brand">{section.badge}</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-text-secondary">
                      {section.description}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      'mt-1 h-4 w-4 shrink-0 transition-transform',
                      isActiveSection ? 'translate-x-0 text-brand' : 'text-text-secondary'
                    )}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {activeTab === 'instagram-uploads' ? (
        <PerformanceInstagramUploads />
      ) : (
        <>
          <Card className="border-brand/15 bg-brand/[0.05]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Base atual do Analytics</CardTitle>
                <CardDescription>
                  Esta visão continua mostrando os dados sincronizados pela Meta. A nova página de
                  Instagram Uploads fica disponível como uma seção separada dentro deste módulo.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleTabChange('instagram-uploads')}
              >
                Abrir Instagram Uploads
              </Button>
            </div>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => void handleConnectInstagram()}
              isLoading={isConnecting}
              className="gap-2"
            >
              <Instagram className="h-4 w-4" />
              Conectar Instagram
            </Button>
            <Button
              onClick={() => void handleSyncMetrics()}
              isLoading={isSyncing}
              disabled={!hasConnections}
              className="gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Sincronizar Agora
            </Button>
          </div>

          {metaFeedback && (
            <Card
              className={cn(
                'p-4',
                metaFeedback.status === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              )}
            >
              {metaFeedback.message}
            </Card>
          )}

          {errorMessage && (
            <Card className="border-red-200 bg-red-50 p-4 text-red-700">{errorMessage}</Card>
          )}

          <Card>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <CardTitle>Contas Conectadas</CardTitle>
                <CardDescription>
                  Cada conexão é vinculada ao `profile_id` ativo e sincronizada somente via Edge
                  Functions.
                </CardDescription>
              </div>
              <Badge variant={hasConnections ? 'success' : 'default'}>
                {hasConnections ? `${connections.length} conectada(s)` : 'Nenhuma conexão'}
              </Badge>
            </div>

            {!hasConnections && !isLoading ? (
              <EmptyState
                title="Nenhuma conta do Instagram conectada"
                description="Conecte uma conta Business vinculada a uma página do Facebook para liberar métricas reais no módulo de performance."
                icon={Instagram}
                action={
                  <Button onClick={() => void handleConnectInstagram()} isLoading={isConnecting}>
                    Conectar Instagram
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {connections.map((connection) => {
                  const status = formatConnectionStatus(connection);

                  return (
                    <Card key={connection.id} className="border-gray-200 bg-gray-50/40">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                            {connection.profile_picture_url ? (
                              <img
                                src={connection.profile_picture_url}
                                alt={connection.username || 'Instagram'}
                                className="h-12 w-12 rounded-full object-cover"
                              />
                            ) : (
                              <Instagram className="h-5 w-5 text-brand" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary">
                              @{connection.username || connection.instagram_user_id}
                            </p>
                            <p className="text-xs text-text-secondary">
                              IG User ID: {connection.instagram_user_id}
                            </p>
                          </div>
                        </div>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-text-secondary">
                        <p>Página vinculada: {connection.page_id}</p>
                        <p>
                          Última sincronização:{' '}
                          {connection.last_synced_at
                            ? new Date(connection.last_synced_at).toLocaleString()
                            : 'Ainda não sincronizada'}
                        </p>
                        {connection.token_expires_at && (
                          <p>
                            Token expira em:{' '}
                            {new Date(connection.token_expires_at).toLocaleDateString()}
                          </p>
                        )}
                        {connection.last_sync_error && (
                          <p className="text-red-600">{connection.last_sync_error}</p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <Card key={metric.label}>
                <p className="mb-1 text-sm text-text-secondary">{metric.label}</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-2xl font-bold text-text-primary">{metric.value}</h3>
                  <div
                    className={cn(
                      'flex items-center gap-1 text-xs font-medium',
                      metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {metric.change}
                    <ArrowUpRight className="h-3 w-3" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Card className="flex h-80 flex-col">
              <CardTitle className="mb-4">Crescimento de Audiência</CardTitle>
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
                {isLoading ? (
                  <p className="text-text-secondary">Carregando métricas...</p>
                ) : hasAccountData ? (
                  <div className="flex h-full w-full flex-col justify-center p-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-text-secondary">Crescimento de Seguidores</p>
                        <p className="text-3xl font-bold text-text-primary">
                          {followerGrowth >= 0 ? '+' : ''}
                          {formatCompactNumber(followerGrowth)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-secondary">Alcance Total</p>
                        <p className="text-2xl font-semibold text-text-primary">
                          {formatCompactNumber(summary.reach)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-text-secondary">Visualizações de Perfil</p>
                        <p className="text-2xl font-semibold text-text-primary">
                          {formatCompactNumber(summary.profileViews)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="Ainda não há dados diários"
                    description="Depois de conectar a Meta e rodar a sincronização, o PostHub passa a preencher os snapshots diários da conta."
                    icon={Activity}
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!hasConnections}
                        onClick={() => void handleSyncMetrics()}
                      >
                        Sincronizar agora
                      </Button>
                    }
                  />
                )}
              </div>
            </Card>

            <Card className="flex h-80 flex-col">
              <CardTitle className="mb-4">Resumo de Engajamento</CardTitle>
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
                {isLoading ? (
                  <p className="text-text-secondary">Carregando métricas...</p>
                ) : hasMediaData ? (
                  <div className="flex h-full w-full flex-col justify-center p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary">Impressões</span>
                        <span className="font-semibold text-text-primary">
                          {formatCompactNumber(summary.impressions)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary">Taxa Média de Engajamento</span>
                        <span className="font-semibold text-text-primary">
                          {formatPercent(summary.engagementRate)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary">Visualizações de Perfil</span>
                        <span className="font-semibold text-text-primary">
                          {formatCompactNumber(summary.profileViews)}
                        </span>
                      </div>
                      <div className="pt-3">
                        <Badge variant="brand">Métricas reais via Instagram Graph API</Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="Dados insuficientes"
                    description="Quando a Meta devolver métricas por mídia, os posts com insights reais vão aparecer aqui."
                    icon={BarChart3}
                  />
                )}
              </div>
            </Card>
          </div>

          <Card>
            <CardTitle className="mb-6">Posts com Melhor Performance</CardTitle>

            {!isLoading && !hasData ? (
              <EmptyState
                title="Nenhuma métrica de post encontrada"
                description="Conecte a conta, sincronize os dados e o ranking dos melhores posts será preenchido aqui."
                icon={Activity}
              />
            ) : isLoading ? (
              <div className="py-10 text-center text-text-secondary">Carregando posts...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-text-secondary">
                      <th className="pb-4 font-medium">Conteúdo</th>
                      <th className="pb-4 font-medium">Plataforma</th>
                      <th className="pb-4 font-medium">Alcance</th>
                      <th className="pb-4 font-medium">Engajamento</th>
                      <th className="pb-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topPosts.map((post) => (
                      <tr key={post.id} className="group transition-colors hover:bg-gray-50/50">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded bg-gray-100" />
                            <div>
                              <p className="line-clamp-1 font-medium text-text-primary">
                                {post.title}
                              </p>
                              <p className="text-xs text-text-secondary">
                                {new Date(post.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">{post.platform}</td>
                        <td className="py-4">{formatCompactNumber(post.reach)}</td>
                        <td className="py-4">{formatPercent(post.engagement)}</td>
                        <td className="py-4">
                          <Badge variant="success">Sincronizado</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
