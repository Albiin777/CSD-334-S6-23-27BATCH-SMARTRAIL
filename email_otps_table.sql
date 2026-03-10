-- Create the email_otps table to store temporary OTP codes for Email Authentication
CREATE TABLE IF NOT EXISTS public.email_otps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    otp_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- Creating an index on the email column for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_otps_email ON public.email_otps(email);

-- Note: No RLS policies are created for standard public access because this table 
-- will only be accessed securely from the backend using the Supabase Service Role Key.
