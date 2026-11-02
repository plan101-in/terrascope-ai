-- TerraScope AI: repair-only migration for the Supabase schema from our earlier setup.
-- Run AFTER creating the four terrascope_* tables and the private terrascope-images bucket.
-- This does not delete existing records or images.

-- Historical predictions must survive "Remove from queue" and "Clear queue".
-- Existing saved predictions are retained as queue entries to preserve old behavior.
alter table public.terrascope_predictions
  add column if not exists in_review_queue boolean not null default true;

-- Newly classified images become review submissions only after explicit submission.
alter table public.terrascope_predictions
  alter column in_review_queue set default false;

create index if not exists terrascope_review_queue_user_idx
  on public.terrascope_predictions(user_id, in_review_queue, created_at desc);

-- Ensure RLS is still enabled on all four tables.
alter table public.terrascope_settings enable row level security;
alter table public.terrascope_predictions enable row level security;
alter table public.terrascope_review_events enable row level security;
alter table public.terrascope_evaluations enable row level security;

-- Verify the four tables and new field exist.
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'terrascope_settings', 'terrascope_predictions',
    'terrascope_review_events', 'terrascope_evaluations'
  )
  and column_name in ('user_id', 'in_review_queue', 'review_status', 'metrics')
order by table_name, column_name;
