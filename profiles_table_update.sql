-- Add role column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Migrate existing roles from users table to profiles table (using dynamic SQL to avoid parse errors)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        EXECUTE 'UPDATE public.profiles p SET role = u.role FROM public.users u WHERE p.id = u.id';
    END IF;
END $$;

