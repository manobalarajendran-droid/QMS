-- =====================================================================
-- PlantTech QMS - database schema
--
-- Run this once, whole, in the Supabase SQL editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
-- It is safe to run again: every statement is written to be repeatable.
--
-- Three tables:
--   profiles     - one row per person who can sign in, and their role
--   qms_records  - every QMS record in the app, one row each
--   audit_log    - append-only history of who changed what
--
-- Row level security is ON for all three. Nothing is readable by an
-- anonymous visitor, which is what makes it safe for the anon key to ship
-- inside the app bundle.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. People
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  display_name  text not null default '',
  role          text not null default 'qa_engineer',
  department    text,
  -- New sign-ups land here as false. An admin has to switch them on before
  -- they can change anything. Sign-up is open on this project, so without
  -- this gate anyone who finds the URL could write to the QMS.
  is_active     boolean not null default false,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in (
    'admin', 'qa_manager', 'qa_engineer', 'auditor', 'reviewer', 'department_spoc'
  ));


-- Helper functions. SECURITY DEFINER so a policy on `profiles` can read
-- `profiles` without recursing into its own policy.

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_active from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' and is_active
                   from public.profiles where id = auth.uid()), false);
$$;


-- Give every new auth user a profile automatically.
-- The very first person to sign up becomes an active admin, so that whoever
-- sets the system up is not locked out. Everybody after them is inactive
-- until that admin approves them.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  first_user boolean;
begin
  select count(*) = 0 into first_user from public.profiles;

  insert into public.profiles (id, email, display_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    case when first_user then 'admin' else 'qa_engineer' end,
    first_user
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


alter table public.profiles enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (true);  -- everyone signed in can see who is who; needed for owner pickers

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A person can edit their own row but must not be able to promote themselves
-- to admin or switch their own account on. Only an admin changes those two.
create or replace function public.guard_profile_self_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role or new.is_active is distinct from old.is_active then
    raise exception 'Only an admin can change a role or activate an account';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_self_edit on public.profiles;
create trigger profiles_guard_self_edit
  before update on public.profiles
  for each row execute function public.guard_profile_self_edit();


-- ---------------------------------------------------------------------
-- 2. The QMS records themselves
--
-- One row per record, not one row per table dump. That is the whole point:
-- two people editing two different NCRs now touch two different rows and
-- cannot overwrite each other. `data` holds the record exactly as the app
-- already shapes it, so no screen has to be rewritten to use this.
-- ---------------------------------------------------------------------

create table if not exists public.qms_records (
  collection  text not null,
  record_id   text not null,
  data        jsonb not null,
  -- Soft delete. Quality records are not thrown away; they are marked
  -- withdrawn so the history stays auditable.
  deleted     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id),
  primary key (collection, record_id)
);

create index if not exists qms_records_collection_idx
  on public.qms_records (collection) where deleted = false;
create index if not exists qms_records_updated_idx
  on public.qms_records (updated_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists qms_records_touch on public.qms_records;
create trigger qms_records_touch
  before insert or update on public.qms_records
  for each row execute function public.touch_updated_at();

alter table public.qms_records enable row level security;

-- Read: any signed-in, approved person. A QMS is meant to be visible to the
-- company; the control that matters is over who can change it.
drop policy if exists qms_records_read on public.qms_records;
create policy qms_records_read on public.qms_records
  for select to authenticated
  using (public.is_active_user());

-- Write: approved people, except read-only roles.
drop policy if exists qms_records_write on public.qms_records;
create policy qms_records_write on public.qms_records
  for insert to authenticated
  with check (public.is_active_user() and public.current_role() not in ('auditor', 'reviewer'));

drop policy if exists qms_records_modify on public.qms_records;
create policy qms_records_modify on public.qms_records
  for update to authenticated
  using (public.is_active_user() and public.current_role() not in ('auditor', 'reviewer'))
  with check (public.is_active_user() and public.current_role() not in ('auditor', 'reviewer'));

-- Hard delete is admin-only. Everyone else soft-deletes via the flag above.
drop policy if exists qms_records_delete on public.qms_records;
create policy qms_records_delete on public.qms_records
  for delete to authenticated
  using (public.is_admin());


-- ---------------------------------------------------------------------
-- 3. Audit trail
--
-- Append only. There is deliberately no update and no delete policy, so
-- not even an admin can quietly rewrite history through the app.
-- ---------------------------------------------------------------------

create table if not exists public.audit_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  actor_id    uuid references public.profiles (id),
  actor_email text,
  action      text not null,
  collection  text,
  record_id   text,
  summary     text,
  before      jsonb,
  after       jsonb
);

create index if not exists audit_log_at_idx on public.audit_log (at desc);
create index if not exists audit_log_record_idx on public.audit_log (collection, record_id);

alter table public.audit_log enable row level security;

drop policy if exists audit_log_read on public.audit_log;
create policy audit_log_read on public.audit_log
  for select to authenticated
  using (public.is_active_user());

drop policy if exists audit_log_append on public.audit_log;
create policy audit_log_append on public.audit_log
  for insert to authenticated
  with check (public.is_active_user() and actor_id = auth.uid());


-- ---------------------------------------------------------------------
-- 4. Retire the old sync table
--
-- `ied_state` held the entire app state as a single row, which meant two
-- people saving at once wiped each other. It is empty, and nothing points
-- at it any more. Left in place rather than dropped, in case anything
-- outside this app still reads it.
-- ---------------------------------------------------------------------

comment on table public.qms_records is
  'One row per QMS record. Replaces the single-row blob in ied_state.';
