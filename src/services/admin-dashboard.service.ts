import { supabase } from '../shared/utils/supabase';
import { buildAppUrl } from '../shared/utils/appUrl';

export interface AdminDashboardUserRow {
  id: string;
  nome: string | null;
  email: string | null;
  current_plan: string | null;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  is_admin: boolean | null;
  created_at: string | null;
  is_affiliate_partner: boolean | null;
  affiliate_code: string | null;
  affiliate_commission_percent: number | null;
  affiliate_access_granted_at: string | null;
  referred_by_affiliate_user_id: string | null;
  referred_by_affiliate_code: string | null;
  affiliate_attributed_at: string | null;
  affiliate_locked_at: string | null;
}

export interface AdminDashboardOnboardingRow {
  user_id: string;
  work_model: string | null;
  operation_size: string | null;
  current_process: string | null;
  quiz_completed: boolean | null;
  setup_completed: boolean | null;
  created_at?: string | null;
}

export interface AdminDashboardWorkspaceMemberRow {
  user_id: string | null;
  email: string | null;
}

export interface AdminDashboardTrialAccessRow {
  user_id: string | null;
  access_date: string | null;
  first_accessed_at: string | null;
  last_accessed_at: string | null;
  access_count: number | null;
}

export interface AdminDashboardUser {
  id: string;
  name: string;
  email: string;
  plan: 'Trial' | 'Pro';
  trialStatus: 'Active' | 'Expired' | 'N/A';
  trialStartedAt: string | null;
  trialExpiresAt: string | null;
  trialAccessDays: number;
  trialAccessDates: string[];
  trialKanbanDay: number | null;
  firstTrialAccessAt: string | null;
  lastTrialAccessAt: string | null;
  totalTrialAccesses: number;
  workModel: string;
  operationSize: string;
  currentWorkflow: string;
  quizCompleted: boolean;
  setupCompleted: boolean;
  createdAt: string | null;
}

export interface AdminDashboardAffiliateCommissionRow {
  id: string;
  affiliate_user_id: string;
  referred_user_id: string | null;
  referred_user_email: string | null;
  affiliate_code: string;
  stripe_subscription_id: string;
  stripe_invoice_id: string;
  stripe_checkout_session_id: string | null;
  plan_id: string | null;
  currency: string | null;
  gross_amount: number | null;
  commission_percent: number | null;
  commission_amount: number | null;
  status: 'pending' | 'paid' | 'canceled';
  first_paid_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminDashboardAffiliatePartner {
  id: string;
  name: string;
  email: string;
  affiliateCode: string;
  commissionPercent: number;
  accessGrantedAt: string | null;
  shareUrl: string;
  attributedTrials: number;
  paidCustomers: number;
  grossRevenue: number;
  pendingCommission: number;
  paidCommission: number;
}

export interface AdminDashboardAffiliateCommission {
  id: string;
  affiliateUserId: string;
  affiliateName: string;
  affiliateEmail: string;
  affiliateCode: string;
  referredUserId: string | null;
  referredUserName: string;
  referredUserEmail: string;
  planId: string | null;
  currency: string;
  grossAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  status: 'pending' | 'paid' | 'canceled';
  firstPaidAt: string | null;
  paidAt: string | null;
  createdAt: string | null;
}

export interface AdminDashboardAffiliateMetrics {
  activeAffiliates: number;
  attributedTrials: number;
  firstSalesPaid: number;
  grossRevenue: number;
  pendingCommission: number;
  paidCommission: number;
}

export interface AdminDashboardAffiliateProgramData {
  metrics: AdminDashboardAffiliateMetrics;
  partners: AdminDashboardAffiliatePartner[];
  commissions: AdminDashboardAffiliateCommission[];
}

export interface AdminDashboardLandingPageVisitRow {
  visit_id: string;
  landing_path: string | null;
  page_variant: string | null;
  max_video_percent: number | null;
  reached_thruplay: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminDashboardLandingPageMetricWindow {
  label: string;
  shortLabel: string;
  days: 1 | 7 | 15 | 30;
  views: number;
  averageViewedPercent: number;
  thruPlayCount: number;
  thruPlayRate: number;
}

export interface AdminDashboardLandingPageMetrics {
  windows: AdminDashboardLandingPageMetricWindow[];
  lastUpdatedAt: string | null;
}

export interface AdminPasswordResetLinkResult {
  email: string;
  maskedEmail: string;
  expiresAt: string;
  supportResetUrl: string;
}

export interface AdminUpsertAffiliatePartnerInput {
  email: string;
  affiliateCode: string;
  commissionPercent?: number;
  grantProductAccess?: boolean;
}

export interface AdminUpsertAffiliatePartnerResult {
  userId: string;
  email: string;
  affiliateCode: string;
  isAffiliatePartner: boolean;
  affiliateCommissionPercent: number;
  affiliateAccessGrantedAt: string | null;
}

export class AdminDashboardAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdminDashboardAccessError';
  }
}

type AdminDashboardQueryError = {
  code?: string;
  message?: string | null;
};

type AdminDashboardQueryResult<T> = {
  data: T[] | null;
  error: AdminDashboardQueryError | null;
};

export const adminDashboardService = {
  async listUsers(): Promise<AdminDashboardUser[]> {
    if (!supabase) {
      throw new AdminDashboardAccessError('Supabase não está configurado.');
    }

    const [
      { data: usuariosData, error: usuariosError },
      { data: onboardingData, error: onboardingError },
      { data: workspaceMembersData, error: workspaceMembersError },
      { data: trialAccessData, error: trialAccessError },
    ] = await Promise.all([
      fetchAdminDashboardUsers(),
      fetchAdminDashboardOnboarding(),
      fetchAdminDashboardWorkspaceMembers(),
      fetchAdminDashboardTrialAccesses(),
    ]);

    if (usuariosError) {
      throw mapAdminDashboardError(usuariosError);
    }

    if (onboardingError) {
      throw mapAdminDashboardError(onboardingError);
    }

    if (workspaceMembersError) {
      throw mapAdminDashboardError(workspaceMembersError);
    }

    if (trialAccessError && !isMissingRelationError(trialAccessError)) {
      throw mapAdminDashboardError(trialAccessError);
    }

    const onboardingMap = new Map<string, AdminDashboardOnboardingRow>();
    (onboardingData as AdminDashboardOnboardingRow[] | null)?.forEach((row) => {
      onboardingMap.set(row.user_id, row);
    });

    const trialAccessMap = buildTrialAccessMap(
      trialAccessError
        ? []
        : ((trialAccessData as AdminDashboardTrialAccessRow[] | null) ?? [])
    );

    const workspaceMemberUserIds = new Set(
      ((workspaceMembersData as AdminDashboardWorkspaceMemberRow[] | null) ?? [])
        .map((member) => member.user_id)
        .filter((userId): userId is string => !!userId)
    );
    const workspaceMemberEmails = new Set(
      ((workspaceMembersData as AdminDashboardWorkspaceMemberRow[] | null) ?? [])
        .map((member) => member.email?.trim().toLowerCase())
        .filter((email): email is string => !!email)
    );

    return ((usuariosData as AdminDashboardUserRow[] | null) ?? [])
      .filter((usuario) => {
        const email = usuario.email?.trim().toLowerCase() ?? '';
        return (
          !usuario.is_admin &&
          !usuario.is_affiliate_partner &&
          !workspaceMemberUserIds.has(usuario.id) &&
          (!email || !workspaceMemberEmails.has(email))
        );
      })
      .map((usuario) => {
        const onboarding = onboardingMap.get(usuario.id);
        const isPro = usuario.current_plan === 'pro';
        const trialAccessRows = trialAccessMap.get(usuario.id) ?? [];
        const trialAccessDates = resolveTrialAccessDates(trialAccessRows);
        const trialAccessDays = trialAccessDates.length;

        return {
          id: usuario.id,
          name: usuario.nome?.trim() || 'Usuário sem nome',
          email: usuario.email?.trim() || '-',
          plan: isPro ? ('Pro' as const) : ('Trial' as const),
          trialStatus: getTrialStatus(usuario.current_plan, usuario.trial_expires_at),
          trialStartedAt: usuario.trial_started_at,
          trialExpiresAt: usuario.trial_expires_at,
          trialAccessDays,
          trialAccessDates,
          trialKanbanDay: isPro ? null : clampTrialKanbanDay(trialAccessDays || 1),
          firstTrialAccessAt: resolveFirstTrialAccessAt(trialAccessRows),
          lastTrialAccessAt: resolveLastTrialAccessAt(trialAccessRows),
          totalTrialAccesses: trialAccessRows.reduce(
            (total, row) => total + safeNumber(row.access_count),
            0
          ),
          workModel: onboarding?.work_model || '',
          operationSize: onboarding?.operation_size || '',
          currentWorkflow: onboarding?.current_process || '',
          quizCompleted: !!onboarding?.quiz_completed,
          setupCompleted: !!onboarding?.setup_completed,
          createdAt: resolveUserCreatedAt(usuario, onboarding),
        };
      })
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return bTime - aTime;
      });
  },

  async getAffiliateProgramData(): Promise<AdminDashboardAffiliateProgramData> {
    if (!supabase) {
      throw new AdminDashboardAccessError('Supabase não está configurado.');
    }

    const [
      { data: usuariosData, error: usuariosError },
      { data: commissionsData, error: commissionsError },
    ] = await Promise.all([fetchAdminDashboardUsers(), fetchAffiliateCommissions()]);

    if (usuariosError) {
      throw mapAdminDashboardError(usuariosError);
    }

    if (commissionsError) {
      throw mapAdminDashboardError(commissionsError);
    }

    const userRows = ((usuariosData as AdminDashboardUserRow[] | null) ?? []).filter(
      (row) => !row.is_admin
    );
    const commissionsRows = (commissionsData as AdminDashboardAffiliateCommissionRow[] | null) ?? [];
    const usersById = new Map(userRows.map((row) => [row.id, row]));

    const commissions = commissionsRows
      .map<AdminDashboardAffiliateCommission>((commission) => {
        const affiliateUser = usersById.get(commission.affiliate_user_id);
        const referredUser = commission.referred_user_id
          ? usersById.get(commission.referred_user_id)
          : null;

        return {
          id: commission.id,
          affiliateUserId: commission.affiliate_user_id,
          affiliateName: affiliateUser?.nome?.trim() || 'Afiliado sem nome',
          affiliateEmail: affiliateUser?.email?.trim() || '-',
          affiliateCode: commission.affiliate_code,
          referredUserId: commission.referred_user_id,
          referredUserName: referredUser?.nome?.trim() || 'Cliente sem nome',
          referredUserEmail:
            referredUser?.email?.trim() || commission.referred_user_email?.trim() || '-',
          planId: commission.plan_id,
          currency: commission.currency?.trim().toLowerCase() || 'brl',
          grossAmount: safeNumber(commission.gross_amount),
          commissionPercent: safeNumber(commission.commission_percent),
          commissionAmount: safeNumber(commission.commission_amount),
          status: commission.status,
          firstPaidAt: commission.first_paid_at,
          paidAt: commission.paid_at,
          createdAt: commission.created_at,
        };
      })
      .sort((firstCommission, secondCommission) => {
        const firstTime = firstCommission.firstPaidAt
          ? new Date(firstCommission.firstPaidAt).getTime()
          : 0;
        const secondTime = secondCommission.firstPaidAt
          ? new Date(secondCommission.firstPaidAt).getTime()
          : 0;

        return secondTime - firstTime;
      });

    const partners = userRows
      .filter((row) => row.is_affiliate_partner && row.affiliate_code)
      .map<AdminDashboardAffiliatePartner>((partner) => {
        const partnerCommissions = commissions.filter(
          (commission) => commission.affiliateUserId === partner.id
        );
        const referredUsers = userRows.filter(
          (row) => row.referred_by_affiliate_user_id === partner.id
        );
        const pendingCommission = partnerCommissions
          .filter((commission) => commission.status === 'pending')
          .reduce((total, commission) => total + commission.commissionAmount, 0);
        const paidCommission = partnerCommissions
          .filter((commission) => commission.status === 'paid')
          .reduce((total, commission) => total + commission.commissionAmount, 0);
        const grossRevenue = partnerCommissions.reduce(
          (total, commission) => total + commission.grossAmount,
          0
        );

        return {
          id: partner.id,
          name: partner.nome?.trim() || 'Afiliado sem nome',
          email: partner.email?.trim() || '-',
          affiliateCode: partner.affiliate_code?.trim() || '',
          commissionPercent: safeNumber(partner.affiliate_commission_percent || 30),
          accessGrantedAt: partner.affiliate_access_granted_at,
          shareUrl: buildAppUrl(`/r/${partner.affiliate_code}`),
          attributedTrials: referredUsers.length,
          paidCustomers: partnerCommissions.length,
          grossRevenue,
          pendingCommission,
          paidCommission,
        };
      })
      .sort((firstPartner, secondPartner) => {
        if (firstPartner.grossRevenue !== secondPartner.grossRevenue) {
          return secondPartner.grossRevenue - firstPartner.grossRevenue;
        }

        return firstPartner.name.localeCompare(secondPartner.name, 'pt-BR');
      });

    return {
      metrics: {
        activeAffiliates: partners.length,
        attributedTrials: partners.reduce((total, partner) => total + partner.attributedTrials, 0),
        firstSalesPaid: commissions.length,
        grossRevenue: commissions.reduce((total, commission) => total + commission.grossAmount, 0),
        pendingCommission: commissions
          .filter((commission) => commission.status === 'pending')
          .reduce((total, commission) => total + commission.commissionAmount, 0),
        paidCommission: commissions
          .filter((commission) => commission.status === 'paid')
          .reduce((total, commission) => total + commission.commissionAmount, 0),
      },
      partners,
      commissions,
    };
  },

  async getLandingPageMetrics(): Promise<AdminDashboardLandingPageMetrics> {
    if (!supabase) {
      throw new AdminDashboardAccessError('Supabase não está configurado.');
    }

    const { data, error } = await fetchLandingPageVideoVisits();

    if (error) {
      throw mapAdminDashboardError(error);
    }

    const visits = (data as AdminDashboardLandingPageVisitRow[] | null) ?? [];
    const windows = LANDING_PAGE_WINDOWS.map(({ label, shortLabel, days }) => {
      const visitsInWindow = visits.filter((visit) => isDateWithinLastDays(visit.created_at, days));
      const views = visitsInWindow.length;
      const thruPlayCount = visitsInWindow.filter(
        (visit) =>
          visit.reached_thruplay ||
          safeNumber(visit.max_video_percent) >= THRU_PLAY_PERCENTAGE
      ).length;
      const averageViewedPercent =
        views > 0
          ? Number(
              (
                visitsInWindow.reduce(
                  (total, visit) => total + safeNumber(visit.max_video_percent),
                  0
                ) / views
              ).toFixed(1)
            )
          : 0;

      return {
        label,
        shortLabel,
        days,
        views,
        averageViewedPercent,
        thruPlayCount,
        thruPlayRate: views > 0 ? Math.round((thruPlayCount / views) * 100) : 0,
      };
    });

    const lastUpdatedAt = visits
      .map((visit) => visit.updated_at ?? visit.created_at)
      .filter((value): value is string => !!value)
      .sort((firstValue, secondValue) => {
        return new Date(secondValue).getTime() - new Date(firstValue).getTime();
      })[0] ?? null;

    return {
      windows,
      lastUpdatedAt,
    };
  },

  async generatePasswordResetLink(email: string): Promise<AdminPasswordResetLinkResult> {
    if (!supabase) {
      throw new AdminDashboardAccessError('Supabase nao esta configurado.');
    }

    const { data, error } = await supabase.functions.invoke('support-password-reset', {
      body: {
        mode: 'create',
        email,
      },
    });

    if (error) {
      throw new Error(
        await resolveFunctionErrorMessage(
          error,
          'Nao foi possivel gerar o link manual de redefinicao.'
        )
      );
    }

    if (!data?.supportResetUrl || !data?.email || !data?.maskedEmail || !data?.expiresAt) {
      throw new Error('O Supabase nao retornou um link valido de redefinicao.');
    }

    return {
      email: data.email,
      maskedEmail: data.maskedEmail,
      expiresAt: data.expiresAt,
      supportResetUrl: data.supportResetUrl,
    };
  },

  async upsertAffiliatePartner(
    input: AdminUpsertAffiliatePartnerInput
  ): Promise<AdminUpsertAffiliatePartnerResult> {
    if (!supabase) {
      throw new AdminDashboardAccessError('Supabase não está configurado.');
    }

    const { data, error } = await supabase.rpc('admin_upsert_affiliate_partner', {
      p_email: input.email,
      p_affiliate_code: input.affiliateCode,
      p_commission_percent: input.commissionPercent ?? 30,
      p_grant_product_access: input.grantProductAccess ?? true,
    });

    if (error) {
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row?.user_id || !row?.affiliate_code) {
      throw new Error('O Supabase não retornou os dados do afiliado atualizado.');
    }

    return {
      userId: row.user_id,
      email: row.email,
      affiliateCode: row.affiliate_code,
      isAffiliatePartner: !!row.is_affiliate_partner,
      affiliateCommissionPercent: safeNumber(row.affiliate_commission_percent || 30),
      affiliateAccessGrantedAt: row.affiliate_access_granted_at ?? null,
    };
  },

  async updateAffiliateCommissionStatus(
    commissionId: string,
    status: 'pending' | 'paid' | 'canceled'
  ) {
    if (!supabase) {
      throw new AdminDashboardAccessError('Supabase não está configurado.');
    }

    const { data, error } = await supabase.rpc('admin_update_affiliate_commission_status', {
      p_commission_id: commissionId,
      p_status: status,
    });

    if (error) {
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row?.id) {
      throw new Error('O Supabase não retornou a comissão atualizada.');
    }

    return {
      id: row.id as string,
      status: row.status as 'pending' | 'paid' | 'canceled',
      paidAt: (row.paid_at as string | null) ?? null,
    };
  },
};

const THRU_PLAY_PERCENTAGE = 75;

const LANDING_PAGE_WINDOWS: Array<{
  label: string;
  shortLabel: string;
  days: 1 | 7 | 15 | 30;
}> = [
  { label: 'Último dia', shortLabel: '24h', days: 1 },
  { label: 'Últimos 7 dias', shortLabel: '7d', days: 7 },
  { label: 'Últimos 15 dias', shortLabel: '15d', days: 15 },
  { label: 'Últimos 30 dias', shortLabel: '30d', days: 30 },
];

async function fetchAdminDashboardUsers() {
  const queries = [
    'id, nome, email, current_plan, trial_started_at, trial_expires_at, is_admin, created_at, is_affiliate_partner, affiliate_code, affiliate_commission_percent, affiliate_access_granted_at, referred_by_affiliate_user_id, referred_by_affiliate_code, affiliate_attributed_at, affiliate_locked_at',
    'id, nome, email, current_plan, trial_started_at, trial_expires_at, is_admin, is_affiliate_partner, affiliate_code, affiliate_commission_percent, affiliate_access_granted_at, referred_by_affiliate_user_id, referred_by_affiliate_code, affiliate_attributed_at, affiliate_locked_at',
    'id, nome, email, current_plan, trial_expires_at, is_admin, is_affiliate_partner, affiliate_code, affiliate_commission_percent, affiliate_access_granted_at, referred_by_affiliate_user_id, referred_by_affiliate_code, affiliate_attributed_at, affiliate_locked_at',
  ];

  let lastResult: AdminDashboardQueryResult<AdminDashboardUserRow> | null = null;

  for (const query of queries) {
    const result = (await supabase!.from('usuarios').select(
      query
    )) as AdminDashboardQueryResult<AdminDashboardUserRow>;

    if (!result.error) {
      return result;
    }

    lastResult = result as typeof lastResult;

    if (
      query.includes('created_at') &&
      isMissingColumnError(result.error, 'usuarios.created_at')
    ) {
      continue;
    }

    if (
      query.includes('trial_started_at') &&
      isMissingColumnError(result.error, 'usuarios.trial_started_at')
    ) {
      continue;
    }

    return result;
  }

  return (
    lastResult ?? {
      data: null,
      error: new Error('Não foi possível consultar os usuários do Admin Dashboard.'),
    }
  );
}

async function fetchAdminDashboardOnboarding() {
  const queries = [
    'user_id, work_model, operation_size, current_process, quiz_completed, setup_completed, created_at',
    'user_id, work_model, operation_size, current_process, quiz_completed, setup_completed',
  ];

  let lastResult: AdminDashboardQueryResult<AdminDashboardOnboardingRow> | null = null;

  for (const query of queries) {
    const result = (await supabase!.from('user_onboarding').select(
      query
    )) as AdminDashboardQueryResult<AdminDashboardOnboardingRow>;

    if (!result.error) {
      return result;
    }

    lastResult = result as typeof lastResult;

    if (
      query.includes('created_at') &&
      isMissingColumnError(result.error, 'user_onboarding.created_at')
    ) {
      continue;
    }

    return result;
  }

  return (
    lastResult ?? {
      data: null,
      error: new Error('Não foi possível consultar o onboarding do Admin Dashboard.'),
    }
  );
}

async function fetchAffiliateCommissions() {
  return (await supabase!
    .from('affiliate_commissions')
    .select(
      'id, affiliate_user_id, referred_user_id, referred_user_email, affiliate_code, stripe_subscription_id, stripe_invoice_id, stripe_checkout_session_id, plan_id, currency, gross_amount, commission_percent, commission_amount, status, first_paid_at, paid_at, created_at, updated_at'
    )
    .order('first_paid_at', { ascending: false })) as AdminDashboardQueryResult<AdminDashboardAffiliateCommissionRow>;
}

async function fetchAdminDashboardWorkspaceMembers() {
  return (await supabase!
    .from('workspace_members')
    .select('user_id, email')) as AdminDashboardQueryResult<AdminDashboardWorkspaceMemberRow>;
}

async function fetchAdminDashboardTrialAccesses() {
  return (await supabase!
    .from('trial_lead_daily_accesses')
    .select('user_id, access_date, first_accessed_at, last_accessed_at, access_count')
    .order('access_date', { ascending: true })) as AdminDashboardQueryResult<AdminDashboardTrialAccessRow>;
}

async function fetchLandingPageVideoVisits() {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 30);

  return (await supabase!
    .from('landing_page_video_visits')
    .select(
      'visit_id, landing_path, page_variant, max_video_percent, reached_thruplay, created_at, updated_at'
    )
    .eq('landing_path', '/lp')
    .gte('created_at', sinceDate.toISOString())) as AdminDashboardQueryResult<AdminDashboardLandingPageVisitRow>;
}

function resolveUserCreatedAt(
  usuario: Pick<AdminDashboardUserRow, 'created_at' | 'trial_started_at'>,
  onboarding?: Pick<AdminDashboardOnboardingRow, 'created_at'> | null
) {
  const validDates = [usuario.created_at, usuario.trial_started_at, onboarding?.created_at]
    .filter((value): value is string => !!value)
    .map((value) => ({
      value,
      timestamp: new Date(value).getTime(),
    }))
    .filter((entry) => !Number.isNaN(entry.timestamp))
    .sort((firstEntry, secondEntry) => firstEntry.timestamp - secondEntry.timestamp);

  return validDates[0]?.value ?? null;
}

function isMissingColumnError(error: { code?: string; message?: string | null }, columnName: string) {
  const normalizedMessage = (error.message || '').toLowerCase();
  return error.code === '42703' || normalizedMessage.includes(columnName.toLowerCase());
}

function isMissingRelationError(error: { code?: string; message?: string | null }) {
  const normalizedMessage = (error.message || '').toLowerCase();
  return (
    error.code === '42P01' ||
    normalizedMessage.includes('relation') && normalizedMessage.includes('does not exist') ||
    normalizedMessage.includes('trial_lead_daily_accesses')
  );
}

function buildTrialAccessMap(rows: AdminDashboardTrialAccessRow[]) {
  const accessMap = new Map<string, AdminDashboardTrialAccessRow[]>();

  rows.forEach((row) => {
    if (!row.user_id) return;

    const currentRows = accessMap.get(row.user_id) ?? [];
    currentRows.push(row);
    accessMap.set(row.user_id, currentRows);
  });

  accessMap.forEach((currentRows) => {
    currentRows.sort((firstRow, secondRow) => {
      return compareDateStrings(firstRow.access_date, secondRow.access_date);
    });
  });

  return accessMap;
}

function resolveTrialAccessDates(rows: AdminDashboardTrialAccessRow[]) {
  return Array.from(
    new Set(
      rows
        .map((row) => row.access_date)
        .filter((value): value is string => !!value)
    )
  ).sort((firstDate, secondDate) => compareDateStrings(firstDate, secondDate));
}

function resolveFirstTrialAccessAt(rows: AdminDashboardTrialAccessRow[]) {
  return resolveSortedAccessTimestamps(rows)[0] ?? null;
}

function resolveLastTrialAccessAt(rows: AdminDashboardTrialAccessRow[]) {
  const timestamps = resolveSortedAccessTimestamps(rows);
  return timestamps[timestamps.length - 1] ?? null;
}

function resolveSortedAccessTimestamps(rows: AdminDashboardTrialAccessRow[]) {
  return rows
    .flatMap((row) => [row.first_accessed_at, row.last_accessed_at])
    .filter((value): value is string => !!value)
    .map((value) => ({
      value,
      timestamp: new Date(value).getTime(),
    }))
    .filter((entry) => !Number.isNaN(entry.timestamp))
    .sort((firstEntry, secondEntry) => firstEntry.timestamp - secondEntry.timestamp)
    .map((entry) => entry.value);
}

function compareDateStrings(firstDate: string | null, secondDate: string | null) {
  const firstTime = firstDate ? new Date(firstDate).getTime() : 0;
  const secondTime = secondDate ? new Date(secondDate).getTime() : 0;

  return firstTime - secondTime;
}

function clampTrialKanbanDay(day: number) {
  return Math.min(Math.max(day, 1), 7);
}

function isDateWithinLastDays(dateString: string | null, days: number) {
  if (!dateString) return false;

  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) return false;

  const difference = Date.now() - parsedDate.getTime();
  return difference >= 0 && difference < days * 24 * 60 * 60 * 1000;
}

function safeNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getTrialStatus(
  currentPlan: string | null,
  trialExpiresAt: string | null
): 'Active' | 'Expired' | 'N/A' {
  if (currentPlan === 'pro') return 'N/A';
  if (!trialExpiresAt) return 'Active';

  const expiresAt = new Date(trialExpiresAt).getTime();
  const now = Date.now();

  return expiresAt >= now ? 'Active' : 'Expired';
}

function mapAdminDashboardError(error: { code?: string; message?: string | null }) {
  const normalizedMessage = (error.message || '').toLowerCase();
  const isPermissionError =
    error.code === '42501' ||
    normalizedMessage.includes('permission denied') ||
    normalizedMessage.includes('row-level security') ||
    normalizedMessage.includes('violates row-level security');

  if (isPermissionError) {
    return new AdminDashboardAccessError(
      'O Admin Dashboard não conseguiu ler todos os usuários. Aplique as policies de admin no Supabase para as tabelas usuarios, user_onboarding e workspace_members.'
    );
  }

  return new Error(
    error.message ||
      'Não foi possível carregar os dados do dashboard. Verifique a conexão com o Supabase.'
  );
}

async function resolveFunctionErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'context' in error &&
    error.context instanceof Response
  ) {
    try {
      const payload = await error.context.clone().json();
      if (typeof payload?.error === 'string' && payload.error.trim()) {
        return payload.error.trim();
      }
    } catch {
      // Ignore parsing errors and fall back to the generic message below.
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}
