create extension if not exists pgcrypto;
create table if not exists public.payment_slips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  bank text not null default '',
  title text not null default '',
  acct text not null default '',
  date date not null default current_date,
  plabel text not null default 'Previous Balance',
  prev numeric not null default 0,
  advance_payment numeric not null default 0,
  rows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payment_slips_owner_date_idx on public.payment_slips(owner_id,date desc);
alter table public.payment_slips enable row level security;
drop policy if exists "Users can read own slips" on public.payment_slips;
drop policy if exists "Users can insert own slips" on public.payment_slips;
drop policy if exists "Users can update own slips" on public.payment_slips;
drop policy if exists "Users can delete own slips" on public.payment_slips;
create policy "Users can read own slips" on public.payment_slips for select using (auth.uid()=owner_id);
create policy "Users can insert own slips" on public.payment_slips for insert with check (auth.uid()=owner_id);
create policy "Users can update own slips" on public.payment_slips for update using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
create policy "Users can delete own slips" on public.payment_slips for delete using (auth.uid()=owner_id);
