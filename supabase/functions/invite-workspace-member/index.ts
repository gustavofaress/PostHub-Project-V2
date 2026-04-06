import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type InviteMode = 'invite' | 'resend';
type TeamMemberRole = 'admin' | 'editor' | 'reviewer';
type TeamPermissionId =
  | 'scripts'
  | 'ideas'
  | 'approval'
  | 'calendar'
  | 'kanban'
  | 'scheduler'
  | 'reports'
  | 'performance';

interface InvitePayload {
  mode?: InviteMode;
  profileId?: string;
  memberId?: string;
  email?: string;
  fullName?: string | null;
  role?: TeamMemberRole;
  permissions?: TeamPermissionId[];
}

interface WorkspaceMemberRecord {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  role: TeamMemberRole;
  status: 'invited' | 'active' | 'disabled';
  permissions: TeamPermissionId[] | null;
  created_at: string;
  invite_sent_at: string;
  invite_token: string;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:3000';

const allowedPermissions: TeamPermissionId[] = [
  'scripts',
  'ideas',
  'approval',
  'calendar',
  'kanban',
  'scheduler',
  'reports',
  'performance',
];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase environment variables are missing.');
    }

    const payload = (await request.json()) as InvitePayload;
    const mode = payload.mode ?? 'invite';
    const profileId = payload.profileId;
    const email = payload.email ? normalizeEmail(payload.email) : '';
    const fullName = payload.fullName?.trim() || null;
    const role = payload.role ?? 'editor';
    const permissions = (payload.permissions ?? []).filter((permission) =>
      allowedPermissions.includes(permission)
    );

    if (!profileId) {
      throw new Error('profileId is required.');
    }

    if (mode === 'invite' && !email) {
      throw new Error('email is required.');
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header.');
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Authenticated user not found.');
    }

    const { data: canManage, error: canManageError } = await userClient.rpc(
      'current_user_can_manage_workspace_members',
      {
        target_profile_id: profileId,
      }
    );

    if (canManageError) {
      throw canManageError;
    }

    if (!canManage) {
      return new Response(
        JSON.stringify({ error: 'Você não tem permissão para gerenciar membros deste workspace.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let memberId = payload.memberId ?? null;
    let existingMember: WorkspaceMemberRecord | null = null;

    if (memberId) {
      const { data, error } = await adminClient
        .from('workspace_members')
        .select(
          'id, user_id, email, full_name, role, status, permissions, created_at, invite_sent_at, invite_token'
        )
        .eq('id', memberId)
        .eq('profile_id', profileId)
        .maybeSingle();

      if (error) throw error;
      existingMember = (data as WorkspaceMemberRecord | null) ?? null;
    } else {
      const { data, error } = await adminClient
        .from('workspace_members')
        .select(
          'id, user_id, email, full_name, role, status, permissions, created_at, invite_sent_at, invite_token'
        )
        .eq('profile_id', profileId)
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;
      existingMember = (data as WorkspaceMemberRecord | null) ?? null;
      memberId = existingMember?.id ?? null;
    }

    if (mode === 'resend' && !memberId) {
      throw new Error('memberId is required to resend an invite.');
    }

    let inviteToken: string | null = existingMember?.invite_token ?? null;
    let persistedMember: WorkspaceMemberRecord | null = null;

    if (memberId) {
      const { data, error } = await adminClient
        .from('workspace_members')
        .update({
          email: email || existingMember?.email,
          full_name: fullName ?? existingMember?.full_name ?? null,
          role: payload.role ?? existingMember?.role ?? 'editor',
          permissions:
            payload.permissions && payload.permissions.length > 0
              ? permissions
              : existingMember?.permissions ?? [],
          status: 'invited',
          invite_sent_at: new Date().toISOString(),
        })
        .eq('id', memberId)
        .eq('profile_id', profileId)
        .select(
          'id, user_id, email, full_name, role, status, permissions, created_at, invite_sent_at, invite_token'
        )
        .single();

      if (error) throw error;

      persistedMember = data as WorkspaceMemberRecord;
      inviteToken = persistedMember.invite_token;
    } else {
      const { data, error } = await adminClient
        .from('workspace_members')
        .insert({
          profile_id: profileId,
          invited_by: user.id,
          email,
          full_name: fullName,
          role,
          status: 'invited',
          permissions,
        })
        .select(
          'id, user_id, email, full_name, role, status, permissions, created_at, invite_sent_at, invite_token'
        )
        .single();

      if (error) throw error;

      persistedMember = data as WorkspaceMemberRecord;
      inviteToken = persistedMember.invite_token;
    }

    const inviteRedirectTo = `${APP_URL.replace(/\/$/, '')}/invite/${inviteToken}`;

    let inviteErrorMessage: string | null = null;

    if (email) {
      const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: inviteRedirectTo,
        data: {
          workspace_profile_id: profileId,
          workspace_invite_token: inviteToken,
        },
      });

      if (inviteError) {
        inviteErrorMessage = inviteError.message;
      }
    }

    return new Response(
      JSON.stringify({
        member: persistedMember,
        inviteUrl: inviteRedirectTo,
        inviteError: inviteErrorMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[invite-workspace-member] error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
