-- Run this script in your Supabase SQL Editor

-- 1. Create the Complaints Table
create table if not exists public.complaints (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  subject text not null,
  description text not null,
  status text default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  images text[] default '{}',
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security (RLS)
alter table public.complaints enable row level security;

-- 3. Create Policy: Authenticated users can create complaints
create policy "Users can insert their own complaints"
on public.complaints for insert
to authenticated
with check (auth.uid() = user_id);

-- 4. Create Policy: Authenticated users can view their own complaints
create policy "Users can view their own complaints"
on public.complaints for select
to authenticated
using (auth.uid() = user_id);

-- 5. Create Storage Bucket for Evidence
insert into storage.buckets (id, name, public)
values ('support-evidence', 'support-evidence', true)
on conflict (id) do nothing;

-- 6. Storage Policy: Authenticated users can upload evidence
create policy "Authenticated users can upload evidence"
on storage.objects for insert
to authenticated
with check (bucket_id = 'support-evidence');

-- 7. Storage Policy: Anyone (Public) can view evidence (since the bucket is public)
create policy "Anyone can view evidence"
on storage.objects for select
to public
using (bucket_id = 'support-evidence');



-- Allow users to delete their own complaints ONLY if they are 'open'
create policy "Users can delete their own open complaints"
on public.complaints for delete
to authenticated
using (auth.uid() = user_id and status = 'open');


-- 8. Storage Policy: Authenticated users can delete their own evidence
-- Note: In a real prod app, you might want to link this to the user_id in the path
-- For now, we allow authenticated users to delete files in the bucket
-- 8. Storage Policy: Authenticated users can delete their own evidence
-- Note: In a real prod app, you might want to link this to the user_id in the path
-- For now, we allow authenticated users to delete files in the bucket
create policy "Authenticated users can delete evidence"
on storage.objects for delete
to authenticated
using (bucket_id = 'support-evidence');


-- 9. Create Profiles Table (Publicly Accessible User Data)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  dob date,
  gender text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 10. Enable RLS for Profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 11. Create a Trigger to auto-create profile on Signup
-- This function copies data from auth.users -> public.profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, dob, gender)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    (new.raw_user_meta_data->>'dob')::date,
    new.raw_user_meta_data->>'gender'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 12. Create a Trigger to auto-update profile on Update
-- This function keeps public.profiles in sync when auth.users metadata changes
create or replace function public.handle_user_update()
returns trigger as $$
begin
  update public.profiles
  set
    full_name = new.raw_user_meta_data->>'full_name',
    dob = (new.raw_user_meta_data->>'dob')::date,
    gender = new.raw_user_meta_data->>'gender',
    updated_at = now()
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_update();

-- 13. Create Notifications Table
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  "userId" uuid references auth.users(id) on delete cascade,
  type varchar(20) not null check (type in ('alert', 'info', 'reminder', 'news')),
  title varchar(100) not null,
  message text not null,
  link varchar(255),
  "isRead" boolean default false,
  "forYou" boolean default true
);

-- 14. Enable RLS for Notifications
alter table public.notifications enable row level security;

-- 15. Create Policy: Users can view their own notifications or global broadcasts
create policy "Users can view their own or global notifications"
on public.notifications for select
using (auth.uid() = "userId" or "userId" is null);

