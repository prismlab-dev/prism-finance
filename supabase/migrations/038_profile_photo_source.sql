-- profiles.photo_url é a fonte única da foto de perfil. O app grava a foto nos
-- metadados do auth (updateSupabaseProfile); este trigger espelha em profiles,
-- e quem mostra foto (equipe, outros apps) lê só de profiles.
create or replace function public.sync_profile_photo_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    photo text := coalesce(
        nullif(btrim(new.raw_user_meta_data->>'photo_url'), ''),
        nullif(btrim(new.raw_user_meta_data->>'avatar_url'), '')
    );
begin
    insert into public.profiles(id, display_name, email, photo_url)
    values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'), ''), 'Usuario'), new.email, photo)
    on conflict (id) do update
        set photo_url = excluded.photo_url, updated_at = now()
        where profiles.photo_url is distinct from excluded.photo_url;
    return new;
end;
$$;

revoke all on function public.sync_profile_photo_from_auth() from public;

drop trigger if exists sync_profile_photo_from_auth on auth.users;
create trigger sync_profile_photo_from_auth
    after insert or update of raw_user_meta_data on auth.users
    for each row execute function public.sync_profile_photo_from_auth();

-- Backfill: fotos já salvas só nos metadados.
insert into public.profiles(id, display_name, email, photo_url)
select u.id, coalesce(nullif(btrim(u.raw_user_meta_data->>'display_name'), ''), 'Usuario'), u.email, coalesce(
           nullif(btrim(u.raw_user_meta_data->>'photo_url'), ''),
           nullif(btrim(u.raw_user_meta_data->>'avatar_url'), ''))
  from auth.users u
on conflict (id) do update
    set photo_url = excluded.photo_url, updated_at = now()
    where excluded.photo_url is not null
      and profiles.photo_url is distinct from excluded.photo_url;
