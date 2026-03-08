-- 1. Drop existing table if it exists (to clear out the bad schema)
DROP TABLE IF EXISTS public.notifications CASCADE;

-- 2. Create Notifications Table with proper PostgreSQL snake_case columns
CREATE TABLE public.notifications (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade,
  type varchar(20) not null check (type in ('alert', 'info', 'reminder', 'news')),
  title varchar(100) not null,
  message text not null,
  link varchar(255),
  is_read boolean default false,
  for_you boolean default true
);

-- 3. Enable RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Create Policy: Users can view their own notifications or global broadcasts
CREATE POLICY "Users can view their own or global notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);
