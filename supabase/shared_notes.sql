-- Shared text-only study notes for Veteriner Akademi Platformu.
-- Safe to re-run in this application's Supabase project.

create table if not exists public.shared_notes (
  id uuid primary key default gen_random_uuid(),
  course text not null,
  topic text not null default '',
  title text not null,
  content text not null,
  published boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shared_notes enable row level security;

drop policy if exists "Published shared notes are readable" on public.shared_notes;
drop policy if exists "Admins can insert shared notes" on public.shared_notes;
drop policy if exists "Admins can update shared notes" on public.shared_notes;
drop policy if exists "Admins can delete shared notes" on public.shared_notes;

create policy "Published shared notes are readable"
  on public.shared_notes for select to anon, authenticated
  using (
    published = true
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  );

create policy "Admins can insert shared notes"
  on public.shared_notes for insert to authenticated
  with check (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  );

create policy "Admins can update shared notes"
  on public.shared_notes for update to authenticated
  using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  )
  with check (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  );

create policy "Admins can delete shared notes"
  on public.shared_notes for delete to authenticated
  using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  );

revoke all on table public.shared_notes from anon;
grant select on table public.shared_notes to anon;
grant select, insert, update, delete on table public.shared_notes to authenticated;
revoke truncate, references, trigger on table public.shared_notes from public, anon, authenticated;

-- Verify row-level security is enabled.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename = 'shared_notes';
