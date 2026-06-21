-- =========================================================================
-- FSS — Finance Shared Services
-- Supabase / PostgreSQL schema (run this in the Supabase SQL editor)
-- =========================================================================
-- Conventions:
--   * UUID primary keys (gen_random_uuid)
--   * is_active for soft delete
--   * created_at / updated_at audit columns
--   * Row Level Security enabled, with helper has_role()
-- =========================================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type app_role as enum ('SystemAdmin','Manager','StandardUser','ReadOnly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('Low','Medium','High','Critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('Not Started','In Progress','Completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_frequency as enum ('Daily','Weekly','Monthly','Quarterly','Half Yearly','Yearly','One Time');
exception when duplicate_object then null; end $$;

do $$ begin
  create type availability_type as enum ('Available','WFH','Leave','Training','Business Travel');
exception when duplicate_object then null; end $$;

-- ---------- Lookup / reference tables ----------
create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.work_categories (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sub_categories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.work_categories(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.priorities (
  id serial primary key,
  name task_priority unique not null
);
insert into public.priorities (name) values ('Low'),('Medium'),('High'),('Critical') on conflict do nothing;

create table if not exists public.statuses (
  id serial primary key,
  name task_status unique not null
);
insert into public.statuses (name) values ('Not Started'),('In Progress'),('Completed') on conflict do nothing;

create table if not exists public.frequencies (
  id serial primary key,
  name task_frequency unique not null
);
insert into public.frequencies (name) values ('Daily'),('Weekly'),('Monthly'),('Quarterly'),('Half Yearly'),('Yearly'),('One Time') on conflict do nothing;

create table if not exists public.closing_days (
  id serial primary key,
  day_number int unique not null check (day_number between 0 and 30),
  label text
);

-- ---------- Users & roles ----------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);

create table if not exists public.user_entities (
  user_id uuid not null references public.users(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  primary key (user_id, entity_id)
);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- ---------- Task templates ----------
create table if not exists public.task_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category_id uuid not null references public.work_categories(id),
  sub_category_id uuid not null references public.sub_categories(id),
  entity_id uuid references public.entities(id),
  default_owner uuid references public.users(id),
  priority task_priority not null default 'Medium',
  frequency task_frequency not null default 'One Time',
  closing_day int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Tasks ----------
create table if not exists public.task_instances (
  id uuid primary key default gen_random_uuid(),
  number text unique not null,                          -- e.g. FSS-MEC-GER-000001
  name text not null,
  description text,
  category_id uuid not null references public.work_categories(id),
  sub_category_id uuid not null references public.sub_categories(id),
  entity_id uuid not null references public.entities(id),
  owner_id uuid not null references public.users(id),
  priority task_priority not null default 'Medium',
  status task_status not null default 'Not Started',
  frequency task_frequency not null default 'One Time',
  closing_day int,
  due_date timestamptz not null,
  template_id uuid references public.task_templates(id),
  is_active boolean not null default true,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_task_instances_owner on public.task_instances(owner_id);
create index if not exists idx_task_instances_entity on public.task_instances(entity_id);
create index if not exists idx_task_instances_status on public.task_instances(status);
create index if not exists idx_task_instances_due on public.task_instances(due_date);
create index if not exists idx_task_instances_category on public.task_instances(category_id);

create table if not exists public.sub_tasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.task_instances(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_sub_tasks_task on public.sub_tasks(task_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.task_instances(id) on delete cascade,
  author_id uuid not null references public.users(id),
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_task on public.comments(task_id);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.task_instances(id) on delete cascade,
  uploaded_by uuid not null references public.users(id),
  storage_path text not null,           -- path in the Supabase Storage bucket
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_at timestamptz not null default now()
);
create index if not exists idx_attachments_task on public.attachments(task_id);

-- ---------- Notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  task_id uuid references public.task_instances(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read);

-- ---------- Availability ----------
create table if not exists public.availability_types (
  id serial primary key,
  name availability_type unique not null
);
insert into public.availability_types (name) values ('Available'),('WFH'),('Leave'),('Training'),('Business Travel') on conflict do nothing;

create table if not exists public.user_availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  type availability_type not null,
  note text,
  unique (user_id, date)
);
create index if not exists idx_user_availability_date on public.user_availability(date);

-- ---------- Favorites ----------
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  ref_type text not null check (ref_type in ('task','report','article','entity')),
  ref_id text not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (user_id, ref_type, ref_id)
);

-- ---------- Knowledge base ----------
create table if not exists public.knowledge_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.knowledge_folders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.knowledge_folders(id) on delete cascade,
  code text unique not null,
  title text not null,
  current_version text not null default 'v1.0',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_versions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.knowledge_articles(id) on delete cascade,
  version text not null,
  body text not null,
  author_id uuid references public.users(id),
  created_at timestamptz not null default now(),
  unique (article_id, version)
);

create table if not exists public.task_knowledge (
  task_id uuid not null references public.task_instances(id) on delete cascade,
  article_id uuid not null references public.knowledge_articles(id) on delete cascade,
  primary key (task_id, article_id)
);

-- ---------- Audit log (immutable) ----------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.task_instances(id) on delete cascade,
  actor_id uuid references public.users(id),
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_log_task on public.audit_log(task_id);
create index if not exists idx_audit_log_created on public.audit_log(created_at desc);

-- =========================================================================
-- GRANTS (required for PostgREST/Data API to reach tables)
-- =========================================================================
grant usage on schema public to anon, authenticated;

grant select on public.entities, public.work_categories, public.sub_categories,
                 public.priorities, public.statuses, public.frequencies,
                 public.closing_days, public.availability_types
  to authenticated;

grant select, insert, update, delete on
  public.users, public.user_roles, public.user_entities,
  public.task_templates, public.task_instances, public.sub_tasks,
  public.comments, public.attachments, public.notifications,
  public.user_availability, public.favorites,
  public.knowledge_folders, public.knowledge_articles, public.knowledge_versions,
  public.task_knowledge
  to authenticated;

grant select, insert on public.audit_log to authenticated;

grant all on all tables in schema public to service_role;

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
alter table public.users               enable row level security;
alter table public.user_roles          enable row level security;
alter table public.user_entities       enable row level security;
alter table public.task_templates      enable row level security;
alter table public.task_instances      enable row level security;
alter table public.sub_tasks           enable row level security;
alter table public.comments            enable row level security;
alter table public.attachments         enable row level security;
alter table public.notifications       enable row level security;
alter table public.user_availability   enable row level security;
alter table public.favorites           enable row level security;
alter table public.knowledge_folders   enable row level security;
alter table public.knowledge_articles  enable row level security;
alter table public.knowledge_versions  enable row level security;
alter table public.task_knowledge      enable row level security;
alter table public.audit_log           enable row level security;
alter table public.entities            enable row level security;
alter table public.work_categories     enable row level security;
alter table public.sub_categories      enable row level security;

-- Reference data: anyone authenticated can read
create policy ref_read_entities       on public.entities       for select to authenticated using (true);
create policy ref_read_categories     on public.work_categories for select to authenticated using (true);
create policy ref_read_subcategories  on public.sub_categories for select to authenticated using (true);

-- Users
create policy users_self_read       on public.users for select to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'SystemAdmin') or public.has_role(auth.uid(),'Manager'));
create policy users_self_update     on public.users for update to authenticated using (auth.uid() = id);
create policy users_admin_all       on public.users for all to authenticated using (public.has_role(auth.uid(),'SystemAdmin'));

create policy user_roles_self_read  on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'SystemAdmin'));
create policy user_roles_admin_all  on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'SystemAdmin'));

create policy user_entities_read    on public.user_entities for select to authenticated using (true);
create policy user_entities_admin   on public.user_entities for all to authenticated using (public.has_role(auth.uid(),'SystemAdmin') or public.has_role(auth.uid(),'Manager'));

-- Tasks: read for everyone authenticated, write for owner/manager/admin
create policy tasks_read   on public.task_instances for select to authenticated using (true);
create policy tasks_insert on public.task_instances for insert to authenticated with check (
  public.has_role(auth.uid(),'SystemAdmin') or public.has_role(auth.uid(),'Manager') or public.has_role(auth.uid(),'StandardUser')
);
create policy tasks_update on public.task_instances for update to authenticated using (
  owner_id = auth.uid() or public.has_role(auth.uid(),'SystemAdmin') or public.has_role(auth.uid(),'Manager')
);
create policy tasks_delete on public.task_instances for delete to authenticated using (
  public.has_role(auth.uid(),'SystemAdmin')
);

create policy sub_tasks_read on public.sub_tasks for select to authenticated using (true);
create policy sub_tasks_write on public.sub_tasks for all to authenticated using (
  exists (select 1 from public.task_instances t where t.id = task_id and (t.owner_id = auth.uid() or public.has_role(auth.uid(),'SystemAdmin') or public.has_role(auth.uid(),'Manager')))
);

create policy comments_read on public.comments for select to authenticated using (true);
create policy comments_insert on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy comments_modify on public.comments for update to authenticated using (author_id = auth.uid() or public.has_role(auth.uid(),'SystemAdmin'));

create policy attachments_read on public.attachments for select to authenticated using (true);
create policy attachments_insert on public.attachments for insert to authenticated with check (uploaded_by = auth.uid());
create policy attachments_delete on public.attachments for delete to authenticated using (uploaded_by = auth.uid() or public.has_role(auth.uid(),'SystemAdmin'));

create policy notifications_self on public.notifications for all to authenticated using (user_id = auth.uid());

create policy availability_self on public.user_availability for all to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'SystemAdmin') or public.has_role(auth.uid(),'Manager'));

create policy favorites_self on public.favorites for all to authenticated using (user_id = auth.uid());

create policy kb_read on public.knowledge_articles for select to authenticated using (true);
create policy kb_folders_read on public.knowledge_folders for select to authenticated using (true);
create policy kb_versions_read on public.knowledge_versions for select to authenticated using (true);
create policy kb_admin_write on public.knowledge_articles for all to authenticated using (public.has_role(auth.uid(),'SystemAdmin') or public.has_role(auth.uid(),'Manager'));
create policy kb_folders_admin on public.knowledge_folders for all to authenticated using (public.has_role(auth.uid(),'SystemAdmin') or public.has_role(auth.uid(),'Manager'));
create policy kb_versions_write on public.knowledge_versions for insert to authenticated with check (public.has_role(auth.uid(),'SystemAdmin') or public.has_role(auth.uid(),'Manager') or public.has_role(auth.uid(),'StandardUser'));

create policy task_kb_read on public.task_knowledge for select to authenticated using (true);
create policy task_kb_write on public.task_knowledge for all to authenticated using (public.has_role(auth.uid(),'SystemAdmin') or public.has_role(auth.uid(),'Manager'));

create policy audit_read on public.audit_log for select to authenticated using (true);
create policy audit_insert on public.audit_log for insert to authenticated with check (true);
-- Audit is intentionally append-only: no update/delete policies.

-- =========================================================================
-- Auto-create profile + assign default role on signup
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'StandardUser') on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- Storage bucket for attachments (run separately or via the Supabase dashboard)
-- =========================================================================
-- insert into storage.buckets (id, name, public) values ('fss-attachments', 'fss-attachments', false)
-- on conflict (id) do nothing;
--
-- create policy "attachments read for authenticated"
--   on storage.objects for select to authenticated
--   using (bucket_id = 'fss-attachments');
-- create policy "attachments upload"
--   on storage.objects for insert to authenticated
--   with check (bucket_id = 'fss-attachments' and owner = auth.uid());

-- =========================================================================
-- PROMOTE YOUR FIRST ADMIN — after you sign up, run:
--   insert into public.user_roles (user_id, role)
--   values ('<your-auth-uid>', 'SystemAdmin');
-- =========================================================================
