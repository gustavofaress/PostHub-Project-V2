import { supabase } from '../shared/utils/supabase';
import {
  TeamMember,
  TeamMemberRole,
  TeamMemberStatus,
  TeamPermissionId,
} from '../shared/constants/workspaceMembers';
import { teamMembersStorage } from '../modules/settings/teamMembers.storage';

interface WorkspaceMemberRow {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  permissions: TeamPermissionId[] | null;
  created_at: string;
  invite_sent_at: string;
}

interface InviteWorkspaceMemberInput {
  profileId: string;
  email: string;
  name?: string;
  role: Exclude<TeamMemberRole, 'owner'>;
  permissions: TeamPermissionId[];
}

const normalizeMember = (row: WorkspaceMemberRow): TeamMember => ({
  id: row.id,
  userId: row.user_id,
  email: row.email,
  name: row.full_name || row.email.split('@')[0],
  role: row.role,
  status: row.status,
  permissions: Array.isArray(row.permissions) ? row.permissions : [],
  createdAt: row.created_at,
  inviteSentAt: row.invite_sent_at,
});

const buildFallbackMember = (input: InviteWorkspaceMemberInput): TeamMember => ({
  id:
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}`,
  name: input.name?.trim() || input.email.split('@')[0],
  email: input.email.trim().toLowerCase(),
  role: input.role,
  status: 'invited',
  permissions: input.permissions,
  createdAt: new Date().toISOString(),
  inviteSentAt: new Date().toISOString(),
  userId: null,
});

export const workspaceMembersService = {
  async list(profileId: string): Promise<TeamMember[]> {
    if (!supabase) {
      return teamMembersStorage.list(profileId);
    }

    const { data, error } = await supabase
      .from('workspace_members')
      .select(
        'id, user_id, email, full_name, role, status, permissions, created_at, invite_sent_at'
      )
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return ((data ?? []) as WorkspaceMemberRow[]).map(normalizeMember);
  },

  async invite(input: InviteWorkspaceMemberInput): Promise<TeamMember> {
    if (!supabase) {
      const currentMembers = teamMembersStorage.list(input.profileId);
      const nextMember = buildFallbackMember(input);
      teamMembersStorage.save(input.profileId, [nextMember, ...currentMembers]);
      return nextMember;
    }

    const { data, error } = await supabase.functions.invoke('invite-workspace-member', {
      body: {
        mode: 'invite',
        profileId: input.profileId,
        email: input.email.trim().toLowerCase(),
        fullName: input.name?.trim() || null,
        role: input.role,
        permissions: input.permissions,
      },
    });

    if (error) throw error;

    return normalizeMember(data.member as WorkspaceMemberRow);
  },

  async resendInvite(profileId: string, member: TeamMember): Promise<TeamMember> {
    if (!supabase) {
      const currentMembers = teamMembersStorage.list(profileId);
      const updatedMembers = currentMembers.map((currentMember) =>
        currentMember.id === member.id
          ? {
              ...currentMember,
              status: 'invited' as const,
              inviteSentAt: new Date().toISOString(),
            }
          : currentMember
      );
      teamMembersStorage.save(profileId, updatedMembers);
      return updatedMembers.find((currentMember) => currentMember.id === member.id) as TeamMember;
    }

    const { data, error } = await supabase.functions.invoke('invite-workspace-member', {
      body: {
        mode: 'resend',
        profileId,
        memberId: member.id,
        email: member.email,
      },
    });

    if (error) throw error;

    return normalizeMember(data.member as WorkspaceMemberRow);
  },

  async updateStatus(
    profileId: string,
    memberId: string,
    status: TeamMemberStatus
  ): Promise<TeamMember> {
    if (!supabase) {
      const currentMembers = teamMembersStorage.list(profileId);
      const updatedMembers = currentMembers.map((member) =>
        member.id === memberId ? { ...member, status: status as TeamMemberStatus } : member
      );
      teamMembersStorage.save(profileId, updatedMembers);
      return updatedMembers.find((member) => member.id === memberId) as TeamMember;
    }

    const { data, error } = await supabase
      .from('workspace_members')
      .update({
        status,
        invite_sent_at: status === 'invited' ? new Date().toISOString() : undefined,
      })
      .eq('id', memberId)
      .eq('profile_id', profileId)
      .select(
        'id, user_id, email, full_name, role, status, permissions, created_at, invite_sent_at'
      )
      .single();

    if (error) throw error;

    return normalizeMember(data as WorkspaceMemberRow);
  },

  async acceptInvite(inviteToken: string) {
    if (!supabase) {
      throw new Error('Supabase não está configurado.');
    }

    const { data, error } = await supabase.rpc('accept_workspace_invite', {
      invite_token_input: inviteToken,
    });

    if (error) throw error;

    return data;
  },
};
