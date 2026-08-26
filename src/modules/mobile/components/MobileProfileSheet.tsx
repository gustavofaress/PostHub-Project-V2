import * as React from 'react';
import { ChevronRight, ExternalLink, Pencil, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../app/context/AuthContext';
import { Profile, canManageProfileName, useProfile } from '../../../app/context/ProfileContext';
import {
  resolveAddProfileAction,
  resolveAddProfileButtonLabel,
  resolveAddProfileHelperMessage,
} from '../../../shared/utils/profileExtraBilling';
import { useActiveProfileCommercialAccess } from '../../../hooks/useActiveProfileCommercialAccess';
import { profileExtraBillingService } from '../../../services/profile-extra-billing.service';
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

const PROFILE_EXTRA_PRICE_LABEL = 'R$47,90/mês';

export const MobileProfileSheet = ({ isOpen, onClose }: MobileProfileSheetProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    activeProfile,
    setActiveProfile,
    profiles,
    availableProfileSlots,
    profileExtraStatus,
    createProfile,
    updateProfileName,
    reloadProfiles,
    isLoadingProfiles,
  } = useProfile();
  const commercialAccess = useActiveProfileCommercialAccess();

  const [isCreateProfileModalOpen, setIsCreateProfileModalOpen] = React.useState(false);
  const [newProfileName, setNewProfileName] = React.useState('');
  const [profileActionError, setProfileActionError] = React.useState('');
  const [isSubmittingProfile, setIsSubmittingProfile] = React.useState(false);
  const [isExtraProfileCheckoutLoading, setIsExtraProfileCheckoutLoading] = React.useState(false);
  const checkoutInFlightRef = React.useRef(false);
  const [profileBeingEdited, setProfileBeingEdited] = React.useState<Profile | null>(null);
  const [profileNameDraft, setProfileNameDraft] = React.useState('');
  const [editProfileError, setEditProfileError] = React.useState('');
  const [isUpdatingProfileName, setIsUpdatingProfileName] = React.useState(false);
  const addProfileAction = resolveAddProfileAction({
    activeProfileId: activeProfile?.id,
    profileRole: activeProfile?.role,
    entitlementStatus: activeProfile?.id ? commercialAccess.entitlementStatus : 'missing',
    planCode: commercialAccess.entitlements?.plan_code ?? null,
    isAdmin: !!user?.isAdmin,
    availableProfileSlots,
    checkoutPending: profileExtraStatus.checkoutPending,
    isLoadingProfiles,
    isCheckoutLoading: isExtraProfileCheckoutLoading,
  });
  const addProfileButtonLabel = resolveAddProfileButtonLabel(addProfileAction);

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

  const openEditProfileModal = React.useCallback((profile: Profile) => {
    setProfileBeingEdited(profile);
    setProfileNameDraft(profile.name);
    setEditProfileError('');
  }, []);

  const resetEditProfileModal = React.useCallback(() => {
    setProfileBeingEdited(null);
    setProfileNameDraft('');
    setEditProfileError('');
  }, []);

  const closeEditProfileModal = React.useCallback(() => {
    if (isUpdatingProfileName) return;

    resetEditProfileModal();
  }, [isUpdatingProfileName, resetEditProfileModal]);

  const handleAddProfileClick = React.useCallback(async () => {
    if (checkoutInFlightRef.current) return;

    setProfileActionError('');

    const accessSnapshot = await reloadProfiles();
    const action = resolveAddProfileAction({
      activeProfileId: activeProfile?.id,
      profileRole: activeProfile?.role,
      entitlementStatus: activeProfile?.id ? commercialAccess.entitlementStatus : 'missing',
      planCode: commercialAccess.entitlements?.plan_code ?? null,
      isAdmin: !!user?.isAdmin,
      availableProfileSlots: accessSnapshot.availableProfileSlots,
      checkoutPending: accessSnapshot.profileExtraStatus.checkoutPending,
    });

    if (action === 'create_profile' || action === 'admin_create') {
      setIsCreateProfileModalOpen(true);
      return;
    }

    if (action === 'go_to_pricing') {
      navigate('/pricing');
      onClose();
      return;
    }

    if (action !== 'start_extra_checkout' || !activeProfile?.id) {
      setProfileActionError(resolveAddProfileHelperMessage(action));
      setIsCreateProfileModalOpen(true);
      return;
    }

    checkoutInFlightRef.current = true;
    setIsExtraProfileCheckoutLoading(true);

    try {
      const result = await profileExtraBillingService.createProfileExtraCheckout(activeProfile.id);

      if (!result.checkoutUrl) {
        throw new Error('O checkout de perfil adicional não retornou uma URL válida.');
      }

      window.location.assign(result.checkoutUrl);
    } catch (error) {
      checkoutInFlightRef.current = false;
      setIsExtraProfileCheckoutLoading(false);
      setProfileActionError(
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Não foi possível iniciar o checkout de perfil adicional.'
      );
      setIsCreateProfileModalOpen(true);
    }
  }, [
    activeProfile?.id,
    activeProfile?.role,
    commercialAccess.entitlementStatus,
    commercialAccess.entitlements?.plan_code,
    navigate,
    onClose,
    reloadProfiles,
    user?.isAdmin,
  ]);

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

  const handleEditProfileSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!profileBeingEdited) return;

      setEditProfileError('');
      setIsUpdatingProfileName(true);

      try {
        await updateProfileName(profileBeingEdited.id, profileNameDraft);
        resetEditProfileModal();
      } catch (error) {
        setEditProfileError(
          error instanceof Error ? error.message : 'Não foi possível editar o perfil.'
        );
      } finally {
        setIsUpdatingProfileName(false);
      }
    },
    [profileBeingEdited, profileNameDraft, resetEditProfileModal, updateProfileName]
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
                    <div
                      key={profile.id}
                      className={cn(
                        'flex min-h-[74px] w-full items-center gap-4 rounded-[24px] border px-4 py-4 text-left transition-all active:scale-[0.99]',
                        isActive
                          ? 'border-brand/30 bg-[linear-gradient(180deg,rgba(56,182,255,0.14)_0%,rgba(255,255,255,0.96)_100%)] shadow-[0_14px_30px_rgba(15,23,42,0.06)]'
                          : 'border-slate-200 bg-white'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProfile(profile);
                          onClose();
                        }}
                        className="flex min-w-0 flex-1 items-center gap-4 text-left"
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
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>

                      {canManageProfileName(profile) ? (
                        <button
                          type="button"
                          onClick={() => openEditProfileModal(profile)}
                          aria-label={`Editar nome de ${profile.name}`}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-colors active:scale-[0.98]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
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
                    : 'Perfis adicionais exigem um profile PRO e uma assinatura separada por perfil.'}
                </p>
              </div>
            </div>

            <Button
              className="mt-4 w-full gap-2"
              variant={
                addProfileAction === 'create_profile' || addProfileAction === 'admin_create'
                  ? 'primary'
                  : 'secondary'
              }
              onClick={() => void handleAddProfileClick()}
              isLoading={isExtraProfileCheckoutLoading}
            >
              {addProfileAction === 'create_profile' || addProfileAction === 'admin_create' ? (
                <Plus className="h-4 w-4" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {addProfileButtonLabel}
            </Button>
          </section>
        </div>
      </BottomSheet>

      <Modal
        isOpen={isCreateProfileModalOpen}
        onClose={closeCreateProfileModal}
        title={availableProfileSlots > 0 ? 'Criar novo perfil' : 'Perfil adicional'}
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
            <div className="rounded-2xl border border-brand/15 bg-brand/5 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                Perfil adicional
              </p>
              <p className="mt-2 text-lg font-semibold text-text-primary">
                1 perfil adicional • {PROFILE_EXTRA_PRICE_LABEL}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Perfil adicional é uma assinatura separada. Use um profile PRO como origem para
                comprar o próximo slot.
              </p>
            </div>
            <p className={cn('text-sm leading-6', profileActionError ? 'text-red-500' : 'text-text-secondary')}>
              {profileActionError || resolveAddProfileHelperMessage(addProfileAction)}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={closeCreateProfileModal}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!profileBeingEdited}
        onClose={closeEditProfileModal}
        title="Editar nome do perfil"
      >
        <form className="space-y-4" onSubmit={handleEditProfileSubmit}>
          <Input
            label="Nome do perfil"
            placeholder="Ex.: Cliente XPTO"
            value={profileNameDraft}
            onChange={(event) => setProfileNameDraft(event.target.value)}
            maxLength={80}
            autoFocus
          />
          {editProfileError ? (
            <p className="text-sm text-red-500">{editProfileError}</p>
          ) : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={closeEditProfileModal}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isUpdatingProfileName}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
