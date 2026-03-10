-- ========================================================
-- TTE TABLES SCHEMA SYNC (FIX DB ERROR)
-- ========================================================
-- Run this in your Supabase SQL Editor.
-- This script adds missing columns to 'complaints' and 'reviews' 
-- tables that are required by the TTE portal's useSmartRail hook.

-- 1. FIX COMPLAINTS TABLE
DO $$
BEGIN
    -- add train_no if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'train_no') THEN
        ALTER TABLE public.complaints ADD COLUMN train_no TEXT;
    END IF;

    -- add passenger_name if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'passenger_name') THEN
        ALTER TABLE public.complaints ADD COLUMN passenger_name TEXT;
    END IF;

    -- add pnr if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'pnr') THEN
        ALTER TABLE public.complaints ADD COLUMN pnr TEXT;
    END IF;

    -- add coach if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'coach') THEN
        ALTER TABLE public.complaints ADD COLUMN coach TEXT;
    END IF;

    -- add seat_no if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'seat_no') THEN
        ALTER TABLE public.complaints ADD COLUMN seat_no TEXT;
    END IF;

    -- add category if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'category') THEN
        ALTER TABLE public.complaints ADD COLUMN category TEXT DEFAULT 'General';
    END IF;

    -- add priority if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'priority') THEN
        ALTER TABLE public.complaints ADD COLUMN priority TEXT DEFAULT 'Medium';
    END IF;
END $$;

-- 2. FIX REVIEWS TABLE
-- If table doesn't exist, create it. If it does, sync its columns.
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    train_number TEXT,
    train_no TEXT, -- useSmartRail uses train_no
    user_id TEXT,
    userId TEXT, -- backend controller uses userId
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    passenger_name TEXT,
    pnr TEXT,
    coach TEXT,
    seat_no TEXT,
    category TEXT DEFAULT 'General',
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync reviews columns if it already existed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'train_no') THEN
        ALTER TABLE public.reviews ADD COLUMN train_no TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'train_number') THEN
        ALTER TABLE public.reviews ADD COLUMN train_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'userId') THEN
        ALTER TABLE public.reviews ADD COLUMN "userId" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'user_id') THEN
        ALTER TABLE public.reviews ADD COLUMN user_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'passenger_name') THEN
        ALTER TABLE public.reviews ADD COLUMN passenger_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'pnr') THEN
        ALTER TABLE public.reviews ADD COLUMN pnr TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'coach') THEN
        ALTER TABLE public.reviews ADD COLUMN coach TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'seat_no') THEN
        ALTER TABLE public.reviews ADD COLUMN seat_no TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'category') THEN
        ALTER TABLE public.reviews ADD COLUMN category TEXT DEFAULT 'General';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'helpful_count') THEN
        ALTER TABLE public.reviews ADD COLUMN helpful_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Enable RLS on reviews if not already
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read reviews" ON public.reviews;
CREATE POLICY "Public read reviews" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated insert reviews" ON public.reviews;
CREATE POLICY "Authenticated insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

-- 3. ENSURE TTE_ASSIGNMENTS IS TEXT-ID READY (Firebase)
ALTER TABLE IF EXISTS public.tte_assignments ALTER COLUMN tte_email TYPE TEXT;
-- Add status if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tte_assignments' AND column_name = 'status') THEN
        ALTER TABLE public.tte_assignments ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;
