import * as React from 'react';
import { 
  Clock, 
  Plus, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Instagram,
  Video,
  Youtube,
  MoreVertical,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { cn } from '../../shared/utils/cn';

const SCHEDULED_POSTS = [
  { id: '1', title: 'Motivação da manhã', time: '09:00', date: 'Hoje', platform: 'Instagram', status: 'scheduled', thumbnail: 'https://picsum.photos/seed/sch1/400/400' },
  { id: '2', title: 'Demonstração do produto', time: '14:30', date: 'Hoje', platform: 'TikTok', status: 'scheduled', thumbnail: 'https://picsum.photos/seed/sch2/400/400' },
  { id: '3', title: 'Resumo da semana', time: '18:00', date: 'Amanhã', platform: 'YouTube', status: 'pending', thumbnail: 'https://picsum.photos/seed/sch3/400/400' },
  { id: '4', title: 'Anúncio de nova funcionalidade', time: '11:00', date: '2 de abr. de 2024', platform: 'Instagram', status: 'scheduled', thumbnail: 'https://picsum.photos/seed/sch4/400/400' },
];

export const Scheduler = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Clock className="h-6 w-6 text-brand" />
            Agendador de Conteúdo
          </h1>
          <p className="text-text-secondary">Agende e automatize suas publicações nas redes sociais.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Agendar Post
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content: Queue */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="font-bold text-text-primary">Fila de Publicações</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">Abril 2024</span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {SCHEDULED_POSTS.map((post) => (
                <div key={post.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors group">
                  <div className="h-16 w-16 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                    <img src={post.thumbnail} alt={post.title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-text-primary truncate">{post.title}</h3>
                      <Badge variant={post.status === 'scheduled' ? 'success' : 'warning'} className="text-[10px] py-0 px-1.5">
                        {post.status === 'scheduled' ? 'AGENDADO' : 'PENDENTE'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-secondary">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {post.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.time}
                      </div>
                      <div className="flex items-center gap-1">
                        {post.platform === 'Instagram' && <Instagram className="h-3 w-3" />}
                        {post.platform === 'TikTok' && <Video className="h-3 w-3" />}
                        {post.platform === 'YouTube' && <Youtube className="h-3 w-3" />}
                        {post.platform}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm">Editar</Button>
                    <button className="p-2 text-gray-400 hover:text-text-primary">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar: Insights & Settings */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <h3 className="font-bold text-text-primary mb-4">Melhores Horários para Postar</h3>
            <p className="text-xs text-text-secondary mb-6">Com base na atividade da sua audiência nos últimos 30 dias.</p>
            
            <div className="space-y-4">
              {[
                { platform: 'Instagram', time: '11:00', engagement: 'Alto' },
                { platform: 'TikTok', time: '20:30', engagement: 'Muito Alto' },
                { platform: 'YouTube', time: '16:00', engagement: 'Médio' },
              ].map(item => (
                <div key={item.platform} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
                      {item.platform === 'Instagram' && <Instagram className="h-4 w-4 text-pink-600" />}
                      {item.platform === 'TikTok' && <Video className="h-4 w-4 text-black" />}
                      {item.platform === 'YouTube' && <Youtube className="h-4 w-4 text-red-600" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary">{item.platform}</p>
                      <p className="text-[10px] text-text-secondary">{item.time}</p>
                    </div>
                  </div>
                  <Badge variant="success" className="text-[10px]">{item.engagement}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-brand text-white border-none">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="font-bold">Publicação Automática</h3>
            </div>
            <p className="text-sm text-white/80 mb-4">
              Suas contas estão conectadas e prontas para publicação automática. Nenhuma ação manual é necessária!
            </p>
            <div className="flex items-center gap-2 text-xs font-medium bg-white/10 p-2 rounded-lg">
              <AlertCircle className="h-3 w-3" />
              Próxima sincronização em 14 minutos
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
