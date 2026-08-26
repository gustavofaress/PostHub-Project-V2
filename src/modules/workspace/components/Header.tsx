import * as React from 'react';
import { Search, ChevronDown, Plus, ExternalLink, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../app/context/AppContext';
import { useAuth } from '../../../app/context/AuthContext';
import { Profile, canManageProfileName, useProfile } from '../../../app/context/ProfileContext';
import { useActiveProfileCommercialAccess } from '../../../hooks/useActiveProfileCommercialAccess';
import { Avatar } from '../../../shared/components/Avatar';
import { Dropdown, DropdownItem } from '../../../shared/components/Dropdown';
import { Button } from '../../../shared/components/Button';
import { NotificationsDropdown } from './NotificationsDropdown';
import { Modal } from '../../../shared/components/Modal';
import { Input } from '../../../shared/components/Input';
import { cn } from '../../../shared/utils/cn';
import {
  resolveAddProfileAction,
  resolveAddProfileButtonLabel,
  resolveAddProfileHelperMessage,
} from '../../../shared/utils/profileExtraBilling';
import { profileExtraBillingService } from '../../../services/profile-extra-billing.service';

const PROFILE_EXTRA_PRICE_LABEL = 'R$47,90/mês';

export const Header = () => {
  const { setActiveModule } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const handleNewContent = () => {
    setActiveModule('ideas');
  };

  const closeCreateProfileModal = () => {
    if (isSubmittingProfile) return;

    setIsCreateProfileModalOpen(false);
    setNewProfileName('');
    setProfileActionError('');
  };

  const resetCreateProfileModal = () => {
    setIsCreateProfileModalOpen(false);
    setNewProfileName('');
    setProfileActionError('');
  };

  const openEditProfileModal = (profile: Profile) => {
    setProfileBeingEdited(profile);
    setProfileNameDraft(profile.name);
    setEditProfileError('');
  };

  const resetEditProfileModal = () => {
    setProfileBeingEdited(null);
    setProfileNameDraft('');
    setEditProfileError('');
  };

  const closeEditProfileModal = () => {
    if (isUpdatingProfileName) return;

    resetEditProfileModal();
  };

  const handleAddProfileClick = async () => {
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
  };

  const handleCreateProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileActionError('');
    setIsSubmittingProfile(true);

    try {
      await createProfile(newProfileName);
      resetCreateProfileModal();
    } catch (error) {
      setProfileActionError(
        error instanceof Error ? error.message : 'Não foi possível criar o novo perfil.'
      );
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleEditProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/80 px-8 backdrop-blur-md">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search content, ideas, calendar..."
              className="h-10 w-full rounded-full border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button size="sm" className="hidden md:flex gap-2" onClick={handleNewContent}>
            <Plus className="h-4 w-4" />
            New Content
          </Button>

          <NotificationsDropdown />

          <div className="h-8 w-px bg-gray-200 mx-2" />

          {activeProfile && (
            <Dropdown
              trigger={
                <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-gray-50 transition-colors">
                  <Avatar src={activeProfile.avatar_url} fallback={activeProfile.name} size="sm" />
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-semibold text-text-primary leading-none">
                      {activeProfile.name}
                    </p>
                    <p className="text-xs text-text-secondary">{activeProfile.role}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>
              }
            >
              <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Switch Profile
              </div>
              <div className="space-y-1 px-2">
                {profiles.map((profile) => {
                  const isActive = activeProfile.id === profile.id;
                  const canEditProfile = canManageProfileName(profile);

                  return (
                    <div
                      key={profile.id}
                      className={cn(
                        'flex items-center gap-1 rounded-lg transition-colors',
                        isActive ? 'bg-brand/5 text-brand' : 'text-text-secondary hover:bg-gray-50'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveProfile(profile)}
                        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm transition-colors hover:text-text-primary"
                      >
                        <Avatar
                          src={profile.avatar_url}
                          fallback={profile.name}
                          size="sm"
                          className="h-6 w-6"
                        />
                        <span className={cn('truncate', isActive && 'font-medium')}>
                          {profile.name}
                        </span>
                      </button>

                      {canEditProfile ? (
                        <button
                          type="button"
                          onClick={() => openEditProfileModal(profile)}
                          aria-label={`Editar nome de ${profile.name}`}
                          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white hover:text-brand"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="my-1 border-t border-gray-100" />
              <DropdownItem
                icon={
                  addProfileAction === 'create_profile' || addProfileAction === 'admin_create'
                    ? Plus
                    : ExternalLink
                }
                onClick={handleAddProfileClick}
              >
                {addProfileButtonLabel}
              </DropdownItem>
            </Dropdown>
          )}
        </div>
      </header>

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
            <div className="flex justify-end gap-3">
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
                Perfil adicional é uma assinatura separada. Perfis FREE devem fazer upgrade para
                PRO antes de comprar slots extras.
              </p>
            </div>
            <p className={cn('text-sm leading-6', profileActionError ? 'text-red-500' : 'text-text-secondary')}>
              {profileActionError || resolveAddProfileHelperMessage(addProfileAction)}
            </p>
            <div className="flex justify-end gap-3">
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
          <div className="flex justify-end gap-3">
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
