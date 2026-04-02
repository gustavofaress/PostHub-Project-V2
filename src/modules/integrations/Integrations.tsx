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
  { id: '1', name: 'Instagram', description: 'Publique posts, reels e stories diretamente.', category: 'Redes Sociais', status: 'connected', icon: '📸' },
  { id: '2', name: 'TikTok', description: 'Automatize seus uploads de vídeo e tendências.', category: 'Redes Sociais', status: 'connected', icon: '🎵' },
  { id: '3', name: 'YouTube', description: 'Agende shorts e gerencie os dados do canal.', category: 'Redes Sociais', status: 'connected', icon: '📺' },
  { id: '4', name: 'Slack', description: 'Receba notificações sobre aprovações e status.', category: 'Comunicação', status: 'not_connected', icon: '💬' },
  { id: '5', name: 'Google Drive', description: 'Importe mídias diretamente do seu drive.', category: 'Armazenamento', status: 'not_connected', icon: '📁' },
  { id: '6', name: 'Mailchimp', description: 'Sincronize seu conteúdo com suas newsletters.', category: 'Marketing', status: 'not_connected', icon: '📧' },
];

export const Integrations = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Share2 className="h-6 w-6 text-brand" />
            Integrações
          </h1>
          <p className="text-text-secondary">Conecte o PostHub às suas ferramentas e plataformas favoritas.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Solicitar Integração
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-96">
          <Input placeholder="Buscar integrações..." icon={<Search className="h-4 w-4" />} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          {['Todas', 'Redes Sociais', 'Comunicação', 'Armazenamento', 'Marketing'].map(cat => (
            <Button key={cat} variant={cat === 'Todas' ? 'primary' : 'ghost'} size="sm" className="whitespace-nowrap">
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
                {app.status === 'connected' ? 'Conectado' : 'Não Conectado'}
              </Badge>
            </div>
            
            <h3 className="font-bold text-text-primary mb-1">{app.name}</h3>
            <p className="text-xs text-text-secondary mb-6 line-clamp-2">{app.description}</p>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{app.category}</span>
              <Button variant={app.status === 'connected' ? 'outline' : 'primary'} size="sm" className="gap-2 h-8">
                {app.status === 'connected' ? (
                  <>Configurações</>
                ) : (
                  <>Conectar <ExternalLink className="h-3 w-3" /></>
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
            NOVA INTEGRAÇÃO
          </div>
          <h2 className="text-3xl font-bold mb-4">PostHub para Slack</h2>
          <p className="text-white/80 mb-6">
            Receba notificações em tempo real sobre aprovações de conteúdo, comentários e status de publicação diretamente nos seus canais do Slack.
          </p>
          <Button className="bg-white text-brand hover:bg-white/90 gap-2">
            Adicionar ao Slack
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
