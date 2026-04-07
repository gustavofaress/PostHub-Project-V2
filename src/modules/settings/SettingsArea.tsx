import * as React from 'react';
import { Settings as SettingsIcon, CreditCard, Share2, Users, Zap } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Badge } from '../../shared/components/Badge';
import { useAuth } from '../../app/context/AuthContext';
import { LockedModuleState } from '../../shared/components/LockedModuleState';
import { hasAccess } from '../../shared/constants/plans';

export const SettingsArea = () => {
  const { user } = useAuth();
  const canUseTeamMembers = hasAccess(user?.currentPlan, 'team', user?.isAdmin);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Configurações do Workspace</h1>
        <p className="text-text-secondary">Configure seu workspace e as preferências da equipe.</p>
      </div>

      <div className="space-y-6">
        {/* Subscription */}
        <Card>
          <div className="flex items-start justify-between mb-6">
            <div>
              <CardTitle>Plano Atual</CardTitle>
              <CardDescription>Você está atualmente no Plano Pro.</CardDescription>
            </div>
            <Badge variant="brand">Ativo</Badge>
          </div>
          
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">Uso Mensal</span>
              <span className="text-sm text-text-secondary">84% utilizado</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-[84%] bg-brand" />
            </div>
            <p className="mt-2 text-xs text-text-secondary">840 de 1.000 roteiros gerados neste mês.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Gerenciar Cobrança
            </Button>
            <Button className="gap-2">
              <Zap className="h-4 w-4" />
              Fazer Upgrade do Plano
            </Button>
          </div>
        </Card>

        {/* Integrations */}
        <Card>
          <CardTitle className="mb-2">Integrações</CardTitle>
          <CardDescription className="mb-6">Conecte suas contas de redes sociais ao PostHub.</CardDescription>
          
          <div className="space-y-4">
            {[
              { name: 'Instagram', status: 'Conectado', icon: '📸' },
              { name: 'TikTok', status: 'Conectado', icon: '🎵' },
              { name: 'LinkedIn', status: 'Não Conectado', icon: '💼' },
              { name: 'Twitter / X', status: 'Não Conectado', icon: '🐦' },
            ].map(platform => (
              <div key={platform.name} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{platform.icon}</span>
                  <span className="font-medium text-text-primary">{platform.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-xs', platform.status === 'Conectado' ? 'text-green-600' : 'text-gray-400')}>
                    {platform.status}
                  </span>
                  <Button variant="ghost" size="sm">
                    {platform.status === 'Conectado' ? 'Desconectar' : 'Conectar'}
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
              <CardTitle>Membros da Equipe</CardTitle>
              <CardDescription>Convide sua equipe para colaborar no conteúdo.</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2" disabled={!canUseTeamMembers}>
              <Users className="h-4 w-4" />
              Convidar Membro
            </Button>
          </div>

          {!canUseTeamMembers ? (
            <LockedModuleState
              feature="team"
              compact
              title="Gerenciar equipe é exclusivo do plano PRO"
              description="Traga sua equipe para a mesma operação, com acessos por email e controle claro sobre quem pode atuar em cada etapa."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs">GF</div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Gustavo Fares (Você)</p>
                    <p className="text-xs text-text-secondary">Proprietário</p>
                  </div>
                </div>
                <Badge>Admin</Badge>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
