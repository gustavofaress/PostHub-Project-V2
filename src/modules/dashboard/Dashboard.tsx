import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  MessageSquare,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Lightbulb,
  FileText,
  CalendarDays,
} from 'lucide-react';
import { Card, CardTitle } from '../../shared/components/Card';
import { Badge } from '../../shared/components/Badge';
import { Button } from '../../shared/components/Button';
import { EmptyState } from '../../shared/components/EmptyState';
import { useApp } from '../../app/context/AppContext';
import { useProfile } from '../../app/context/ProfileContext';
import { useAuth } from '../../app/context/AuthContext';
import { supabase } from '../../shared/utils/supabase';

type WorkspaceModule = 'ideas' | 'calendar' | 'scripts';

interface StatCard {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
}

interface DashboardActivityItem {
  id: string;
  type: string;
  title: string;
  time: string;
  status: 'success' | 'info' | 'warning';
  createdAt: string;
}

interface IdeaRow {
  id: string;
  title: string;
  updated_at: string;
}

interface ScriptDraftRow {
  id: string;
  title: string;
  updated_at: string;
}

interface EditorialCalendarRow {
  id: string;
  title: string;
  status: string | null;
  updated_at: string;
  scheduled_date?: string | null;
}

interface ApprovalPostRow {
  id: string;
  title: string;
  status: string | null;
  updated_at: string;
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const hour = 1000 * 60 * 60;
  const day = hour * 24;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${minutes} min ago`;
  }

  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  if (diffMs < day * 2) return 'Yesterday';

  const days = Math.floor(diffMs / day);
  return `${days} days ago`;
}

export const Dashboard = () => {
  const { setActiveModule } = useApp();
  const { activeProfile } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [stats, setStats] = React.useState<StatCard[]>([
    { label: 'Ideas', value: '--', change: 'system', trend: 'up', icon: Lightbulb },
    { label: 'Scripts', value: '--', change: 'system', trend: 'up', icon: FileText },
    { label: 'Scheduled Posts', value: '--', change: 'system', trend: 'up', icon: CalendarDays },
    { label: 'Pending Reviews', value: '--', change: 'system', trend: 'up', icon: MessageSquare },
  ]);

  const [recentActivity, setRecentActivity] = React.useState<DashboardActivityItem[]>([]);
  const [contentStatus, setContentStatus] = React.useState({
    inProduction: 0,
    pendingReview: 0,
    published: 0,
  });

  const handleNavigate = (module: WorkspaceModule) => {
    setActiveModule(module);
    navigate(`/workspace/${module}`);
  };

  const loadDashboard = React.useCallback(async () => {
    if (!user?.id || !activeProfile?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [
        ideasResult,
        scriptsResult,
        calendarResult,
        approvalsResult,
      ] = await Promise.all([
        supabase
          .from('ideas')
          .select('id,title,updated_at', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('profile_id', activeProfile.id)
          .order('updated_at', { ascending: false }),

        supabase
          .from('script_drafts')
          .select('id,title,updated_at', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('profile_id', activeProfile.id)
          .order('updated_at', { ascending: false }),

        supabase
          .from('editorial_calendar')
          .select('id,title,status,updated_at,scheduled_date', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('profile_id', activeProfile.id)
          .order('updated_at', { ascending: false }),

        supabase
          .from('approval_posts')
          .select('id,title,status,updated_at', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('profile_id', activeProfile.id)
          .order('updated_at', { ascending: false }),
      ]);

      if (ideasResult.error) throw ideasResult.error;
      if (scriptsResult.error) throw scriptsResult.error;
      if (calendarResult.error) throw calendarResult.error;
      if (approvalsResult.error) throw approvalsResult.error;

      const ideas = (ideasResult.data ?? []) as IdeaRow[];
      const scripts = (scriptsResult.data ?? []) as ScriptDraftRow[];
      const calendar = (calendarResult.data ?? []) as EditorialCalendarRow[];
      const approvals = (approvalsResult.data ?? []) as ApprovalPostRow[];

      const scheduledPostsCount = calendar.filter((item) => item.scheduled_date).length;
      const pendingReviewsCount =
        calendar.filter((item) => item.status === 'Review').length +
        approvals.filter(
          (item) =>
            item.status === 'changes_requested' ||
            item.status === 'pending'
        ).length;

      setStats([
        {
          label: 'Ideas',
          value: String(ideasResult.count ?? ideas.length),
          change: 'active',
          trend: 'up',
          icon: Lightbulb,
        },
        {
          label: 'Scripts',
          value: String(scriptsResult.count ?? scripts.length),
          change: 'saved',
          trend: 'up',
          icon: FileText,
        },
        {
          label: 'Scheduled Posts',
          value: String(scheduledPostsCount),
          change: 'calendar',
          trend: 'up',
          icon: CalendarDays,
        },
        {
          label: 'Pending Reviews',
          value: String(pendingReviewsCount),
          change: 'attention',
          trend: pendingReviewsCount > 0 ? 'down' : 'up',
          icon: MessageSquare,
        },
      ]);

      setContentStatus({
        inProduction: calendar.filter((item) =>
          ['Draft', 'Planned'].includes(item.status || '')
        ).length,
        pendingReview: calendar.filter((item) => item.status === 'Review').length,
        published: calendar.filter((item) => item.status === 'Published').length,
      });

      const activity: DashboardActivityItem[] = [];

      ideas.slice(0, 3).forEach((item) => {
        activity.push({
          id: `idea-${item.id}`,
          type: 'idea',
          title: `New idea added: "${item.title}"`,
          time: formatRelativeDate(item.updated_at),
          status: 'info',
          createdAt: item.updated_at,
        });
      });

      scripts.slice(0, 3).forEach((item) => {
        activity.push({
          id: `script-${item.id}`,
          type: 'script',
          title: `Script updated: "${item.title}"`,
          time: formatRelativeDate(item.updated_at),
          status: 'info',
          createdAt: item.updated_at,
        });
      });

      calendar.slice(0, 4).forEach((item) => {
        activity.push({
          id: `calendar-${item.id}`,
          type: 'post',
          title:
            item.status === 'Published'
              ? `${item.title} was published`
              : `${item.title} updated in calendar`,
          time: formatRelativeDate(item.updated_at),
          status:
            item.status === 'Published'
              ? 'success'
              : item.status === 'Review'
              ? 'warning'
              : 'info',
          createdAt: item.updated_at,
        });
      });

      approvals.slice(0, 3).forEach((item) => {
        activity.push({
          id: `approval-${item.id}`,
          type: 'review',
          title:
            item.status === 'changes_requested'
              ? `Changes requested for "${item.title}"`
              : `Approval updated: "${item.title}"`,
          time: formatRelativeDate(item.updated_at),
          status: item.status === 'changes_requested' ? 'warning' : 'success',
          createdAt: item.updated_at,
        });
      });

      activity.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setRecentActivity(activity.slice(0, 6));
    } catch (error) {
      console.error('[Dashboard] Error loading dashboard:', error);
      setErrorMessage('Não foi possível carregar os dados do dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, activeProfile?.id]);

  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome back{activeProfile ? `, ${activeProfile.name}` : ''}!
          </h1>
          <p className="text-text-secondary">Here's what's happening with your content today.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">Download Report</Button>
          <Button onClick={() => handleNavigate('ideas')}>Create Content</Button>
        </div>
      </div>

      {errorMessage && (
        <Card className="border-red-200 bg-red-50 text-red-700 p-4">
          {errorMessage}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-brand/10 p-2 text-brand">
                <stat.icon className="h-5 w-5" />
              </div>
              <div
                className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                )}
              >
                {stat.change}
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-text-secondary">{stat.label}</p>
              <p className="text-2xl font-bold text-text-primary">
                {isLoading ? '...' : stat.value}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => handleNavigate('calendar')}>
              View All
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 text-sm text-text-secondary">Loading activity...</div>
          ) : recentActivity.length === 0 ? (
            <EmptyState
              title="No recent activity"
              description="As you create ideas, scripts, posts and approvals, activity will appear here."
              icon={Activity}
            />
          ) : (
            <div className="space-y-6">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div
                    className={cn(
                      'mt-1 h-2 w-2 rounded-full',
                      activity.status === 'success'
                        ? 'bg-green-500'
                        : activity.status === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-brand'
                    )}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">{activity.title}</p>
                    <p className="text-xs text-text-secondary">{activity.time}</p>
                  </div>
                  <Badge variant={activity.status as any}>{activity.type}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardTitle className="mb-4">Content Status</CardTitle>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Clock className="h-4 w-4" />
                  <span>In Production</span>
                </div>
                <span className="font-semibold">
                  {isLoading ? '...' : contentStatus.inProduction}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <AlertCircle className="h-4 w-4" />
                  <span>Pending Review</span>
                </div>
                <span className="font-semibold">
                  {isLoading ? '...' : contentStatus.pendingReview}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Published</span>
                </div>
                <span className="font-semibold">
                  {isLoading ? '...' : contentStatus.published}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              className="mt-6 w-full"
              onClick={() => handleNavigate('calendar')}
            >
              Go to Calendar
            </Button>
          </Card>

          <Card className="bg-brand text-white border-none">
            <h3 className="text-lg font-bold mb-2">Pro Tip</h3>
            <p className="text-sm text-white/80 mb-4">
              Keep your workflow moving: turn ideas into scripts, scripts into scheduled posts, and scheduled posts into published content.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="w-full bg-white text-brand hover:bg-white/90"
              onClick={() => handleNavigate('scripts')}
            >
              Try it now
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};