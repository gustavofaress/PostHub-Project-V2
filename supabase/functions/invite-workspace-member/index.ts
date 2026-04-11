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
  const userMetadata = {
    full_name: fullName,
    workspace_member: true,
  };

  if (existingAuthUserId) {
    const { data, error } = await serviceClient.auth.admin.updateUserById(existingAuthUserId, {
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
  }

  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (error || !data.user?.id) {
    if (error?.message?.toLowerCase().includes('already registered')) {
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

  const { data: usuarioRecord, error: usuarioError } = await serviceClient
    .from('usuarios')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (usuarioError) {
    throw new Error(usuarioError.message);
  }

  if (usuarioRecord?.id) {
    return;
  }

  const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(userId);

  if (deleteAuthError) {
    throw new Error(deleteAuthError.message);
  }
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
