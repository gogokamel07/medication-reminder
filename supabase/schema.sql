-- Run this whole file once in Supabase: SQL Editor > New query > paste > Run.

create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Africa/Cairo',
  reminders_enabled boolean not null default true
);

create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  dose text not null default '1 pill',
  times text[] not null,            -- e.g. {08:00,20:00}  (24h, user's timezone)
  start_date date not null,
  end_date date,                    -- null = no end
  created_at timestamptz not null default now()
);

create table if not exists public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  dose_date date not null,
  dose_time text not null,          -- "08:00"
  taken_at timestamptz not null default now(),
  unique (medicine_id, dose_date, dose_time)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  text text not null,
  created_at timestamptz not null default now()
);

-- Prevents sending the same reminder twice
create table if not exists public.reminders_sent (
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  dose_date date not null,
  dose_time text not null,
  sent_at timestamptz not null default now(),
  primary key (medicine_id, dose_date, dose_time)
);

alter table public.settings enable row level security;
alter table public.medicines enable row level security;
alter table public.dose_logs enable row level security;
alter table public.messages enable row level security;
alter table public.reminders_sent enable row level security;  -- no policies: only the server (service role) uses it

create policy "own settings" on public.settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own medicines" on public.medicines for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own logs" on public.dose_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own messages" on public.messages for all using (user_id = auth.uid()) with check (user_id = auth.uid());
