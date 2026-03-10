-- Add email and phone columns to profiles table if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Backfill existing phone accounts: try to set email from Firebase uid where we know it
-- (Not possible directly, but we can ensure the structure is ready)

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);
CREATE INDEX IF NOT EXISTS profiles_phone_idx ON public.profiles (phone);

-- Make sure RLS is still enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
