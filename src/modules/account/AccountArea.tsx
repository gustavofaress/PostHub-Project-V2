import * as React from 'react';
import { User, Mail, Globe, Shield, Bell } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Avatar } from '../../shared/components/Avatar';
import { useAuth } from '../../app/context/AuthContext';

export const AccountArea = () => {
  const { user } = useAuth();

  const [website, setWebsite] = React.useState('');

  const fullName = user?.name?.trim() || 'Usuário';
  const email = user?.email || '';
  const onboarding = user?.onboarding;

  const nameParts = React.useMemo(() => fullName.split(' ').filter(Boolean), [fullName]);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'U';

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Configurações da Conta</h1>
        <p className="text-text-secondary">Gerencie suas informações pessoais e preferências.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="space-y-4">
          <Card className="flex flex-col items-center text-center">
            <Avatar fallback={initials} size="lg" className="mb-4 h-24 w-24" />
            <h3 className="font-bold text-text-primary">{fullName}</h3>
            <p className="mb-4 text-sm text-text-secondary">Proprietário da conta</p>
            <Button variant="outline" size="sm" className="w-full">
              Alterar foto
            </Button>
          </Card>

          <nav className="space-y-1">
            {[
              { label: 'Perfil', icon: User, active: true },
              { label: 'Segurança', icon: Shield, active: false },
              { label: 'Notificações', icon: Bell, active: false },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  item.active ? 'bg-brand/10 text-brand' : 'text-text-secondary hover:bg-gray-50'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardTitle className="mb-6">Informações Pessoais</CardTitle>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Nome" defaultValue={firstName} />
              <Input label="Sobrenome" defaultValue={lastName} />

              <div className="col-span-1 sm:col-span-2">
                <Input
                  label="Endereço de e-mail"
                  defaultValue={email}
                  icon={<Mail className="h-4 w-4" />}
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <Input
                  label="Website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  icon={<Globe className="h-4 w-4" />}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button>Salvar alterações</Button>
            </div>
          </Card>

          <Card>
            <CardTitle className="mb-6">Perfil de Operação</CardTitle>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[#6B7280]">Modelo de trabalho</p>
                <p className="text-base font-semibold text-[#111827]">
                  {onboarding?.work_model || '-'}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-[#6B7280]">Tamanho da operação</p>
                <p className="text-base font-semibold text-[#111827]">
                  {onboarding?.operation_size || '-'}
                </p>
              </div>

              <div className="col-span-1 space-y-1 sm:col-span-2">
                <p className="text-sm font-medium text-[#6B7280]">Operação de conteúdo hoje</p>
                <p className="text-base font-semibold text-[#111827]">
                  {onboarding?.current_process || '-'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-red-100 bg-red-50/30">
            <CardTitle className="mb-2 text-red-600">Excluir conta</CardTitle>
            <CardDescription className="mb-4">
              Depois de excluir sua conta, não será possível voltar atrás. Tenha certeza antes de
              continuar.
            </CardDescription>
            <Button variant="danger" size="sm">
              Excluir conta
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
