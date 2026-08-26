export type ProfilePricingEntitlementStatus = 'loading' | 'resolved' | 'missing' | 'error';

export type ProfilePricingPlanCode =
  | 'free'
  | 'pro'
  | 'legacy_pro'
  | 'legacy_growth'
  | 'legacy_start'
  | string;

export type ProfilePricingAction =
  | 'loading'
  | 'profile_required'
  | 'entitlement_missing'
  | 'entitlement_error'
  | 'owner_required'
  | 'admin_access'
  | 'upgrade_to_pro'
  | 'current_stripe_pro'
  | 'current_legacy_pro'
  | 'current_pro'
  | 'unsupported_legacy';

export interface ResolveProfilePricingStateInput {
  profileId?: string | null;
  profileName?: string | null;
  profileRole?: string | null;
  isLoadingProfile?: boolean;
  entitlementStatus: ProfilePricingEntitlementStatus;
  planCode?: ProfilePricingPlanCode | null;
  entitlementSource?: string | null;
  isAdmin?: boolean;
  isCheckoutLoading?: boolean;
}

export interface ProfilePricingState {
  profileId: string | null;
  profileName: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  isFreeCurrent: boolean;
  isProCurrent: boolean;
  isLegacyProCurrent: boolean;
  canStartCheckout: boolean;
  proAction: ProfilePricingAction;
  freeBadgeLabel: string | null;
  proBadgeLabel: string | null;
  proButtonLabel: string;
  helperMessage: string | null;
}

const normalizePlanCode = (planCode?: string | null) =>
  planCode?.trim().toLowerCase() || null;

export const resolveProfilePricingState = (
  input: ResolveProfilePricingStateInput
): ProfilePricingState => {
  const profileId = input.profileId?.trim() || null;
  const profileName = input.profileName?.trim() || null;
  const planCode = normalizePlanCode(input.planCode);
  const entitlementSource = input.entitlementSource?.trim().toLowerCase() || null;
  const isOwner = input.profileRole === 'owner';
  const isAdmin = !!input.isAdmin;
  const isLoading =
    !!input.isLoadingProfile ||
    input.entitlementStatus === 'loading' ||
    (!profileId && input.entitlementStatus !== 'error' && input.entitlementStatus !== 'missing');
  const isFreeCurrent = input.entitlementStatus === 'resolved' && planCode === 'free';
  const isStripePro = input.entitlementStatus === 'resolved' && planCode === 'pro' && entitlementSource === 'stripe';
  const isLegacyProCurrent = input.entitlementStatus === 'resolved' && planCode === 'legacy_pro';
  const isProCurrent =
    isStripePro ||
    isLegacyProCurrent ||
    (input.entitlementStatus === 'resolved' && planCode === 'pro');

  let proAction: ProfilePricingAction = 'upgrade_to_pro';
  let helperMessage: string | null = null;

  if (isLoading) {
    proAction = 'loading';
    helperMessage = 'Estamos conferindo o plano do perfil ativo.';
  } else if (!profileId) {
    proAction = 'profile_required';
    helperMessage = 'Entre no workspace e selecione um perfil para gerenciar o plano.';
  } else if (input.entitlementStatus === 'error') {
    proAction = 'entitlement_error';
    helperMessage = 'Não foi possível verificar o plano deste perfil agora.';
  } else if (input.entitlementStatus === 'missing') {
    proAction = 'entitlement_missing';
    helperMessage = 'Não foi possível identificar o plano deste perfil.';
  } else if (isAdmin) {
    proAction = 'admin_access';
    helperMessage = 'Contas administrativas já possuem acesso operacional e não precisam contratar PRO.';
  } else if (!isOwner) {
    proAction = 'owner_required';
    helperMessage = 'Somente o proprietário deste perfil pode fazer o upgrade.';
  } else if (isStripePro) {
    proAction = 'current_stripe_pro';
    helperMessage = 'Este perfil já está no PRO.';
  } else if (isLegacyProCurrent) {
    proAction = 'current_legacy_pro';
    helperMessage = 'Este perfil possui acesso PRO legado.';
  } else if (planCode === 'pro') {
    proAction = 'current_pro';
    helperMessage = 'Este perfil já possui acesso PRO.';
  } else if (planCode !== 'free') {
    proAction = 'unsupported_legacy';
    helperMessage = 'Este perfil possui um plano legado e não pode iniciar este checkout novo.';
  }

  const canStartCheckout =
    proAction === 'upgrade_to_pro' &&
    isFreeCurrent &&
    isOwner &&
    !isAdmin &&
    !input.isCheckoutLoading &&
    !!profileId;

  const proButtonLabel =
    input.isCheckoutLoading && proAction === 'upgrade_to_pro'
      ? 'Redirecionando...'
      : proAction === 'upgrade_to_pro'
      ? 'Fazer upgrade para PRO'
      : proAction === 'current_stripe_pro' || proAction === 'current_pro'
      ? 'Plano atual'
      : proAction === 'current_legacy_pro'
      ? 'Plano legado'
      : proAction === 'owner_required'
      ? 'Somente o proprietário'
      : proAction === 'admin_access'
      ? 'Acesso administrativo'
      : proAction === 'loading'
      ? 'Carregando...'
      : 'Indisponível';

  return {
    profileId,
    profileName,
    isOwner,
    isAdmin,
    isLoading,
    isFreeCurrent,
    isProCurrent,
    isLegacyProCurrent,
    canStartCheckout,
    proAction,
    freeBadgeLabel: isFreeCurrent ? 'Plano atual' : null,
    proBadgeLabel:
      proAction === 'upgrade_to_pro'
        ? 'Recomendado'
        : proAction === 'current_stripe_pro' || proAction === 'current_pro'
        ? 'Plano atual'
        : proAction === 'current_legacy_pro'
        ? 'Plano legado'
        : proAction === 'admin_access'
        ? 'Acesso administrativo'
        : null,
    proButtonLabel,
    helperMessage,
  };
};

export const resolveProfileProCheckoutProfileId = (
  state: Pick<ProfilePricingState, 'canStartCheckout' | 'profileId'>
) => (state.canStartCheckout ? state.profileId : null);
