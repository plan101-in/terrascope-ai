-- TerraScope AI: first-time Supabase setup for the browser-based application.
-- Run once in Supabase SQL Editor. Re-running is safe for tables/policies created here.
-- This script DOES NOT delete or reset existing rows, users, or image files.
-- Existing tables with a different schema are not silently rewritten.

create table if not exists public.terrascope_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  review_threshold double precision not null default 0.70,
  class_config jsonb not null default '[]'::jsonb,
  model_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.terrascope_predictions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  image_path text,
  image_name text,
  image_size_bytes bigint,
  image_width integer,
  image_height integer,
  predicted_class text not null,
  class_scores jsonb not null default '[]'::jsonb,
  model_score double precision not null default 0,
  model_version text,
  inference_ms double precision,
  review_threshold double precision not null default 0.70,
  practice_mode boolean not null default false,
  is_example boolean not null default false,
  in_review_queue boolean not null default false,
  review_status text not null default 'pending',
  reviewer_notes text,
  human_assigned_class text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.terrascope_review_events (
  id uuid primary key,
  prediction_id uuid not null references public.terrascope_predictions(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  previous_status text,
  new_status text,
  assigned_class text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.terrascope_evaluations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  import_hash text not null,
  model_name text not null,
  source_type text not null default 'synthetic',
  class_names jsonb not null default '[]'::jsonb,
  original_report jsonb,
  metrics jsonb not null default '{}'::jsonb,
  confusion_matrix jsonb not null default '[]'::jsonb,
  model_comparison jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, import_hash)
);

create index if not exists terrascope_predictions_user_created_idx
  on public.terrascope_predictions(user_id, created_at desc);
create index if not exists terrascope_review_queue_user_idx
  on public.terrascope_predictions(user_id, in_review_queue, created_at desc);
create index if not exists terrascope_review_events_user_created_idx
  on public.terrascope_review_events(user_id, created_at desc);
create index if not exists terrascope_evaluations_user_created_idx
  on public.terrascope_evaluations(user_id, created_at desc);

alter table public.terrascope_settings enable row level security;
alter table public.terrascope_predictions enable row level security;
alter table public.terrascope_review_events enable row level security;
alter table public.terrascope_evaluations enable row level security;

-- Every data operation is restricted to the currently authenticated user's rows.
-- Policies are added only when absent, so pre-existing policies are not overwritten.
do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'terrascope_settings', 'terrascope_predictions',
    'terrascope_review_events', 'terrascope_evaluations'
  ] loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = target_table
        and policyname = 'terrascope_select_own'
    ) then
      execute format('create policy terrascope_select_own on public.%I for select to authenticated using (user_id = (select auth.uid()))', target_table);
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = target_table
        and policyname = 'terrascope_insert_own'
    ) then
      execute format('create policy terrascope_insert_own on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', target_table);
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = target_table
        and policyname = 'terrascope_update_own'
    ) then
      execute format('create policy terrascope_update_own on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', target_table);
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = target_table
        and policyname = 'terrascope_delete_own'
    ) then
      execute format('create policy terrascope_delete_own on public.%I for delete to authenticated using (user_id = (select auth.uid()))', target_table);
    end if;
  end loop;
end $$;

-- Private image storage: USER_UUID/PREDICTION_UUID.jpg or .png.
insert into storage.buckets (id, name, public)
values ('terrascope-images', 'terrascope-images', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage'
      and tablename = 'objects' and policyname = 'terrascope_images_read_own'
  ) then
    create policy terrascope_images_read_own on storage.objects
      for select to authenticated
      using (bucket_id = 'terrascope-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'storage'
      and tablename = 'objects' and policyname = 'terrascope_images_upload_own'
  ) then
    create policy terrascope_images_upload_own on storage.objects
      for insert to authenticated
      with check (bucket_id = 'terrascope-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
end $$;

-- Verify: all four tables should appear, and the bucket should have public=false.
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename like 'terrascope_%'
order by tablename;
select id, public from storage.buckets where id = 'terrascope-images';
