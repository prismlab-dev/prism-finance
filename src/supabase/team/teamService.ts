import type { TeamInvite, TeamInviteRole, TeamMember, TeamRole, TeamSummary } from "../../context/teamTypes";
import { getSupabaseClient } from "../supabaseClient";

interface TeamMemberRow {
    user_id: string;
    display_name: string;
    email: string | null;
    photo_url?: string | null;
    role: TeamRole;
    joined_at: string;
}

interface TeamInviteRow {
    id: string;
    code: string;
    role: TeamInviteRole;
    created_at: string;
}

interface TeamSummaryRow {
    id: string;
    name: string;
    avatar_image: string | null;
    max_members: number;
    current_user_role: TeamRole;
    members: TeamMemberRow[];
    invites: TeamInviteRow[];
}

function throwRpcError(error: Error | null): void {
    if (error) {
        throw error;
    }
}

function fromMemberRow(row: TeamMemberRow): TeamMember {
    return { uid: row.user_id, displayName: row.display_name, email: row.email, photoUrl: row.photo_url ?? null, role: row.role, joinedAt: row.joined_at };
}

function fromInviteRow(row: TeamInviteRow): TeamInvite {
    return { inviteId: row.id, code: row.code, role: row.role, createdAt: row.created_at };
}

export async function loadCurrentTeam(): Promise<TeamSummary | null> {
    const result = await getSupabaseClient().rpc("get_current_team");
    throwRpcError(result.error);
    const row = result.data as TeamSummaryRow | null;
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        name: row.name,
        avatarImage: row.avatar_image,
        maxMembers: row.max_members,
        currentUserRole: row.current_user_role,
        members: (row.members ?? []).map(fromMemberRow),
        invites: (row.invites ?? []).map(fromInviteRow),
    };
}

export async function createSupabaseTeam(name: string, avatarImage: string | null): Promise<void> {
    const result = await getSupabaseClient().rpc("create_team", { team_name: name, team_avatar_image: avatarImage });
    throwRpcError(result.error);
}

export async function updateSupabaseTeam(teamId: string, name: string, avatarImage: string | null): Promise<void> {
    const result = await getSupabaseClient().rpc("update_team", { target_team_id: teamId, team_name: name, team_avatar_image: avatarImage });
    throwRpcError(result.error);
}

export async function createSupabaseTeamInvite(teamId: string, role: TeamInviteRole): Promise<TeamInvite> {
    const result = await getSupabaseClient().rpc("create_team_invite", { target_team_id: teamId, invite_role: role });
    throwRpcError(result.error);
    return fromInviteRow(result.data as TeamInviteRow);
}

export async function acceptSupabaseTeamInvite(code: string): Promise<void> {
    const result = await getSupabaseClient().rpc("accept_team_invite", { invite_code: code });
    throwRpcError(result.error);
}

export async function cancelSupabaseTeamInvite(teamId: string, inviteId: string): Promise<void> {
    const result = await getSupabaseClient().rpc("cancel_team_invite", { target_team_id: teamId, target_invite_id: inviteId });
    throwRpcError(result.error);
}

export async function updateSupabaseTeamMemberRole(teamId: string, userId: string, role: TeamInviteRole): Promise<void> {
    const result = await getSupabaseClient().rpc("update_team_member_role", { target_team_id: teamId, target_user_id: userId, new_role: role });
    throwRpcError(result.error);
}

export async function removeSupabaseTeamMember(teamId: string, userId: string): Promise<void> {
    const result = await getSupabaseClient().rpc("remove_team_member", { target_team_id: teamId, target_user_id: userId });
    throwRpcError(result.error);
}

export async function deleteSupabaseTeam(teamId: string): Promise<void> {
    const result = await getSupabaseClient().rpc("delete_team", { target_team_id: teamId });
    throwRpcError(result.error);
}
