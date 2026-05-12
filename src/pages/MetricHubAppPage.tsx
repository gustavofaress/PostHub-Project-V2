import * as React from 'react';
import { ArrowLeft, LayoutDashboard, LogOut, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../app/context/AuthContext';
import { useProfile } from '../app/context/ProfileContext';
import { MetricHubDashboard } from '../modules/performance/MetricHubDashboard';
import { Badge } from '../shared/components/Badge';
import { Button } from '../shared/components/Button';
import { Card } from '../shared/components/Card';
import { EmptyState } from '../shared/components/EmptyState';

export const MetricHubAppPage = () => {
  const { user, logout } = useAuth();
  const { activeProfile, profiles, setActiveProfile, isLoadingProfiles } = useProfile();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#F3F8FC_0%,#F8FBFD_100%)] px-4 py-4 text-text-primary sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="overflow-hidden rounded-[34px] border border-[#D8E8F5] bg-[linear-gradient(135deg,#03111E_0%,#0A1D30_55%,#102743_100%)] p-5 text-white shadow-[0_24px_70px_rgba(3,17,30,0.24)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/metric-hub"
              className="inline-flex items-center gap-2 text-sm font-medium text-white/74 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para a landing
            </Link>

            <div className="flex flex-wrap gap-2">
              <Link to="/workspace/dashboard">
                <Button
                  variant="secondary"
                  className="gap-2 border-white/10 bg-white/8 text-white hover:bg-white/12"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Workspace
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="gap-2 text-white/78 hover:bg-white/10 hover:text-white"
                onClick={() => void logout()}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <img
                src="/logo-full-white.png"
                alt="PostHub"
                className="h-10 w-auto object-contain"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="border border-white/12 bg-white/10 text-white">
                  <Smartphone className="mr-1 h-3.5 w-3.5" />
                  Mobile-first
                </Badge>
                <Badge className="border border-white/12 bg-white/10 text-white">
                  Produto separado
                </Badge>
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                MetricHub
              </h1>
              <p className="mt-3 text-sm leading-7 text-white/72 sm:text-base">
                Seu painel de historico para prints de Instagram, TikTok e YouTube. Feito para
                abrir no celular, subir rapido e voltar depois com contexto.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/56">
                Conta logada
              </p>
              <p className="mt-1 text-base font-semibold text-white">{user?.name || 'PostHub'}</p>
              <p className="mt-1 text-sm text-white/66">{user?.email}</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-text-primary">Perfis disponiveis</p>
              <p className="text-sm text-text-secondary">
                Toque para alternar o historico salvo dentro do MetricHub.
              </p>
            </div>
            {activeProfile ? <Badge variant="brand">Ativo</Badge> : null}
          </div>

          <div className="hide-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {profiles.map((profile) => {
              const isActive = activeProfile?.id === profile.id;

              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setActiveProfile(profile)}
                  className={`min-w-[220px] rounded-[24px] border px-4 py-4 text-left transition-all ${
                    isActive
                      ? 'border-brand bg-brand/[0.06] shadow-sm'
                      : 'border-slate-200 bg-white hover:border-brand/25'
                  }`}
                >
                  <p className="font-semibold text-text-primary">{profile.name}</p>
                  <p className="mt-1 text-sm capitalize text-text-secondary">{profile.role}</p>
                </button>
              );
            })}
          </div>
        </section>

        {isLoadingProfiles ? (
          <Card className="rounded-[30px] border-slate-200 bg-white p-8 text-center text-text-secondary">
            Carregando seus perfis...
          </Card>
        ) : activeProfile ? (
          <MetricHubDashboard />
        ) : (
          <Card className="rounded-[30px] border-slate-200 bg-white">
            <EmptyState
              title="Nenhum perfil disponivel"
              description="Crie ou ative pelo menos um perfil no PostHub para salvar o historico do MetricHub."
              icon={Smartphone}
              action={
                <Link to="/workspace/dashboard">
                  <Button>Ir para o workspace</Button>
                </Link>
              }
            />
          </Card>
        )}
      </div>
    </main>
  );
};
