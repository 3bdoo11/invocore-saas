-- ==============================================================================
-- InvoCore SaaS: Supabase Database Schema, Profiles, Activity Logs & Anti-Abuse
-- ==============================================================================
-- Paste this script into the Supabase SQL Editor and run it once.
-- ==============================================================================

-- 1. Create public.profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  company_name text,
  plan_tier text not null default 'free_trial' check (plan_tier in ('free_trial', 'pro')),
  invoices_generated integer not null default 0,
  max_trial_invoices integer not null default 3,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

-- Index for fast user lookups
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_plan_tier on public.profiles(plan_tier);

-- 2. Create public.activity_logs table for admin tracking
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  action_type text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);
create index if not exists idx_activity_logs_action on public.activity_logs(action_type);
create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);

-- 3. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.activity_logs enable row level security;

-- Profiles RLS Policies:
-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Users can update non-privileged fields on their own profile.
-- Protect plan_tier and max_trial_invoices: standard users cannot elevate their own tier.
create policy "Users can update non-privileged profile info"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Ensure user cannot manually upgrade plan_tier or increase max_trial_invoices
    and plan_tier = (select p.plan_tier from public.profiles p where p.id = auth.uid())
    and max_trial_invoices = (select p.max_trial_invoices from public.profiles p where p.id = auth.uid())
  );

-- Activity Logs RLS Policies:
-- Anyone (authenticated or guest) can insert activity logs
create policy "Anyone can insert activity logs"
  on public.activity_logs
  for insert
  with check (true);

-- Authenticated users can view their own activity logs
create policy "Users can view own activity logs"
  on public.activity_logs
  for select
  using (auth.uid() = user_id);

-- 4. Automated User Onboarding Trigger on auth.users
-- Automatically provisions a public.profiles row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    company_name,
    plan_tier,
    invoices_generated,
    max_trial_invoices,
    created_at,
    last_active_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'company_name', ''),
    'free_trial',
    0,
    3,
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    company_name = coalesce(excluded.company_name, public.profiles.company_name),
    last_active_at = now();

  -- Log the sign-up event
  insert into public.activity_logs (
    user_id,
    user_email,
    action_type,
    metadata
  )
  values (
    new.id,
    new.email,
    'SIGN_UP',
    jsonb_build_object(
      'full_name', new.raw_user_meta_data->>'full_name',
      'company_name', new.raw_user_meta_data->>'company_name'
    )
  );

  return new;
end;
$$;

-- Drop trigger if it already exists, then re-create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Atomic RPC: Safe Invoice Generation Counter Increment
-- Securely increments invoices_generated and updates last_active_at
create or replace function public.increment_invoice_count()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  curr_user_id uuid;
  v_invoices integer;
  v_plan text;
  v_max integer;
begin
  curr_user_id := auth.uid();

  if curr_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set
    invoices_generated = invoices_generated + 1,
    last_active_at = now()
  where id = curr_user_id
  returning invoices_generated, plan_tier, max_trial_invoices
  into v_invoices, v_plan, v_max;

  -- Insert activity log
  insert into public.activity_logs (
    user_id,
    user_email,
    action_type,
    metadata
  )
  values (
    curr_user_id,
    (select email from public.profiles where id = curr_user_id),
    'PRINT_INVOICE',
    jsonb_build_object(
      'invoices_generated', v_invoices,
      'plan_tier', v_plan,
      'max_trial_invoices', v_max
    )
  );

  return jsonb_build_object(
    'success', true,
    'invoices_generated', v_invoices,
    'plan_tier', v_plan,
    'max_trial_invoices', v_max
  );
end;
$$;

-- 6. Grant execute permissions
grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant insert on public.activity_logs to anon, authenticated;
grant select on public.activity_logs to authenticated;
grant execute on function public.increment_invoice_count() to authenticated;
