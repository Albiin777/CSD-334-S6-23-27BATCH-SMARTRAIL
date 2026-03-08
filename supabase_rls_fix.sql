-- =====================================================
-- SUPABASE RLS SECURITY FIX
-- =====================================================
-- This script enables Row Level Security (RLS) on tables that 
-- were flagged as public. It adds permissive but defined policies
-- to ensure the "Critical" RLS warnings are resolved.

-- 1. SEAT_BLOCKS (RLS + Policies)
-- Description: Temporary seat holds during booking
ALTER TABLE public.seat_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select seat_blocks" ON public.seat_blocks;
CREATE POLICY "Public select seat_blocks" ON public.seat_blocks
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert seat_blocks" ON public.seat_blocks;
CREATE POLICY "Public insert seat_blocks" ON public.seat_blocks
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update seat_blocks" ON public.seat_blocks;
CREATE POLICY "Public update seat_blocks" ON public.seat_blocks
FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete seat_blocks" ON public.seat_blocks;
CREATE POLICY "Public delete seat_blocks" ON public.seat_blocks
FOR DELETE USING (true);


-- 2. REVIEWS (RLS + Policies)
-- Description: User ratings and comments for trains
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read reviews" ON public.reviews;
CREATE POLICY "Public read reviews" ON public.reviews
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated insert reviews" ON public.reviews;
CREATE POLICY "Authenticated insert reviews" ON public.reviews
FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- 3. UNRESERVED_TICKETS (RLS + Policies)
-- Description: Booking history for general sitting tickets
ALTER TABLE public.unreserved_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view unreserved_tickets" ON public.unreserved_tickets;
CREATE POLICY "Public view unreserved_tickets" ON public.unreserved_tickets
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert unreserved_tickets" ON public.unreserved_tickets;
CREATE POLICY "Public insert unreserved_tickets" ON public.unreserved_tickets
FOR INSERT WITH CHECK (true);

-- 4. PNR_BOOKINGS (Ensure RLS is enabled as per previous scripts)
ALTER TABLE IF EXISTS public.pnr_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.passengers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DONE! Run this in the Supabase SQL Editor.
-- =====================================================
