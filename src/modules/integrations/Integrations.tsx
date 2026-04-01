import * as React from 'react';
import { 
  Share2, 
  Plus, 
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Zap,
  MessageSquare,
  Database,
  Mail
} from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Badge } from '../../shared/components/Badge';

const INTEGRATIONS = [
  { id: '1', name: 'Instagram', description: 'Publish posts, reels and stories directly.', category: 'Social Media', status: 'connected', icon: '📸' },
  { id: '2', name: 'TikTok', description: 'Automate your video uploads and trends.', category: 'Social Media', status: 'connected', icon: '🎵' },
  { id: '3', name: 'YouTube', description: 'Schedule shorts and manage channel data.', category: 'Social Media', status: 'connected', icon: '📺' },
  { id: '4', name: 'Slack', description: 'Get notifications for approvals and status.', category: 'Communication', status: 'not_connected', icon: '💬' },
  { id: '5', name: 'Google Drive', description: 'Import media directly from your drive.', category: 'Storage', status: 'not_connected', icon: '📁' },
  { id: '6', name: 'Mailchimp', description: 'Sync your content with your newsletters.', category: 'Marketing', status: 'not_connected', icon: '📧' },
];

export const Integrations = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Share2 className="h-6 w-6 text-brand" />
            Integrations
          </h1>
          <p className="text-text-secondary">Connect PostHub with your favorite tools and platforms.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Request Integration
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-96">
          <Input placeholder="Search integrations..." icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          {['All', 'Social Media', 'Communication', 'Storage', 'Marketing'].map(cat => (
            <Button key={cat} variant={cat === 'All' ? 'primary' : 'ghost'} size="sm" className="whitespace-nowrap">
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {INTEGRATIONS.map((app) => (
          <Card key={app.id} className="group hover:border-brand/50 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                {app.icon}
              </div>
              <Badge variant={app.status === 'connected' ? 'success' : 'default'}>
                {app.status === 'connected' ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
            
            <h3 className="font-bold text-text-primary mb-1">{app.name}</h3>
            <p className="text-xs text-text-secondary mb-6 line-clamp-2">{app.description}</p>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{app.category}</span>
              <Button variant={app.status === 'connected' ? 'outline' : 'primary'} size="sm" className="gap-2 h-8">
                {app.status === 'connected' ? (
                  <>Settings</>
                ) : (
                  <>Connect <ExternalLink className="h-3 w-3" /></>
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Featured Integration */}
      <Card className="bg-gradient-to-r from-brand to-blue-600 text-white border-none p-8 overflow-hidden relative">
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-xs font-bold mb-4">
            <Zap className="h-3 w-3" />
            NEW INTEGRATION
          </div>
          <h2 className="text-3xl font-bold mb-4">PostHub for Slack</h2>
          <p className="text-white/80 mb-6">
            Get real-time notifications for content approvals, comments, and publishing status directly in your Slack channels.
          </p>
          <Button className="bg-white text-brand hover:bg-white/90 gap-2">
            Add to Slack
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 h-full w-1/2 opacity-10 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-[-20%] right-[10%] h-48 w-48 rounded-full bg-white blur-2xl" />
        </div>
      </Card>
    </div>
  );
};
