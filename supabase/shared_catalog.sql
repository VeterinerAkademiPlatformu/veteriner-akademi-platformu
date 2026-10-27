-- Shared academic course catalog and per-student topic progress.
-- Run only in the Veteriner Akademi Platformu Supabase project.
-- Safe to re-run: creates missing tables and replaces only policies owned by this app.

create table if not exists public.shared_courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year integer not null default 1,
  color text not null default 'teal',
  description text not null default '',
  published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shared_course_topics (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.shared_courses(id) on delete cascade,
  title text not null,
  summary text not null,
  keypoint text not null default '',
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_topic_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.shared_course_topics(id) on delete cascade,
  done boolean not null default false,
  needs_review boolean not null default false,
  last_reviewed date,
  recalled_count integer not null default 0 check (recalled_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create index if not exists shared_courses_published_sort_idx
  on public.shared_courses (published, sort_order, name);
create index if not exists shared_course_topics_course_sort_idx
  on public.shared_course_topics (course_id, published, sort_order, title);
create index if not exists student_topic_progress_topic_idx
  on public.student_topic_progress (topic_id);

alter table public.shared_courses enable row level security;
alter table public.shared_course_topics enable row level security;
alter table public.student_topic_progress enable row level security;

drop policy if exists "Published shared courses are readable" on public.shared_courses;
drop policy if exists "Admins can insert shared courses" on public.shared_courses;
drop policy if exists "Admins can update shared courses" on public.shared_courses;
drop policy if exists "Admins can delete shared courses" on public.shared_courses;

create policy "Published shared courses are readable"
  on public.shared_courses for select to anon, authenticated
  using (published = true or coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');
create policy "Admins can insert shared courses"
  on public.shared_courses for insert to authenticated
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');
create policy "Admins can update shared courses"
  on public.shared_courses for update to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin')
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');
create policy "Admins can delete shared courses"
  on public.shared_courses for delete to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

drop policy if exists "Published topics in published courses are readable" on public.shared_course_topics;
drop policy if exists "Admins can insert shared course topics" on public.shared_course_topics;
drop policy if exists "Admins can update shared course topics" on public.shared_course_topics;
drop policy if exists "Admins can delete shared course topics" on public.shared_course_topics;

create policy "Published topics in published courses are readable"
  on public.shared_course_topics for select to anon, authenticated
  using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
    or (
      published = true
      and exists (
        select 1 from public.shared_courses c
        where c.id = course_id and c.published = true
      )
    )
  );
create policy "Admins can insert shared course topics"
  on public.shared_course_topics for insert to authenticated
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');
create policy "Admins can update shared course topics"
  on public.shared_course_topics for update to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin')
  with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');
create policy "Admins can delete shared course topics"
  on public.shared_course_topics for delete to authenticated
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

drop policy if exists "Students can read their own topic progress" on public.student_topic_progress;
drop policy if exists "Students can insert their own topic progress" on public.student_topic_progress;
drop policy if exists "Students can update their own topic progress" on public.student_topic_progress;
drop policy if exists "Students can delete their own topic progress" on public.student_topic_progress;

create policy "Students can read their own topic progress"
  on public.student_topic_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Students can insert their own topic progress"
  on public.student_topic_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Students can update their own topic progress"
  on public.student_topic_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Students can delete their own topic progress"
  on public.student_topic_progress for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select on public.shared_courses, public.shared_course_topics to anon;
grant select, insert, update, delete on public.shared_courses, public.shared_course_topics to authenticated;
grant select, insert, update, delete on public.student_topic_progress to authenticated;
revoke all on public.student_topic_progress from anon;
revoke truncate, references, trigger on table public.shared_courses, public.shared_course_topics, public.student_topic_progress from public, anon, authenticated;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('shared_courses', 'shared_course_topics', 'student_topic_progress')
order by tablename;
