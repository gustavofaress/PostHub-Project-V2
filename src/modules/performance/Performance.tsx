import * as React from 'react';
import {
  BarChart3,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import { Card, CardTitle } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { EmptyState } from '../../shared/components/EmptyState';
import { useProfile } from '../../app/context/ProfileContext';
import { useAuth } from '../../app/context/AuthContext';
import { supabase } from '../../shared/utils/supabase';

interface InstagramMetricRow {
  id: string;
  user_id?: string | null;
  customer_id: string;
  profile_id: string | null;
  page_id?: string | null;
  conta_id?: number | null;
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
  access_token?: string | null;
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

function cn(...inputs: any[]) {
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

  const currentStart = startOfDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
  );

  const currentRowsRaw = rows.filter((row) => {
    const d = getMetricDate(row);
    return d >= currentStart;
  });

  const currentRows = currentRowsRaw.length > 0 ? currentRowsRaw : rows;

  const sumBy = (items: InstagramMetricRow[], getter: (row: InstagramMetricRow) => number) =>
    items.reduce((acc, item) => acc + getter(item), 0);

  const avgBy = (items: InstagramMetricRow[], getter: (row: InstagramMetricRow) => number) => {
    if (!items.length) return 0;
    return sumBy(items, getter) / items.length;
  };

  const currentRowsSorted = [...currentRows].sort(
    (a, b) => getMetricDate(a).getTime() - getMetricDate(b).getTime()
  );

  const followerGrowth =
    currentRowsSorted.length >= 2
      ? getFollowers(currentRowsSorted[currentRowsSorted.length - 1]) -
        getFollowers(currentRowsSorted[0])
      : currentRowsSorted.length === 1
      ? getFollowers(currentRowsSorted[0])
      : 0;

  const totalLikes = sumBy(currentRows, (row) => safeNumber(row.likes));
  const totalComments = sumBy(currentRows, (row) => safeNumber(row.comments));
  const totalAccountsEngaged = sumBy(currentRows, (row) => safeNumber(row.accounts_engaged));
  const totalSavesAndShares = sumBy(
    currentRows,
    (row) => safeNumber(row.saves) + safeNumber(row.shares)
  );

  const totalReach = sumBy(currentRows, getReach);
  const totalImpressions = sumBy(currentRows, getImpressions);
  const totalProfileViews = sumBy(currentRows, getProfileViews);
  const avgEngagementRate = avgBy(currentRows, getEngagementRate);

  const metrics: MetricCard[] = [
    {
      label: 'Likes',
      value: formatCompactNumber(totalLikes),
      change: `${currentRows.length} registros`,
      trend: 'up',
    },
    {
      label: 'Comments',
      value: formatCompactNumber(totalComments),
      change: `${currentRows.length} registros`,
      trend: 'up',
    },
    {
      label: 'Accounts Engaged',
      value: formatCompactNumber(totalAccountsEngaged),
      change: `${currentRows.length} registros`,
      trend: 'up',
    },
    {
      label: 'Saves + Shares',
      value: formatCompactNumber(totalSavesAndShares),
      change: `${currentRows.length} registros`,
      trend: 'up',
    },
  ];

  const summary: MetricsSummary = {
    reach: totalReach,
    impressions: totalImpressions,
    engagementRate: avgEngagementRate,
    profileViews: totalProfileViews,
  };

  const topPosts: TopPostRow[] = rows
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

  return { metrics, topPosts, summary, followerGrowth };
}

export const Performance = () => {
  const { activeProfile } = useProfile();
  const { user } = useAuth();

  const [rows, setRows] = React.useState<InstagramMetricRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loadMetrics = React.useCallback(async () => {
    if (!supabase || !user?.id || !activeProfile?.id) {
      setRows([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase
        .from('instagram_metrics')
        .select('*')
        .eq('customer_id', user.id)
        .eq('profile_id', activeProfile.id)
        .order('data', { ascending: false });

      if (error) throw error;

      setRows((data ?? []) as InstagramMetricRow[]);
    } catch (error) {
      console.error('[Performance] Error loading instagram metrics:', error);
      setRows([]);
      setErrorMessage('Não foi possível carregar as métricas do Instagram para este perfil.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, activeProfile?.id]);

  React.useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const { metrics, topPosts, summary, followerGrowth } = React.useMemo(
    () => calculateMetrics(rows),
    [rows]
  );

  const hasData = rows.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-brand" />
            Performance Analytics
          </h1>
          <p className="text-text-secondary">Track your content impact and audience growth.</p>
          {activeProfile && (
            <p className="text-sm text-text-secondary mt-1">
              Perfil ativo: <span className="font-medium">{activeProfile.name}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">Last 30 Days</Button>
          <Button onClick={() => void loadMetrics()}>Refresh Data</Button>
        </div>
      </div>

      {errorMessage && (
        <Card className="border-red-200 bg-red-50 text-red-700 p-4">
          {errorMessage}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <p className="text-sm text-text-secondary mb-1">{metric.label}</p>
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
        <Card className="h-80 flex flex-col">
          <CardTitle className="mb-4">Audience Growth</CardTitle>
          <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
            {isLoading ? (
              <p className="text-text-secondary">Carregando métricas...</p>
            ) : hasData ? (
              <div className="w-full h-full p-6 flex flex-col justify-center">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-text-secondary">Follower Growth</p>
                    <p className="text-3xl font-bold text-text-primary">
                      {followerGrowth >= 0 ? '+' : ''}
                      {formatCompactNumber(followerGrowth)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Total Reach</p>
                    <p className="text-2xl font-semibold text-text-primary">
                      {formatCompactNumber(summary.reach)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Profile Views</p>
                    <p className="text-2xl font-semibold text-text-primary">
                      {formatCompactNumber(summary.profileViews)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No data available yet"
                description="Connect your Instagram account and sync metrics to see audience growth over time."
                icon={Activity}
                action={<Button variant="outline" size="sm">Connect Accounts</Button>}
              />
            )}
          </div>
        </Card>

        <Card className="h-80 flex flex-col">
          <CardTitle className="mb-4">Engagement Summary</CardTitle>
          <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
            {isLoading ? (
              <p className="text-text-secondary">Carregando métricas...</p>
            ) : hasData ? (
              <div className="w-full h-full p-6 flex flex-col justify-center">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Impressions</span>
                    <span className="font-semibold text-text-primary">
                      {formatCompactNumber(summary.impressions)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Average Engagement Rate</span>
                    <span className="font-semibold text-text-primary">
                      {formatPercent(summary.engagementRate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Profile Views</span>
                    <span className="font-semibold text-text-primary">
                      {formatCompactNumber(summary.profileViews)}
                    </span>
                  </div>
                  <div className="pt-3">
                    <Badge variant="brand">Instagram Metrics</Badge>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Not enough data"
                description="Publish more content and sync your Instagram metrics to generate insights."
                icon={BarChart3}
              />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle className="mb-6">Top Performing Posts</CardTitle>

        {!isLoading && !hasData ? (
          <EmptyState
            title="No post metrics found"
            description="When Instagram metrics are available for this profile, your top posts will appear here."
            icon={Activity}
          />
        ) : isLoading ? (
          <div className="py-10 text-center text-text-secondary">Carregando posts...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-text-secondary">
                  <th className="pb-4 font-medium">Content</th>
                  <th className="pb-4 font-medium">Platform</th>
                  <th className="pb-4 font-medium">Reach</th>
                  <th className="pb-4 font-medium">Engagement</th>
                  <th className="pb-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topPosts.map((post) => (
                  <tr key={post.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-gray-100" />
                        <div>
                          <p className="font-medium text-text-primary line-clamp-1">
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
                      <Badge variant="success">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};