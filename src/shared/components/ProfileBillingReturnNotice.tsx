import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useProfile } from '../../app/context/ProfileContext';
import { useActiveProfileCommercialAccess } from '../../hooks/useActiveProfileCommercialAccess';
import { profileExtraBillingService, type ProfileExtraStatus } from '../../services/profile-extra-billing.service';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { cn } from '../utils/cn';

const PROFILE_PRO_PROCESSING_PARAM = 'profile-pro-processing';
const PROFILE_PRO_CANCELLED_PARAM = 'profile-pro-cancelled';
const PROFILE_EXTRA_PROCESSING_PARAM = 'profile-extra-processing';
const PROFILE_EXTRA_CANCELLED_PARAM = 'profile-extra-cancelled';

const EMPTY_PROFILE_EXTRA_STATUS: ProfileExtraStatus = {
  hasAvailableSlot: false,
  checkoutPending: false,
  hasLinkedExtraProfiles: false,
};

export const ProfileBillingReturnNotice = ({ className }: { className?: string }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeProfile, createProfile, reloadProfiles } = useProfile();
  const commercialAccess = useActiveProfileCommercialAccess();
  const billingStatus = searchParams.get('billing');
  const isProfileProProcessing = billingStatus === PROFILE_PRO_PROCESSING_PARAM;
  const isProfileProCancelled = billingStatus === PROFILE_PRO_CANCELLED_PARAM;
  const isProfileExtraProcessing = billingStatus === PROFILE_EXTRA_PROCESSING_PARAM;
  const isProfileExtraCancelled = billingStatus === PROFILE_EXTRA_CANCELLED_PARAM;
  const isProcessing = isProfileProProcessing || isProfileExtraProcessing;
  const isCancelled = isProfileProCancelled || isProfileExtraCancelled;
  const [extraStatus, setExtraStatus] =
    React.useState<ProfileExtraStatus>(EMPTY_PROFILE_EXTRA_STATUS);
  const [extraProfileName, setExtraProfileName] = React.useState('');
  const [isExtraCreateFormOpen, setIsExtraCreateFormOpen] = React.useState(false);
  const [isCreatingExtraProfile, setIsCreatingExtraProfile] = React.useState(false);
  const [extraProfileError, setExtraProfileError] = React.useState<string | null>(null);
  const isStripePro =
    isProfileProProcessing &&
    commercialAccess.entitlements?.plan_code === 'pro' &&
    commercialAccess.entitlements?.source === 'stripe';
  const isExtraSlotReady = isProfileExtraProcessing && extraStatus.hasAvailableSlot;

  React.useEffect(() => {
    if (!isProfileProProcessing || !activeProfile?.id) return;

    void commercialAccess.refetch();
    const refetchTimer = window.setTimeout(() => {
      void commercialAccess.refetch();
    }, 2500);

    return () => window.clearTimeout(refetchTimer);
  }, [activeProfile?.id, isProfileProProcessing]);

  React.useEffect(() => {
    if (!isProfileExtraProcessing) return;

    let isMounted = true;

    const loadExtraStatus = async () => {
      try {
        const status = await profileExtraBillingService.getProfileExtraStatus();
        if (isMounted) {
          setExtraStatus(status);
        }
      } catch {
        if (isMounted) {
          setExtraStatus(EMPTY_PROFILE_EXTRA_STATUS);
        }
      }
    };

    void loadExtraStatus();
    const refetchTimer = window.setTimeout(() => {
      void loadExtraStatus();
    }, 2500);

    return () => {
      isMounted = false;
      window.clearTimeout(refetchTimer);
    };
  }, [isProfileExtraProcessing]);

  if (!isProcessing && !isCancelled) {
    return null;
  }

  const clearBillingParam = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('billing');
    setSearchParams(nextParams, { replace: true });
  };

  const handleCreateExtraProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setExtraProfileError(null);
    setIsCreatingExtraProfile(true);

    try {
      await createProfile(extraProfileName);
      await reloadProfiles();
      setExtraProfileName('');
      setIsExtraCreateFormOpen(false);
      clearBillingParam();
    } catch (error) {
      setExtraProfileError(
        error instanceof Error && error.message.trim()
          ? error.message
          : 'Não foi possível criar o perfil adicional.'
      );
    } finally {
      setIsCreatingExtraProfile(false);
    }
  };

  return (
    <Card
      className={cn(
        'border-brand/20 bg-brand/[0.06] p-4 text-text-primary',
        isCancelled && 'border-amber-200 bg-amber-50',
        (isStripePro || isExtraSlotReady) && 'border-green-200 bg-green-50',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {isStripePro || isExtraSlotReady ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : isCancelled ? (
            <AlertCircle className="h-5 w-5 text-amber-600" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">
            {isStripePro
              ? 'Seu perfil agora é PRO.'
              : isExtraSlotReady
              ? 'Seu perfil adicional está liberado.'
              : isCancelled
              ? 'Checkout cancelado.'
              : isProfileExtraProcessing
              ? 'Pagamento recebido. Estamos liberando seu novo perfil.'
              : 'Pagamento recebido. Estamos confirmando seu plano PRO.'}
          </h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {isStripePro
              ? 'O entitlement do perfil ativo já foi atualizado pelo backend.'
              : isExtraSlotReady
              ? 'O backend confirmou um slot pago disponível. Crie o perfil quando estiver pronto.'
              : isCancelled
              ? isProfileExtraCancelled
                ? 'Nenhum perfil adicional foi criado.'
                : 'Nenhuma alteração foi feita no seu plano.'
              : isProfileExtraProcessing
              ? 'Não vamos criar perfil automaticamente; aguardaremos o slot ativo remoto.'
              : 'Vamos liberar os recursos quando o entitlement remoto deste perfil mudar.'}
          </p>
          {isExtraSlotReady && !isExtraCreateFormOpen ? (
            <Button
              type="button"
              className="mt-4"
              size="sm"
              onClick={() => setIsExtraCreateFormOpen(true)}
            >
              Criar novo perfil
            </Button>
          ) : null}
          {isExtraSlotReady && isExtraCreateFormOpen ? (
            <form className="mt-4 space-y-3" onSubmit={handleCreateExtraProfile}>
              <Input
                label="Nome do perfil"
                placeholder="Ex.: Cliente XPTO"
                value={extraProfileName}
                onChange={(event) => setExtraProfileName(event.target.value)}
                maxLength={80}
              />
              {extraProfileError ? (
                <p className="text-sm text-red-500">{extraProfileError}</p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExtraCreateFormOpen(false)}
                >
                  Agora não
                </Button>
                <Button type="submit" size="sm" isLoading={isCreatingExtraProfile}>
                  Criar perfil
                </Button>
              </div>
            </form>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearBillingParam}
          aria-label="Fechar aviso de billing"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
