import * as React from 'react';
import { Search, ChevronDown, Plus, ExternalLink } from 'lucide-react';
import { useApp } from '../../../app/context/AppContext';
import { useAuth } from '../../../app/context/AuthContext';
import { useProfile } from '../../../app/context/ProfileContext';
import { Avatar } from '../../../shared/components/Avatar';
import { Dropdown, DropdownItem } from '../../../shared/components/Dropdown';
import { Button } from '../../../shared/components/Button';
import { NotificationsDropdown } from './NotificationsDropdown';
import { Modal } from '../../../shared/components/Modal';
import { Input } from '../../../shared/components/Input';
import {
  buildExtraProfilePaymentLink,
  EXTRA_PROFILE_PRICE_LABEL,
  isExtraProfilePaymentLinkConfigured,
} from '../../../shared/constants/plans';

export const Header = () => {
  const { setActiveModule } = useApp();
  const { user } = useAuth();
  const {
    activeProfile,
    setActiveProfile,
    profiles,
    availableProfileSlots,
    createProfile,
    reloadProfiles,
  } = useProfile();
  const [isCreateProfileModalOpen, setIsCreateProfileModalOpen] = React.useState(false);
  const [newProfileName, setNewProfileName] = React.useState('');
  const [profileActionError, setProfileActionError] = React.useState('');
  const [isSubmittingProfile, setIsSubmittingProfile] = React.useState(false);

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

  const handleAddProfileClick = async () => {
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

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/80 px-8 backdrop-blur-md">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search content, ideas, scripts..."
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
              {profiles.map((profile) => (
                <DropdownItem
                  key={profile.id}
                  onClick={() => setActiveProfile(profile)}
                  className={activeProfile.id === profile.id ? 'bg-brand/5 text-brand font-medium' : ''}
                >
                  <div className="flex items-center gap-2">
                    <Avatar src={profile.avatar_url} fallback={profile.name} size="sm" className="h-6 w-6" />
                    <span>{profile.name}</span>
                  </div>
                </DropdownItem>
              ))}
              <div className="my-1 border-t border-gray-100" />
              <DropdownItem icon={availableProfileSlots > 0 ? Plus : ExternalLink} onClick={handleAddProfileClick}>
                {availableProfileSlots > 0 ? 'Criar novo perfil' : 'Comprar novo perfil'}
              </DropdownItem>
            </Dropdown>
          )}
        </div>
      </header>

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
