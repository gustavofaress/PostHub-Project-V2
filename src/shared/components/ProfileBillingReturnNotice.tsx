import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useProfile } from '../../app/context/ProfileContext';
import { useActiveProfileCommercialAccess } from '../../hooks/useActiveProfileCommercialAccess';
import { Button } from './Button';
import { Card } from './Card';
import { cn } from '../utils/cn';

const PROFILE_PRO_PROCESSING_PARAM = 'profile-pro-processing';
const PROFILE_PRO_CANCELLED_PARAM = 'profile-pro-cancelled';

export const ProfileBillingReturnNotice = ({ className }: { className?: string }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeProfile } = useProfile();
  const commercialAccess = useActiveProfileCommercialAccess();
  const billingStatus = searchParams.get('billing');
  const isProcessing = billingStatus === PROFILE_PRO_PROCESSING_PARAM;
  const isCancelled = billingStatus === PROFILE_PRO_CANCELLED_PARAM;
  const isStripePro =
    commercialAccess.entitlements?.plan_code === 'pro' &&
    commercialAccess.entitlements?.source === 'stripe';

  React.useEffect(() => {
    if (!isProcessing || !activeProfile?.id) return;

    void commercialAccess.refetch();
    const refetchTimer = window.setTimeout(() => {
      void commercialAccess.refetch();
    }, 2500);

    return () => window.clearTimeout(refetchTimer);
  }, [activeProfile?.id, isProcessing]);

  if (!isProcessing && !isCancelled) {
    return null;
  }

  const clearBillingParam = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('billing');
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <Card
      className={cn(
        'border-brand/20 bg-brand/[0.06] p-4 text-text-primary',
        isCancelled && 'border-amber-200 bg-amber-50',
        isStripePro && 'border-green-200 bg-green-50',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {isStripePro ? (
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
              : isCancelled
              ? 'Checkout cancelado.'
              : 'Pagamento recebido. Estamos confirmando seu plano PRO.'}
          </h2>
          <p className="mt-1 text-sm leading-6 text-text-secondary">
            {isStripePro
              ? 'O entitlement do perfil ativo já foi atualizado pelo backend.'
              : isCancelled
              ? 'Nenhuma alteração foi feita no seu plano.'
              : 'Vamos liberar os recursos quando o entitlement remoto deste perfil mudar.'}
          </p>
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
