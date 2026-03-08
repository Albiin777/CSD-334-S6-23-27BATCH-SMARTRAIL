-- Add user_id to pnr_bookings to link bookings directly to accounts
ALTER TABLE public.pnr_bookings
ADD COLUMN user_id uuid references auth.users(id) on delete set null;

-- Enable RLS and add policies if we want strict viewing rules later
-- ALTER TABLE public.pnr_bookings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own bookings"
-- ON public.pnr_bookings FOR SELECT
-- USING (auth.uid() = user_id);
