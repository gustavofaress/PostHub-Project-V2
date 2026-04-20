import { createClient } from 'npm:@supabase/supabase-js@2.56.0';
import { corsHeaders } from '../_shared/cors.ts';

type MemberRole = 'admin' | 'editor' | 'reviewer';

interface InviteWorkspaceMemberPayload {
  mode?: 'invite' | 'resend' | 'update' | 'delete';
  profileId?: string;
  memberId?: string;
  email?: string;
  fullName?: string | null;
  role?: MemberRole;
  status?: 'invited' | 'active' | 'disabled';
  permissions?: string[];
  generatedPassword?: string;
  loginUrl?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const buildPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  return Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(
    ''
  );
};

const MEMBER_SELECT =
  'id, user_id, email, full_name, role, status, permissions, created_at, invite_sent_at';

const isMissingDatabaseObjectError = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code;
  const message = ((error as { message?: string } | null)?.message ?? '').toLowerCase();

  return (
    code === '42P01' ||
    code === '42703' ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  );
};

const findAuthUserByEmail = async ({
  serviceClient,
  email,
}: {
  serviceClient: ReturnType<typeof createClient>;
  email: string;
}) => {
  let page = 1;

  while (true) {
    const { data, error } = await serviceClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error(error.message || 'Não foi possível consultar os usuários de autenticação.');
    }

    const matchedUser =
      data.users.find((candidate) => candidate.email?.trim().toLowerCase() === email) ?? null;

    if (matchedUser) {
      return matchedUser;
    }

    if (!data.nextPage || data.nextPage <= page) {
      return null;
    }

    page = data.nextPage;
  }
};

const findAuthUserById = async ({
  serviceClient,
  userId,
}: {
  serviceClient: ReturnType<typeof createClient>;
  userId: string;
}) => {
  const { data, error } = await serviceClient.auth.admin.getUserById(userId);

  if (error || !data.user?.id) {
    return null;
  }

  return data.user;
};

const deleteRowsByColumn = async ({
  serviceClient,
  table,
  column,
  value,
}: {
  serviceClient: ReturnType<typeof createClient>;
  table: string;
  column: string;
  value: string;
}) => {
  const { error } = await serviceClient.from(table).delete().eq(column, value);

  if (error && !isMissingDatabaseObjectError(error)) {
    throw new Error(error.message);
  }
};

const cleanupOrphanedAuthArtifactsByUserId = async ({
  serviceClient,
  userId,
}: {
  serviceClient: ReturnType<typeof createClient>;
  userId: string;
}) => {
  await deleteRowsByColumn({
    serviceClient,
    table: 'profile_purchase_credits',
    column: 'user_id',
    value: userId,
  });
  await deleteRowsByColumn({
    serviceClient,
    table: 'user_account_settings',
    column: 'user_id',
    value: userId,
  });
  await deleteRowsByColumn({
    serviceClient,
    table: 'user_onboarding',
    column: 'user_id',
    value: userId,
  });
  await deleteRowsByColumn({
    serviceClient,
    table: 'client_profiles',
    column: 'user_id',
    value: userId,
  });
  await deleteRowsByColumn({
    serviceClient,
    table: 'usuarios',
    column: 'id',
    value: userId,
  });
};

const cleanupOrphanedAuthArtifactsByEmail = async ({
  serviceClient,
  email,
}: {
  serviceClient: ReturnType<typeof createClient>;
  email: string;
}) => {
  const { data: usuarioRows, error } = await serviceClient
    .from('usuarios')
    .select('id, email')
    .eq('email', email);

  if (error) {
    if (isMissingDatabaseObjectError(error)) {
      return;
    }

    throw new Error(error.message);
  }

  for (const usuario of usuarioRows ?? []) {
    const usuarioId = typeof usuario.id === 'string' ? usuario.id : '';

    if (!usuarioId) {
      continue;
    }

    const authUser = await findAuthUserById({
      serviceClient,
      userId: usuarioId,
    });

    if (authUser?.id) {
      continue;
    }

    await cleanupOrphanedAuthArtifactsByUserId({
      serviceClient,
      userId: usuarioId,
    });
  }
};

const shouldPreserveStandaloneAuthUser = async ({
  serviceClient,
  authUserId,
  email,
  userMetadata,
}: {
  serviceClient: ReturnType<typeof createClient>;
  authUserId: string;
  email: string;
  userMetadata: Record<string, unknown> | null | undefined;
}) => {
  if (userMetadata?.workspace_member === true) {
    return false;
  }

  // Owner accounts created by the standard signup flow carry profile bootstrap metadata.
  if (typeof userMetadata?.initial_profile_name === 'string' && userMetadata.initial_profile_name.trim()) {
    return true;
  }

  const { count: ownedProfilesCount, error: ownedProfilesError } = await serviceClient
    .from('client_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', authUserId);

  if (ownedProfilesError) {
    throw new Error(ownedProfilesError.message);
  }

  if ((ownedProfilesCount ?? 0) > 0) {
    return true;
  }

  const { count: onboardingCount, error: onboardingError } = await serviceClient
    .from('user_onboarding')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', authUserId);

  if (onboardingError) {
    throw new Error(onboardingError.message);
  }

  if ((onboardingCount ?? 0) > 0) {
    return true;
  }

  const { data: usuarioRecords, error: usuarioError } = await serviceClient
    .from('usuarios')
    .select('id, current_plan, trial_started_at, trial_expires_at, is_admin')
    .or(`id.eq.${authUserId},email.eq.${email}`);

  if (usuarioError) {
    throw new Error(usuarioError.message);
  }

  return (usuarioRecords ?? []).some((usuario) => {
    return (
      !!usuario.is_admin ||
      !!usuario.current_plan ||
      !!usuario.trial_started_at ||
      !!usuario.trial_expires_at
    );
  });
};

const canReuseExistingAuthUser = async (input: {
  serviceClient: ReturnType<typeof createClient>;
  authUserId: string;
  email: string;
  userMetadata: Record<string, unknown> | null | undefined;
}) => {
  return !(await shouldPreserveStandaloneAuthUser(input));
};

const ensureMemberAuthUser = async ({
  serviceClient,
  existingAuthUserId,
  email,
  password,
  fullName,
}: {
  serviceClient: ReturnType<typeof createClient>;
  existingAuthUserId: string | null;
  email: string;
  password: string;
  fullName: string | null;
}) => {
  const memberDisplayName = fullName?.trim() || email.split('@')[0] || 'Membro';
  const userMetadata = {
    full_name: memberDisplayName,
    initial_profile_name: memberDisplayName,
    workspace_member: true,
  };

  const upsertAuthUser = async (authUserId: string) => {
    const { data, error } = await serviceClient.auth.admin.updateUserById(authUserId, {
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (error || !data.user?.id) {
      throw new Error(
        error?.message || 'Não foi possível atualizar o acesso do membro existente.'
      );
    }

    return data.user.id;
  };

  if (existingAuthUserId) {
    return upsertAuthUser(existingAuthUserId);
  }

  const existingAuthUser = await findAuthUserByEmail({
    serviceClient,
    email,
  });

  if (existingAuthUser?.id) {
    if (
      await canReuseExistingAuthUser({
        serviceClient,
        authUserId: existingAuthUser.id,
        email,
        userMetadata: existingAuthUser.user_metadata,
      })
    ) {
      return upsertAuthUser(existingAuthUser.id);
    }

    throw new Error(
      'Esse email já está cadastrado em outra conta. Use outro email para o membro ou reutilize o acesso existente.'
    );
  }

  await cleanupOrphanedAuthArtifactsByEmail({
    serviceClient,
    email,
  });

  const createMemberUser = () => serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  let { data, error } = await createMemberUser();

  if (error?.message?.toLowerCase().includes('database error creating new user')) {
    await cleanupOrphanedAuthArtifactsByEmail({
      serviceClient,
      email,
    });

    const retryResult = await createMemberUser();
    data = retryResult.data;
    error = retryResult.error;
  }

  if (error || !data.user?.id) {
    if (error?.message?.toLowerCase().includes('already registered')) {
      const registeredAuthUser = await findAuthUserByEmail({
        serviceClient,
        email,
      });

      if (
        registeredAuthUser?.id &&
        (await canReuseExistingAuthUser({
          serviceClient,
          authUserId: registeredAuthUser.id,
          email,
          userMetadata: registeredAuthUser.user_metadata,
        }))
      ) {
        return upsertAuthUser(registeredAuthUser.id);
      }

      throw new Error(
        'Esse email já está cadastrado em outra conta. Use outro email para o membro ou reutilize o acesso existente.'
      );
    }

    throw new Error(
      error?.message || 'Não foi possível criar o usuário de autenticação para o membro.'
    );
  }

  return data.user.id;
};

const getWorkspaceMemberById = async ({
  serviceClient,
  profileId,
  memberId,
}: {
  serviceClient: ReturnType<typeof createClient>;
  profileId: string;
  memberId: string;
}) => {
  const { data, error } = await serviceClient
    .from('workspace_members')
    .select(MEMBER_SELECT)
    .eq('id', memberId)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

const cleanupMemberAuthIfUnused = async ({
  serviceClient,
  memberId,
  userId,
}: {
  serviceClient: ReturnType<typeof createClient>;
  memberId: string;
  userId: string | null;
}) => {
  if (!userId) {
    return;
  }

  const { count: linkedMembershipsCount, error: linkedMembershipsError } = await serviceClient
    .from('workspace_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('id', memberId);

  if (linkedMembershipsError) {
    throw new Error(linkedMembershipsError.message);
  }

  if ((linkedMembershipsCount ?? 0) > 0) {
    return;
  }

  const { data: authUserResult, error: authUserError } = await serviceClient.auth.admin.getUserById(userId);

  if (authUserError) {
    throw new Error(authUserError.message);
  }

  if (!authUserResult.user?.id) {
    return;
  }

  const shouldPreserve = await shouldPreserveStandaloneAuthUser({
    serviceClient,
    authUserId: userId,
    email: authUserResult.user.email?.trim().toLowerCase() ?? '',
    userMetadata: authUserResult.user.user_metadata,
  });

  if (shouldPreserve) {
    return;
  }

  const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(userId);

  if (deleteAuthError) {
    throw new Error(deleteAuthError.message);
  }

  await cleanupOrphanedAuthArtifactsByUserId({
    serviceClient,
    userId,
  });
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return json({ error: 'Supabase env vars ausentes.' }, 500);
    }

    const authHeader = request.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return json({ error: 'Usuário não autenticado.' }, 401);
    }

    const payload = (await request.json()) as InviteWorkspaceMemberPayload;
    const mode = payload.mode ?? 'invite';
    const profileId = payload.profileId;

    if (!profileId) {
      return json({ error: 'profileId é obrigatório.' }, 400);
    }

    const { data: canManageMembers, error: manageError } = await userClient.rpc(
      'current_user_can_manage_workspace_members',
      {
        target_profile_id: profileId,
      }
    );

    if (manageError) {
      return json({ error: manageError.message }, 400);
    }

    if (!canManageMembers) {
      return json({ error: 'Sem permissão para gerenciar membros deste workspace.' }, 403);
    }

    const { data: profile, error: profileError } = await serviceClient
      .from('client_profiles')
      .select('id, user_id')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return json({ error: 'Workspace não encontrado.' }, 404);
    }

    const { data: ownerRecord, error: ownerError } = await serviceClient
      .from('usuarios')
      .select('current_plan, is_admin')
      .eq('id', profile.user_id)
      .maybeSingle();

    if (ownerError) {
      return json({ error: ownerError.message }, 400);
    }

    const isOwnerPro =
      !!ownerRecord?.is_admin || (ownerRecord?.current_plan || '').toLowerCase() === 'pro';

    if (!isOwnerPro) {
      return json({ error: 'Somente workspaces do plano PRO podem adicionar membros.' }, 403);
    }

    if (mode === 'resend') {
      if (!payload.memberId) {
        return json({ error: 'memberId é obrigatório para reenvio.' }, 400);
      }

      const { data: updatedMember, error: updateError } = await serviceClient
        .from('workspace_members')
        .update({
          invite_sent_at: new Date().toISOString(),
        })
        .eq('id', payload.memberId)
        .eq('profile_id', profileId)
        .select(MEMBER_SELECT)
        .single();

      if (updateError) {
        return json({ error: updateError.message }, 400);
      }

      return json({
        member: updatedMember,
        loginUrl: payload.loginUrl,
      });
    }

    if (mode === 'update') {
      if (!payload.memberId) {
        return json({ error: 'memberId é obrigatório para atualização.' }, 400);
      }

      let currentMember;

      try {
        currentMember = await getWorkspaceMemberById({
          serviceClient,
          profileId,
          memberId: payload.memberId,
        });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : 'Erro ao buscar membro.' }, 400);
      }

      if (!currentMember) {
        return json({ error: 'Membro não encontrado.' }, 404);
      }

      if (currentMember.role === 'owner') {
        return json({ error: 'O membro proprietário não pode ser editado por aqui.' }, 403);
      }

      const nextStatus = payload.status ?? currentMember.status;
      const nextFullName = payload.fullName?.trim() || null;
      const nextRole = payload.role ?? currentMember.role;
      const nextPermissions = payload.permissions ?? currentMember.permissions ?? [];
      const inviteSentAt =
        nextStatus === 'invited' ? new Date().toISOString() : currentMember.invite_sent_at;

      if (currentMember.user_id) {
        const { error: authUpdateError } = await serviceClient.auth.admin.updateUserById(
          currentMember.user_id,
          {
            user_metadata: {
              full_name: nextFullName,
              workspace_member: true,
            },
          }
        );

        if (authUpdateError) {
          return json({ error: authUpdateError.message }, 400);
        }
      }

      const { data: updatedMember, error: updateError } = await serviceClient
        .from('workspace_members')
        .update({
          full_name: nextFullName,
          role: nextRole,
          status: nextStatus,
          permissions: nextPermissions,
          invite_sent_at: inviteSentAt,
        })
        .eq('id', payload.memberId)
        .eq('profile_id', profileId)
        .select(MEMBER_SELECT)
        .single();

      if (updateError) {
        return json({ error: updateError.message }, 400);
      }

      return json({ member: updatedMember });
    }

    if (mode === 'delete') {
      if (!payload.memberId) {
        return json({ error: 'memberId é obrigatório para exclusão.' }, 400);
      }

      let currentMember;

      try {
        currentMember = await getWorkspaceMemberById({
          serviceClient,
          profileId,
          memberId: payload.memberId,
        });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : 'Erro ao buscar membro.' }, 400);
      }

      if (!currentMember) {
        return json({ error: 'Membro não encontrado.' }, 404);
      }

      if (currentMember.role === 'owner') {
        return json({ error: 'O membro proprietário não pode ser excluído por aqui.' }, 403);
      }

      const { error: deleteMemberError } = await serviceClient
        .from('workspace_members')
        .delete()
        .eq('id', payload.memberId)
        .eq('profile_id', profileId);

      if (deleteMemberError) {
        return json({ error: deleteMemberError.message }, 400);
      }

      let warning: string | null = null;

      try {
        await cleanupMemberAuthIfUnused({
          serviceClient,
          memberId: payload.memberId,
          userId: currentMember.user_id,
        });
      } catch (error) {
        warning =
          error instanceof Error
            ? error.message
            : 'O membro foi removido, mas não foi possível concluir a limpeza do acesso.';
      }

      return json({
        success: true,
        warning,
      });
    }

    const email = payload.email?.trim().toLowerCase();
    const permissions = payload.permissions ?? [];
    const role = payload.role ?? 'editor';
    const fullName = payload.fullName?.trim() || null;
    const generatedPassword = payload.generatedPassword || buildPassword();

    if (!email) {
      return json({ error: 'email é obrigatório.' }, 400);
    }

    const { data: existingMember, error: existingMemberError } = await serviceClient
      .from('workspace_members')
      .select('id, user_id')
      .eq('profile_id', profileId)
      .eq('email', email)
      .maybeSingle();

    if (existingMemberError) {
      return json({ error: existingMemberError.message }, 400);
    }

    let authUserId: string | null = null;

    try {
      authUserId = await ensureMemberAuthUser({
        serviceClient,
        existingAuthUserId: existingMember?.user_id ?? null,
        email,
        password: generatedPassword,
        fullName,
      });
      await cleanupOrphanedAuthArtifactsByUserId({
        serviceClient,
        userId: authUserId,
      });
    } catch (error) {
      return json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Não foi possível preparar o acesso do membro no Auth.',
        },
        400
      );
    }

    const memberPayload = {
      profile_id: profileId,
      user_id: authUserId,
      email,
      full_name: fullName,
      role,
      status: 'active',
      permissions,
      invite_sent_at: new Date().toISOString(),
    };

    const memberQuery = existingMember?.id
      ? serviceClient
          .from('workspace_members')
          .update(memberPayload)
          .eq('id', existingMember.id)
          .eq('profile_id', profileId)
      : serviceClient.from('workspace_members').insert(memberPayload);

    const { data: member, error: memberError } = await memberQuery
        .select(MEMBER_SELECT)
        .single();

    if (memberError) {
      return json({ error: memberError.message }, 400);
    }

    const origin =
      payload.loginUrl ||
      Deno.env.get('APP_URL') ||
      Deno.env.get('POSTHUB_APP_URL') ||
      request.headers.get('origin') ||
      '';

    return json({
      member,
      generatedPassword,
      loginUrl: origin || `/member-login?email=${encodeURIComponent(email)}`,
    });
  } catch (error) {
    console.error('[invite-workspace-member] unexpected error', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Erro inesperado ao criar o membro.',
      },
      500
    );
  }
});
