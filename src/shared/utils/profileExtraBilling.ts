export type ProfileExtraEntitlementStatus = 'loading' | 'resolved' | 'missing' | 'error';

export type AddProfileAction =
  | 'loading'
  | 'create_profile'
  | 'go_to_pricing'
  | 'start_extra_checkout'
  | 'checkout_pending'
  | 'owner_required'
  | 'admin_create'
  | 'entitlement_missing'
  | 'unsupported_plan';

export interface ResolveAddProfileActionInput {
  activeProfileId?: string | null;
  profileRole?: string | null;
  entitlementStatus: ProfileExtraEntitlementStatus;
  planCode?: string | null;
  isAdmin?: boolean;
  availableProfileSlots: number;
  checkoutPending?: boolean;
  isLoadingProfiles?: boolean;
  isCheckingExtraStatus?: boolean;
  isCheckoutLoading?: boolean;
}

const normalizePlanCode = (planCode?: string | null) =>
  planCode?.trim().toLowerCase() || null;

export const resolveAddProfileAction = (
  input: ResolveAddProfileActionInput
): AddProfileAction => {
  if (
    input.isLoadingProfiles ||
    input.isCheckingExtraStatus ||
    input.entitlementStatus === 'loading' ||
    input.isCheckoutLoading
  ) {
    return 'loading';
  }

  if (input.availableProfileSlots > 0) {
    return input.isAdmin ? 'admin_create' : 'create_profile';
  }

  if (input.isAdmin) {
    return 'admin_create';
  }

  if (!input.activeProfileId) {
    return 'go_to_pricing';
  }

  if (input.profileRole !== 'owner') {
    return 'owner_required';
  }

  if (input.entitlementStatus === 'missing' || input.entitlementStatus === 'error') {
    return 'entitlement_missing';
  }

  const planCode = normalizePlanCode(input.planCode);

  if (planCode === 'free') {
    return 'go_to_pricing';
  }

  if (planCode === 'pro' || planCode === 'legacy_pro') {
    return input.checkoutPending ? 'checkout_pending' : 'start_extra_checkout';
  }

  return 'unsupported_plan';
};

export const resolveAddProfileButtonLabel = (action: AddProfileAction) => {
  switch (action) {
    case 'create_profile':
    case 'admin_create':
      return 'Criar novo perfil';
    case 'go_to_pricing':
      return 'Ver planos';
    case 'start_extra_checkout':
      return 'Comprar perfil adicional';
    case 'checkout_pending':
      return 'Checkout em andamento';
    case 'owner_required':
      return 'Somente o proprietário';
    case 'entitlement_missing':
    case 'unsupported_plan':
      return 'Indisponível';
    case 'loading':
    default:
      return 'Carregando...';
  }
};

export const resolveAddProfileHelperMessage = (action: AddProfileAction) => {
  switch (action) {
    case 'create_profile':
      return 'Você possui um slot de perfil adicional liberado para criação.';
    case 'admin_create':
      return 'Contas administrativas preservam criação operacional sem cobrança.';
    case 'go_to_pricing':
      return 'Perfis FREE devem fazer upgrade para PRO antes de comprar um perfil adicional.';
    case 'start_extra_checkout':
      return 'Você será redirecionado ao Checkout seguro do Stripe para comprar 1 perfil adicional.';
    case 'checkout_pending':
      return 'Já existe uma compra de perfil adicional em andamento para esta conta.';
    case 'owner_required':
      return 'Somente o proprietário do perfil ativo pode comprar um perfil adicional.';
    case 'entitlement_missing':
      return 'Não foi possível confirmar o plano materializado deste perfil.';
    case 'unsupported_plan':
      return 'Este plano legado não pode iniciar o novo checkout de perfil adicional.';
    case 'loading':
    default:
      return 'Estamos conferindo o plano e os slots disponíveis.';
  }
};
