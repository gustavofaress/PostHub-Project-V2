import * as React from 'react';
import {
  AlertCircle,
  Bell,
  Camera,
  CheckCircle2,
  Globe,
  KeyRound,
  Mail,
  Save,
  Shield,
  Upload,
  User,
} from 'lucide-react';
import { Card, CardDescription, CardTitle } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { Input } from '../../shared/components/Input';
import { Avatar } from '../../shared/components/Avatar';
import { Badge } from '../../shared/components/Badge';
import { useAuth } from '../../app/context/AuthContext';
import {
  accountSettingsService,
  normalizeNotificationPreferences,
  type UserNotificationPreferences,
} from '../../services/account-settings.service';
import { cn } from '../../shared/utils/cn';

type AccountSection = 'profile' | 'security' | 'notifications';
type StatusMessageState = { type: 'success' | 'error'; message: string } | null;

const notificationOptions: {
  key: keyof UserNotificationPreferences;
  title: string;
  description: string;
}[] = [
  {
    key: 'inApp',
    title: 'Central de notificações',
    description: 'Receber avisos dentro do PostHub.',
  },
  {
    key: 'taskAssigned',
    title: 'Novas atribuições',
    description: 'Quando alguém vincular você a uma demanda.',
  },
  {
    key: 'taskUpdated',
    title: 'Atualizações de tarefas',
    description: 'Quando uma demanda atribuída a você for alterada.',
  },
  {
    key: 'commentMentioned',
    title: 'Menções em comentários',
    description: 'Quando citarem seu @ em uma conversa.',
  },
  {
    key: 'taskCommented',
    title: 'Comentários em demandas',
    description: 'Quando comentarem em algo atribuído a você.',
  },
];

export const AccountArea = () => {
  const { user, updateAccountProfile, updatePassword } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [activeSection, setActiveSection] = React.useState<AccountSection>('profile');
  const [name, setName] = React.useState('');
  const [website, setWebsite] = React.useState('');
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [notificationPreferences, setNotificationPreferences] =
    React.useState<UserNotificationPreferences>(normalizeNotificationPreferences());

  const [profileStatus, setProfileStatus] = React.useState<StatusMessageState>(null);
  const [securityStatus, setSecurityStatus] = React.useState<StatusMessageState>(null);
  const [notificationsStatus, setNotificationsStatus] = React.useState<StatusMessageState>(null);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  React.useEffect(() => {
    if (!user) return;

    setName(user.name || '');
    setWebsite(user.website || '');
    setAvatarUrl(user.avatarUrl || null);
    setNotificationPreferences(normalizeNotificationPreferences(user.notificationPreferences));
  }, [user]);

  const fullName = name.trim() || user?.name?.trim() || 'Usuário';
  const email = user?.email || '';
  const onboarding = user?.onboarding;
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
  const accountRole = user?.isMemberOnlyAccount ? 'Membro do workspace' : 'Proprietário da conta';

  const saveAccountProfile = React.useCallback(
    async (nextAvatarUrl = avatarUrl) => {
      await updateAccountProfile({
        name,
        website,
        avatarUrl: nextAvatarUrl,
        notificationPreferences,
      });
    },
    [avatarUrl, name, notificationPreferences, updateAccountProfile, website]
  );

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileStatus(null);
    setIsSavingProfile(true);

    try {
      await saveAccountProfile();
      setProfileStatus({ type: 'success', message: 'Perfil atualizado com sucesso.' });
    } catch (error) {
      setProfileStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível atualizar o perfil.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setProfileStatus(null);
    setIsUploadingAvatar(true);

    try {
      const uploadedAvatarUrl = await accountSettingsService.uploadAvatar(user.id, file);
      setAvatarUrl(uploadedAvatarUrl);
      await saveAccountProfile(uploadedAvatarUrl);
      setProfileStatus({ type: 'success', message: 'Foto de perfil atualizada.' });
    } catch (error) {
      setProfileStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível enviar a foto.',
      });
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const handleSavePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSecurityStatus(null);

    if (newPassword.length < 6) {
      setSecurityStatus({ type: 'error', message: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityStatus({ type: 'error', message: 'As senhas informadas não coincidem.' });
      return;
    }

    setIsSavingPassword(true);

    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setSecurityStatus({ type: 'success', message: 'Senha atualizada com sucesso.' });
    } catch (error) {
      setSecurityStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível alterar a senha.',
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const toggleNotificationPreference = (key: keyof UserNotificationPreferences) => {
    setNotificationPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleSaveNotifications = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotificationsStatus(null);
    setIsSavingNotifications(true);

    try {
      await saveAccountProfile();
      setNotificationsStatus({
        type: 'success',
        message: 'Configurações de notificação atualizadas.',
      });
    } catch (error) {
      setNotificationsStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar as notificações.',
      });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const sectionItems = [
    { id: 'profile' as const, label: 'Perfil', icon: User },
    { id: 'security' as const, label: 'Segurança', icon: Shield },
    { id: 'notifications' as const, label: 'Notificações', icon: Bell },
  ];

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Configurações da Conta</h1>
        <p className="text-text-secondary">Gerencie suas informações pessoais e preferências.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <Avatar src={avatarUrl || undefined} fallback={initials} size="lg" className="h-24 w-24" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-white bg-brand text-white shadow-sm transition-colors hover:bg-brand-hover"
                aria-label="Alterar foto de perfil"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <h3 className="font-bold text-text-primary">{fullName}</h3>
            <p className="text-sm text-text-secondary">{email}</p>
            <Badge variant="brand" className="mb-4 mt-3">
              {accountRole}
            </Badge>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2"
              isLoading={isUploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Alterar foto
            </Button>
          </Card>

          <nav className="space-y-1">
            {sectionItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  activeSection === item.id
                    ? 'bg-brand/10 text-brand'
                    : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-6">
          {activeSection === 'profile' ? (
            <>
              <Card>
                <CardTitle className="mb-6">Informações Pessoais</CardTitle>

                <form className="space-y-6" onSubmit={handleSaveProfile}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Input
                        label="Nome"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        icon={<User className="h-4 w-4" />}
                        maxLength={120}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Input
                        label="Endereço de e-mail"
                        value={email}
                        icon={<Mail className="h-4 w-4" />}
                        disabled
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Input
                        label="Website"
                        value={website}
                        onChange={(event) => setWebsite(event.target.value)}
                        placeholder="https://seusite.com"
                        icon={<Globe className="h-4 w-4" />}
                      />
                    </div>
                  </div>

                  <StatusMessage status={profileStatus} />

                  <div className="flex justify-end">
                    <Button type="submit" className="gap-2" isLoading={isSavingProfile}>
                      <Save className="h-4 w-4" />
                      Salvar alterações
                    </Button>
                  </div>
                </form>
              </Card>

              {onboarding ? (
                <Card>
                  <CardTitle className="mb-6">Perfil de Operação</CardTitle>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <InfoItem label="Modelo de trabalho" value={onboarding.work_model || '-'} />
                    <InfoItem label="Tamanho da operação" value={onboarding.operation_size || '-'} />
                    <div className="sm:col-span-2">
                      <InfoItem
                        label="Operação de conteúdo hoje"
                        value={onboarding.current_process || '-'}
                      />
                    </div>
                  </div>
                </Card>
              ) : null}
            </>
          ) : null}

          {activeSection === 'security' ? (
            <>
              <Card>
                <CardTitle className="mb-2">Alterar senha</CardTitle>
                <CardDescription className="mb-6">
                  Atualize a senha usada para entrar na sua conta.
                </CardDescription>

                <form className="space-y-5" onSubmit={handleSavePassword}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="Nova senha"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      icon={<KeyRound className="h-4 w-4" />}
                    />
                    <Input
                      label="Confirmar senha"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      icon={<KeyRound className="h-4 w-4" />}
                    />
                  </div>

                  <StatusMessage status={securityStatus} />

                  <div className="flex justify-end">
                    <Button type="submit" className="gap-2" isLoading={isSavingPassword}>
                      <KeyRound className="h-4 w-4" />
                      Atualizar senha
                    </Button>
                  </div>
                </form>
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
            </>
          ) : null}

          {activeSection === 'notifications' ? (
            <Card>
              <CardTitle className="mb-2">Preferências de notificação</CardTitle>
              <CardDescription className="mb-6">
                Escolha quais alertas aparecem na central de notificações.
              </CardDescription>

              <form className="space-y-5" onSubmit={handleSaveNotifications}>
                <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                  {notificationOptions.map((option) => (
                    <ToggleRow
                      key={option.key}
                      title={option.title}
                      description={option.description}
                      checked={notificationPreferences[option.key]}
                      onChange={() => toggleNotificationPreference(option.key)}
                      disabled={option.key !== 'inApp' && !notificationPreferences.inApp}
                    />
                  ))}
                </div>

                <StatusMessage status={notificationsStatus} />

                <div className="flex justify-end">
                  <Button type="submit" className="gap-2" isLoading={isSavingNotifications}>
                    <Save className="h-4 w-4" />
                    Salvar notificações
                  </Button>
                </div>
              </form>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <p className="text-sm font-medium text-[#6B7280]">{label}</p>
    <p className="text-base font-semibold text-[#111827]">{value}</p>
  </div>
);

const StatusMessage = ({ status }: { status: StatusMessageState }) => {
  if (!status) return null;

  const Icon = status.type === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg px-3 py-2 text-sm',
        status.type === 'success'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-600'
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{status.message}</span>
    </div>
  );
};

const ToggleRow = ({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onChange}
    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <span>
      <span className="block text-sm font-semibold text-text-primary">{title}</span>
      <span className="mt-1 block text-sm text-text-secondary">{description}</span>
    </span>
    <span
      className={cn(
        'flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors',
        checked ? 'bg-brand' : 'bg-gray-200'
      )}
    >
      <span
        className={cn(
          'h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
          checked && 'translate-x-5'
        )}
      />
    </span>
  </button>
);
