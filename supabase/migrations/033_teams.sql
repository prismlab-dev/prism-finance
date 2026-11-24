-- Teams (equipes): a shared workspace separate from the family. Like the
-- family tables, they are readable by members and writable only through RPCs.
-- Roles: owner (exactly one, cannot leave or be demoted), admin (manages
-- invites and non-admin members), member (edits team finances), viewer (reads).

create table if not exists public.teams (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(btrim(name)) between 1 and 80),
    avatar_image text check (avatar_image is null or char_length(avatar_image) <= 400000),
    max_members integer not null default 20 check (max_members between 2 and 100),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
    team_id uuid not null references public.teams(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    display_name text not null,
    email text,
    role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
    joined_at timestamptz not null default now(),
    primary key (team_id, user_id)
);

-- ponytail: one team per user, mirrors the family model; drop this index and
-- key get_current_team by team id when users need several teams.
create unique index if not exists team_members_one_team_per_user_idx on public.team_members(user_id);
create unique index if not exists team_members_one_owner_idx on public.team_members(team_id) where role = 'owner';

-- The owner row only disappears when the owner's account is deleted (the RPCs
-- refuse it otherwise); take the team with it instead of leaving it ownerless.
create or replace function public.delete_team_without_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if old.role = 'owner' then
        delete from public.teams where id = old.team_id;
    end if;
    return old;
end;
$$;

drop trigger if exists team_members_delete_ownerless_team on public.team_members;
create trigger team_members_delete_ownerless_team
after delete on public.team_members
for each row execute function public.delete_team_without_owner();

create table if not exists public.team_invites (
    id uuid primary key default gen_random_uuid(),
    team_id uuid not null references public.teams(id) on delete cascade,
    code text not null unique,
    role text not null check (role in ('admin', 'member', 'viewer')),
    created_by uuid not null references auth.users(id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
    created_at timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '7 days'),
    accepted_by uuid references auth.users(id) on delete set null,
    accepted_at timestamptz
);

create index if not exists team_invites_team_status_idx on public.team_invites(team_id, status, expires_at);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;

create or replace function public.current_team_role(target_team_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select role from public.team_members where team_id = target_team_id and user_id = auth.uid();
$$;

create or replace function public.is_team_manager(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select coalesce(public.current_team_role(target_team_id) in ('owner', 'admin'), false);
$$;

drop policy if exists "teams-member-read" on public.teams;
create policy "teams-member-read" on public.teams
    for select to authenticated
    using (public.current_team_role(id) is not null);

drop policy if exists "team-members-member-read" on public.team_members;
create policy "team-members-member-read" on public.team_members
    for select to authenticated
    using (public.current_team_role(team_id) is not null);

drop policy if exists "team-invites-manager-read" on public.team_invites;
create policy "team-invites-manager-read" on public.team_invites
    for select to authenticated
    using (public.is_team_manager(team_id));

revoke insert, update, delete on public.teams from anon, authenticated;
revoke insert, update, delete on public.team_members from anon, authenticated;
revoke insert, update, delete on public.team_invites from anon, authenticated;

create or replace function public.insert_current_user_as_team_member(target_team_id uuid, member_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    insert into public.team_members(team_id, user_id, display_name, email, role)
    select target_team_id, auth.uid(), coalesce(nullif(p.display_name, ''), 'Usuario'), p.email, member_role
      from (select auth.uid() as id) u
      left join public.profiles p on p.id = u.id;
end;
$$;

create or replace function public.create_team(team_name text, team_avatar_image text default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    new_team_id uuid;
begin
    if auth.uid() is null then
        raise exception 'TEAM_AUTH_REQUIRED' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.team_members where user_id = auth.uid()) then
        raise exception 'TEAM_ALREADY_MEMBER' using errcode = 'P0001';
    end if;

    insert into public.teams(name, avatar_image)
    values (coalesce(nullif(btrim(team_name), ''), 'Minha equipe'), nullif(team_avatar_image, ''))
    returning id into new_team_id;

    perform public.insert_current_user_as_team_member(new_team_id, 'owner');
    return new_team_id;
end;
$$;

create or replace function public.update_team(target_team_id uuid, team_name text, team_avatar_image text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if not public.is_team_manager(target_team_id) then
        raise exception 'TEAM_ADMIN_REQUIRED' using errcode = '42501';
    end if;
    update public.teams
       set name = coalesce(nullif(btrim(team_name), ''), name),
           avatar_image = nullif(team_avatar_image, ''),
           updated_at = now()
     where id = target_team_id;
end;
$$;

create or replace function public.create_team_invite(target_team_id uuid, invite_role text default 'member')
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
    invite public.team_invites%rowtype;
begin
    if not public.is_team_manager(target_team_id) then
        raise exception 'TEAM_ADMIN_REQUIRED' using errcode = '42501';
    end if;
    if invite_role = 'admin' and public.current_team_role(target_team_id) <> 'owner' then
        raise exception 'TEAM_OWNER_REQUIRED' using errcode = '42501';
    end if;

    insert into public.team_invites(team_id, code, role, created_by)
    values (target_team_id, upper(encode(gen_random_bytes(10), 'hex')), invite_role, auth.uid())
    returning * into invite;

    return jsonb_build_object('id', invite.id, 'code', invite.code, 'role', invite.role, 'created_at', invite.created_at);
end;
$$;

create or replace function public.accept_team_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    invite public.team_invites%rowtype;
    team_limit integer;
begin
    if auth.uid() is null then
        raise exception 'TEAM_AUTH_REQUIRED' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.team_members where user_id = auth.uid()) then
        raise exception 'TEAM_ALREADY_MEMBER' using errcode = 'P0001';
    end if;

    select * into invite
      from public.team_invites
     where code = upper(btrim(invite_code)) and status = 'pending' and expires_at > now()
     for update;
    if not found then
        raise exception 'TEAM_INVITE_INVALID_OR_EXPIRED' using errcode = 'P0001';
    end if;

    select max_members into team_limit from public.teams where id = invite.team_id for update;
    if (select count(*) from public.team_members where team_id = invite.team_id) >= team_limit then
        raise exception 'TEAM_MEMBER_LIMIT_REACHED' using errcode = 'P0001';
    end if;

    perform public.insert_current_user_as_team_member(invite.team_id, invite.role);
    update public.team_invites
       set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
     where id = invite.id;
    return invite.team_id;
end;
$$;

create or replace function public.cancel_team_invite(target_team_id uuid, target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if not public.is_team_manager(target_team_id) then
        raise exception 'TEAM_ADMIN_REQUIRED' using errcode = '42501';
    end if;
    update public.team_invites
       set status = 'cancelled'
     where team_id = target_team_id and id = target_invite_id and status = 'pending';
end;
$$;

-- Shared guard for removing or re-roling someone: the owner is untouchable,
-- and only the owner may act on admins.
create or replace function public.assert_can_manage_team_member(target_team_id uuid, target_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
    caller_role text := public.current_team_role(target_team_id);
    target_role text;
begin
    select role into target_role from public.team_members where team_id = target_team_id and user_id = target_user_id;
    if target_role is null then
        raise exception 'TEAM_MEMBER_NOT_FOUND' using errcode = 'P0001';
    end if;
    if target_role = 'owner' then
        raise exception 'TEAM_OWNER_IS_PROTECTED' using errcode = 'P0001';
    end if;
    if caller_role is null or caller_role not in ('owner', 'admin') or (target_role = 'admin' and caller_role <> 'owner') then
        raise exception 'TEAM_ADMIN_REQUIRED' using errcode = '42501';
    end if;
    return caller_role;
end;
$$;

create or replace function public.update_team_member_role(target_team_id uuid, target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if new_role not in ('admin', 'member', 'viewer') then
        raise exception 'TEAM_ROLE_INVALID' using errcode = '22023';
    end if;
    if public.assert_can_manage_team_member(target_team_id, target_user_id) <> 'owner' and new_role = 'admin' then
        raise exception 'TEAM_OWNER_REQUIRED' using errcode = '42501';
    end if;
    update public.team_members set role = new_role where team_id = target_team_id and user_id = target_user_id;
end;
$$;

-- Managers remove others; anyone but the owner can remove themselves (leave).
create or replace function public.remove_team_member(target_team_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if target_user_id = auth.uid() then
        if public.current_team_role(target_team_id) = 'owner' then
            raise exception 'TEAM_OWNER_IS_PROTECTED' using errcode = 'P0001';
        end if;
    else
        perform public.assert_can_manage_team_member(target_team_id, target_user_id);
    end if;
    delete from public.team_members where team_id = target_team_id and user_id = target_user_id;
end;
$$;

create or replace function public.delete_team(target_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if public.current_team_role(target_team_id) is distinct from 'owner' then
        raise exception 'TEAM_OWNER_REQUIRED' using errcode = '42501';
    end if;
    delete from public.teams where id = target_team_id;
end;
$$;

create or replace function public.get_current_team()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'avatar_image', t.avatar_image,
        'max_members', t.max_members,
        'current_user_role', m.role,
        'members', coalesce((
            select jsonb_agg(jsonb_build_object(
                'user_id', tm.user_id, 'display_name', tm.display_name, 'email', tm.email,
                'role', tm.role, 'joined_at', tm.joined_at
            ) order by tm.joined_at, tm.user_id)
              from public.team_members tm
             where tm.team_id = t.id
        ), '[]'::jsonb),
        'invites', case when m.role in ('owner', 'admin') then coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', ti.id, 'code', ti.code, 'role', ti.role, 'created_at', ti.created_at
            ) order by ti.created_at desc)
              from public.team_invites ti
             where ti.team_id = t.id and ti.status = 'pending' and ti.expires_at > now()
        ), '[]'::jsonb) else '[]'::jsonb end
    )
      from public.team_members m
      join public.teams t on t.id = m.team_id
     where m.user_id = auth.uid();
$$;

revoke all on function public.delete_team_without_owner() from public;
revoke all on function public.current_team_role(uuid) from public;
revoke all on function public.is_team_manager(uuid) from public;
revoke all on function public.insert_current_user_as_team_member(uuid, text) from public;
revoke all on function public.assert_can_manage_team_member(uuid, uuid) from public;
revoke all on function public.create_team(text, text) from public;
revoke all on function public.update_team(uuid, text, text) from public;
revoke all on function public.create_team_invite(uuid, text) from public;
revoke all on function public.accept_team_invite(text) from public;
revoke all on function public.cancel_team_invite(uuid, uuid) from public;
revoke all on function public.update_team_member_role(uuid, uuid, text) from public;
revoke all on function public.remove_team_member(uuid, uuid) from public;
revoke all on function public.delete_team(uuid) from public;
revoke all on function public.get_current_team() from public;

grant execute on function public.current_team_role(uuid) to authenticated;
grant execute on function public.is_team_manager(uuid) to authenticated;
grant execute on function public.create_team(text, text) to authenticated;
grant execute on function public.update_team(uuid, text, text) to authenticated;
grant execute on function public.create_team_invite(uuid, text) to authenticated;
grant execute on function public.accept_team_invite(text) to authenticated;
grant execute on function public.cancel_team_invite(uuid, uuid) to authenticated;
grant execute on function public.update_team_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_team_member(uuid, uuid) to authenticated;
grant execute on function public.delete_team(uuid) to authenticated;
grant execute on function public.get_current_team() to authenticated;
