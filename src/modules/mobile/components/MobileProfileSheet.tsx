import * as React from 'react';
import { ChevronRight, ExternalLink, Plus } from 'lucide-react';
import { useAuth } from '../../../app/context/AuthContext';
import { useProfile } from '../../../app/context/ProfileContext';
import { buildExtraProfilePaymentLink, EXTRA_PROFILE_PRICE_LABEL, isExtraProfilePaymentLinkConfigured } from '../../../shared/constants/plans';
import { Avatar } from '../../../shared/components/Avatar';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { cn } from '../../../shared/utils/cn';
import { BottomSheet } from './BottomSheet';

interface MobileProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileProfileSheet = ({ isOpen, onClose }: MobileProfileSheetProps) => {
  const { user } = useAuth();
  const {
    activeProfile,
    setActiveProfile,
    profiles,
    availableProfileSlots,
    createProfile,
    reloadProfiles,
    isLoadingProfiles,
  } = useProfile();

  const [isCreateProfileModalOpen, setIsCreateProfileModalOpen] = React.useState(false);
  const [newProfileName, setNewProfileName] = React.useState('');
  const [profileActionError, setProfileActionError] = React.useState('');
  const [isSubmittingProfile, setIsSubmittingProfile] = React.useState(false);

  const closeCreateProfileModal = React.useCallback(() => {
    if (isSubmittingProfile) return;
    setIsCreateProfileModalOpen(false);
    setNewProfileName('');
    setProfileActionError('');
  }, [isSubmittingProfile]);

  const resetCreateProfileModal = React.useCallback(() => {
    setIsCreateProfileModalOpen(false);
    setNewProfileName('');
    setProfileActionError('');
  }, []);

  const handleAddProfileClick = React.useCallback(async () => {
    setProfileActionError('');

    const accessSnapshot = await reloadProfiles();

    if (accessSnapshot.availableProfileSlots > 0) {
      setIsCreateProfileModalOpen(true);
      return;
    }

    const checkoutLink = buildExtraProfilePaymentLink({
      userId: user?.id,
      email: user?.email,
    });

    if (!isExtraProfilePaymentLinkConfigured() || !checkoutLink) {
      setProfileActionError(
        'O link do Stripe para perfil extra ainda não foi configurado em plans.ts.'
      );
      setIsCreateProfileModalOpen(true);
      return;
    }

    window.location.assign(checkoutLink);
  }, [reloadProfiles, user?.email, user?.id]);

  const handleCreateProfileSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setProfileActionError('');
      setIsSubmittingProfile(true);

      try {
        await createProfile(newProfileName);
        resetCreateProfileModal();
        onClose();
      } catch (error) {
        setProfileActionError(
          error instanceof Error ? error.message : 'Não foi possível criar o novo perfil.'
        );
      } finally {
        setIsSubmittingProfile(false);
      }
    },
    [createProfile, newProfileName, onClose, resetCreateProfileModal]
  );

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Trocar perfil" fullScreen>
        <div className="space-y-5 pb-4">
          <div className="rounded-[24px] border border-brand/15 bg-brand/[0.05] px-4 py-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-brand">
              Perfil ativo
            </p>
            {activeProfile ? (
              <div className="mt-3 flex items-center gap-3">
                <Avatar
                  src={activeProfile.avatar_url}
                  fallback={activeProfile.name}
                  size="md"
                  className="border-brand/15 bg-white"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-slate-950">
                    {activeProfile.name}
                  </p>
                  <p className="text-sm text-slate-500">{activeProfile.role}</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Nenhum perfil selecionado.</p>
            )}
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Seus perfis
              </p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[0.68rem] font-semibold text-slate-500">
                {profiles.length} {profiles.length === 1 ? 'perfil' : 'perfis'}
              </span>
            </div>

            <div className="space-y-2">
              {isLoadingProfiles ? (
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Carregando perfis...
                </div>
              ) : (
                profiles.map((profile) => {
                  const isActive = activeProfile?.id === profile.id;

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => {
                        setActiveProfile(profile);
                        onClose();
                      }}
                      className={cn(
                        'flex min-h-[74px] w-full items-center gap-4 rounded-[24px] border px-4 py-4 text-left transition-all active:scale-[0.99]',
                        isActive
                          ? 'border-brand/30 bg-[linear-gradient(180deg,rgba(56,182,255,0.14)_0%,rgba(255,255,255,0.96)_100%)] shadow-[0_14px_30px_rgba(15,23,42,0.06)]'
                          : 'border-slate-200 bg-white'
                      )}
                    >
                      <Avatar
                        src={profile.avatar_url}
                        fallback={profile.name}
                        size="md"
                        className={cn(isActive ? 'border-brand/20' : 'border-slate-200')}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-base font-semibold text-slate-950">
                            {profile.name}
                          </p>
                          {isActive ? (
                            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[0.68rem] font-semibold text-brand">
                              Ativo
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-slate-500">{profile.role}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Adicionar perfil</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {availableProfileSlots > 0
                    ? `Você ainda pode criar ${availableProfileSlots} ${availableProfileSlots === 1 ? 'perfil' : 'perfis'} nesta conta.`
                    : `Cada novo perfil custa ${EXTRA_PROFILE_PRICE_LABEL}.`}
                </p>
              </div>
            </div>

            <Button
              className="mt-4 w-full gap-2"
              variant={availableProfileSlots > 0 ? 'primary' : 'secondary'}
              onClick={() => void handleAddProfileClick()}
            >
              {availableProfileSlots > 0 ? <Plus className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
              {availableProfileSlots > 0 ? 'Criar novo perfil' : 'Comprar novo perfil'}
            </Button>
          </section>
        </div>
      </BottomSheet>

      <Modal
        isOpen={isCreateProfileModalOpen}
        onClose={closeCreateProfileModal}
        title={availableProfileSlots > 0 ? 'Criar novo perfil' : 'Comprar perfil extra'}
      >
        {availableProfileSlots > 0 ? (
          <form className="space-y-4" onSubmit={handleCreateProfileSubmit}>
            <p className="text-sm leading-6 text-text-secondary">
              Dê um nome ao novo perfil. Assim que ele for criado, já ficará disponível na mesma conta.
            </p>
            <div className="rounded-2xl border border-brand/15 bg-brand/5 px-4 py-3 text-sm text-text-primary">
              Vagas disponíveis agora: <strong>{availableProfileSlots}</strong>
            </div>
            <Input
              label="Nome do perfil"
              placeholder="Ex.: Cliente XPTO"
              value={newProfileName}
              onChange={(event) => setNewProfileName(event.target.value)}
              maxLength={80}
              autoFocus
            />
            {profileActionError ? (
              <p className="text-sm text-red-500">{profileActionError}</p>
            ) : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={closeCreateProfileModal}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmittingProfile}>
                Criar perfil
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-text-secondary">
              Cada perfil adicional custa {EXTRA_PROFILE_PRICE_LABEL}. Depois que o pagamento for
              confirmado no Stripe, esta mesma conta ganha uma nova vaga para criar outro perfil.
            </p>
            {profileActionError ? (
              <p className="text-sm text-red-500">{profileActionError}</p>
            ) : (
              <p className="text-sm leading-6 text-text-secondary">
                Use o mesmo email da conta no checkout para o crédito cair corretamente no seu acesso.
              </p>
            )}
            <div className="flex justify-end">
              <Button type="button" variant="ghost" onClick={closeCreateProfileModal}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
