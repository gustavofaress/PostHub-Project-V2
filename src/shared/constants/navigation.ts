import * as React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Lightbulb, 
  Calendar, 
  Trello, 
  Settings, 
  User,
  LogOut,
  Plus,
  CheckCircle,
  BarChart3,
  MessageSquare,
  Clock,
  BookOpen,
  Share2,
  HelpCircle,
  CreditCard,
  Rocket
} from 'lucide-react';

export type WorkspaceModule = 
  | 'onboarding'
  | 'dashboard'
  | 'consultant'
  | 'scripts'
  | 'ideas'
  | 'approval'
  | 'calendar'
  | 'kanban'
  | 'scheduler'
  | 'performance'
  | 'references'
  | 'integrations'
  | 'settings'
  | 'account'
  | 'credits'
  | 'support';

export interface Profile {
  id: string;
  name: string;
  image?: string;
  handle: string;
}

export const MOCK_PROFILES: Profile[] = [
  { id: '1', name: 'Acme Corp', handle: '@acme_corp', image: 'https://picsum.photos/seed/acme/100/100' },
  { id: '2', name: 'Personal Brand', handle: '@gustavo_fares', image: 'https://picsum.photos/seed/gustavo/100/100' },
  { id: '3', name: 'Tech Agency', handle: '@tech_agency', image: 'https://picsum.photos/seed/tech/100/100' },
];

export interface NavSubItem {
  label: string;
  path: string;
}

export interface NavItem {
  id: WorkspaceModule;
  label: string;
  description?: string;
  icon: React.ElementType;
  path: string;
  subItems?: NavSubItem[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { 
        id: 'onboarding', 
        label: 'Setup Guide', 
        description: 'Configure your workspace and connect your social channels.',
        icon: Rocket, 
        path: '/workspace/onboarding',
        subItems: [
          { label: 'Welcome Tutorial', path: '/workspace/onboarding' },
          { label: 'Connect Accounts', path: '/workspace/onboarding?tab=accounts' },
          { label: 'Invite Team', path: '/workspace/onboarding?tab=team' },
          { label: 'Brand Kit Setup', path: '/workspace/onboarding?tab=brand' }
        ]
      },
      { 
        id: 'dashboard', 
        label: 'Workspace Overview', 
        description: 'Your central command for content operations and daily tasks.',
        icon: LayoutDashboard, 
        path: '/workspace/dashboard',
        subItems: [
          { label: 'Recent Activity', path: '/workspace/dashboard' },
          { label: 'Upcoming Deadlines', path: '/workspace/dashboard?tab=deadlines' },
          { label: 'Quick Actions', path: '/workspace/dashboard?tab=actions' },
          { label: 'Team Updates', path: '/workspace/dashboard?tab=updates' }
        ]
      },
      { 
        id: 'consultant', 
        label: 'AI Strategist', 
        description: 'Your creative partner for content strategy and brainstorming.',
        icon: MessageSquare, 
        path: '/workspace/consultant',
        subItems: [
          { label: 'New Strategy Session', path: '/workspace/consultant' },
          { label: 'Chat History', path: '/workspace/consultant?tab=history' },
          { label: 'Saved Prompts', path: '/workspace/consultant?tab=prompts' },
          { label: 'Brand Voice Settings', path: '/workspace/consultant?tab=voice' }
        ]
      },
    ]
  },
  {
    label: 'Content Creation',
    items: [
      { 
        id: 'scripts', 
        label: 'Script Studio', 
        description: 'Draft, format, and perfect scripts for short-form video content.',
        icon: FileText, 
        path: '/workspace/scripts',
        subItems: [
          { label: 'Script Wizard', path: '/workspace/scripts' },
          { label: 'AI Generation', path: '/workspace/scripts?tab=ai' },
          { label: 'Saved Drafts', path: '/workspace/scripts?tab=saved' },
          { label: 'Hook Library', path: '/workspace/scripts?tab=hooks' },
          { label: 'Templates', path: '/workspace/scripts?tab=templates' }
        ]
      },
      { 
        id: 'ideas', 
        label: 'Idea Vault', 
        description: 'Capture, organize, and prioritize your creative sparks.',
        icon: Lightbulb, 
        path: '/workspace/ideas',
        subItems: [
          { label: 'Idea Bank', path: '/workspace/ideas' },
          { label: 'Tags & Priorities', path: '/workspace/ideas?tab=tags' },
          { label: 'Content Inspiration', path: '/workspace/ideas?tab=inspiration' },
          { label: 'Trend Alerts', path: '/workspace/ideas?tab=trends' }
        ]
      },
      { 
        id: 'approval', 
        label: 'Review & Approval', 
        description: 'Streamline client and team sign-offs before publishing.',
        icon: CheckCircle, 
        path: '/workspace/approval',
        subItems: [
          { label: 'Send Post for Review', path: '/workspace/approval' },
          { label: 'Public Approval Link', path: '/workspace/approval?tab=links' },
          { label: 'Reviewer Feedback', path: '/workspace/approval?tab=feedback' },
          { label: 'Approval History', path: '/workspace/approval?tab=history' }
        ]
      },
    ]
  },
  {
    label: 'Management',
    items: [
      { 
        id: 'calendar', 
        label: 'Editorial Calendar', 
        description: 'Visualize and orchestrate your entire content pipeline.',
        icon: Calendar, 
        path: '/workspace/calendar',
        subItems: [
          { label: 'Editorial Planning', path: '/workspace/calendar' },
          { label: 'Monthly View', path: '/workspace/calendar?view=month' },
          { label: 'Content Organization', path: '/workspace/calendar?view=org' },
          { label: 'Campaigns', path: '/workspace/calendar?view=campaigns' }
        ]
      },
      { 
        id: 'kanban', 
        label: 'Production Board', 
        description: 'Track content status from ideation to final delivery.',
        icon: Trello, 
        path: '/workspace/kanban',
        subItems: [
          { label: 'Active Sprints', path: '/workspace/kanban' },
          { label: 'Review Stage', path: '/workspace/kanban?tab=review' },
          { label: 'Ready to Publish', path: '/workspace/kanban?tab=ready' },
          { label: 'Archived Tasks', path: '/workspace/kanban?tab=archived' }
        ]
      },
      { 
        id: 'scheduler', 
        label: 'Auto-Publisher', 
        description: 'Schedule and automatically publish across all platforms.',
        icon: Clock, 
        path: '/workspace/scheduler',
        subItems: [
          { label: 'Publishing Queue', path: '/workspace/scheduler' },
          { label: 'Draft Posts', path: '/workspace/scheduler?tab=drafts' },
          { label: 'Time Slots', path: '/workspace/scheduler?tab=slots' },
          { label: 'Failed Posts', path: '/workspace/scheduler?tab=failed' }
        ]
      },
    ]
  },
  {
    label: 'Strategy & Growth',
    items: [
      { 
        id: 'performance', 
        label: 'Analytics & Insights', 
        description: 'Measure impact, track growth, and optimize your strategy.',
        icon: BarChart3, 
        path: '/workspace/performance',
        subItems: [
          { label: 'Cross-Platform Overview', path: '/workspace/performance' },
          { label: 'Audience Demographics', path: '/workspace/performance?tab=audience' },
          { label: 'Top Performing Posts', path: '/workspace/performance?tab=top' },
          { label: 'Custom Reports', path: '/workspace/performance?tab=reports' }
        ]
      },
      { 
        id: 'references', 
        label: 'Swipe File', 
        description: 'Curate inspiring content and track competitor strategies.',
        icon: BookOpen, 
        path: '/workspace/references',
        subItems: [
          { label: 'Saved Links', path: '/workspace/references' },
          { label: 'Competitor Watchlist', path: '/workspace/references?tab=competitors' },
          { label: 'Audio Library', path: '/workspace/references?tab=audio' },
          { label: 'Visual Assets', path: '/workspace/references?tab=assets' }
        ]
      },
    ]
  },
  {
    label: 'System',
    items: [
      { 
        id: 'integrations', 
        label: 'Connections', 
        description: 'Manage linked social accounts and third-party tools.',
        icon: Share2, 
        path: '/workspace/integrations',
        subItems: [
          { label: 'Social Platforms', path: '/workspace/integrations' },
          { label: 'Cloud Storage', path: '/workspace/integrations?tab=storage' },
          { label: 'API Webhooks', path: '/workspace/integrations?tab=webhooks' }
        ]
      },
      { 
        id: 'settings', 
        label: 'Workspace Settings', 
        description: 'Configure your environment, team roles, and billing.',
        icon: Settings, 
        path: '/workspace/settings',
        subItems: [
          { label: 'General Preferences', path: '/workspace/settings' },
          { label: 'Team Management', path: '/workspace/settings?tab=team' },
          { label: 'Billing & Plans', path: '/workspace/settings?tab=billing' },
          { label: 'Notifications', path: '/workspace/settings?tab=notifications' }
        ]
      },
      { 
        id: 'account', 
        label: 'Personal Profile', 
        description: 'Manage your personal details and security settings.',
        icon: User, 
        path: '/workspace/account',
        subItems: [
          { label: 'Profile Details', path: '/workspace/account' },
          { label: 'Security & Password', path: '/workspace/account?tab=security' },
          { label: 'Active Sessions', path: '/workspace/account?tab=sessions' }
        ]
      },
      { 
        id: 'credits', 
        label: 'AI Usage', 
        description: 'Monitor your AI generation credits and limits.',
        icon: CreditCard, 
        path: '/workspace/credits',
        subItems: [
          { label: 'Current Balance', path: '/workspace/credits' },
          { label: 'Usage History', path: '/workspace/credits?tab=history' },
          { label: 'Upgrade Plan', path: '/workspace/credits?tab=upgrade' }
        ]
      },
      { 
        id: 'support', 
        label: 'Help Center', 
        description: 'Access tutorials, documentation, and customer support.',
        icon: HelpCircle, 
        path: '/workspace/support',
        subItems: [
          { label: 'Knowledge Base', path: '/workspace/support' },
          { label: 'Video Tutorials', path: '/workspace/support?tab=videos' },
          { label: 'Contact Support', path: '/workspace/support?tab=contact' },
          { label: 'Feature Requests', path: '/workspace/support?tab=requests' }
        ]
      },
    ]
  }
];
