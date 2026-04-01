import * as React from 'react';
import { Settings as SettingsIcon, CreditCard, Share2, Users, Zap } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';

export const SettingsArea = () => {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Workspace Settings</h1>
        <p className="text-text-secondary">Configure your workspace and team preferences.</p>
      </div>

      <div className="space-y-6">
        {/* Subscription */}
        <Card>
          <div className="flex items-start justify-between mb-6">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>You are currently on the Pro Plan.</CardDescription>
            </div>
            <Badge variant="brand">Active</Badge>
          </div>
          
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">Monthly Usage</span>
              <span className="text-sm text-text-secondary">84% used</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-[84%] bg-brand" />
            </div>
            <p className="mt-2 text-xs text-text-secondary">840 of 1,000 generated scripts this month.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Manage Billing
            </Button>
            <Button className="gap-2">
              <Zap className="h-4 w-4" />
              Upgrade Plan
            </Button>
          </div>
        </Card>

        {/* Integrations */}
        <Card>
          <CardTitle className="mb-2">Integrations</CardTitle>
          <CardDescription className="mb-6">Connect your social media accounts to PostHub.</CardDescription>
          
          <div className="space-y-4">
            {[
              { name: 'Instagram', status: 'Connected', icon: '📸' },
              { name: 'TikTok', status: 'Connected', icon: '🎵' },
              { name: 'LinkedIn', status: 'Not Connected', icon: '💼' },
              { name: 'Twitter / X', status: 'Not Connected', icon: '🐦' },
            ].map(platform => (
              <div key={platform.name} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{platform.icon}</span>
                  <span className="font-medium text-text-primary">{platform.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-xs', platform.status === 'Connected' ? 'text-green-600' : 'text-gray-400')}>
                    {platform.status}
                  </span>
                  <Button variant="ghost" size="sm">
                    {platform.status === 'Connected' ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Team */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Invite your team to collaborate on content.</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Users className="h-4 w-4" />
              Invite Member
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs">GF</div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Gustavo Fares (You)</p>
                  <p className="text-xs text-text-secondary">Owner</p>
                </div>
              </div>
              <Badge>Admin</Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
