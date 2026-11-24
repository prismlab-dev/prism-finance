-- Expõe a foto de perfil dos membros na equipe atual.
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
                'photo_url', nullif(btrim(p.photo_url), ''),
                'role', tm.role, 'joined_at', tm.joined_at
            ) order by tm.joined_at, tm.user_id)
              from public.team_members tm
              left join public.profiles p on p.id = tm.user_id
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

revoke all on function public.get_current_team() from public;
grant execute on function public.get_current_team() to authenticated;
