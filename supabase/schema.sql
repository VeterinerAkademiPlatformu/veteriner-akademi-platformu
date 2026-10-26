-- Veteriner Akademi Platformu
-- Run ONLY in the new Supabase project created for this application.
-- Do not run this in the unrelated ciftlik-simulasyonu project.

create table if not exists public.student_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_workspaces enable row level security;

-- Remove/recreate only these application-owned policies so this script is repeatable.
drop policy if exists "Students can read their own workspace" on public.student_workspaces;
drop policy if exists "Students can create their own workspace" on public.student_workspaces;
drop policy if exists "Students can update their own workspace" on public.student_workspaces;
drop policy if exists "Students can delete their own workspace" on public.student_workspaces;

create policy "Students can read their own workspace"
  on public.student_workspaces
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Students can create their own workspace"
  on public.student_workspaces
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Students can update their own workspace"
  on public.student_workspaces
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Students can delete their own workspace"
  on public.student_workspaces
  for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.student_workspaces to authenticated;
revoke all on public.student_workspaces from anon;

-- Verify RLS is enabled:
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'student_workspaces';
