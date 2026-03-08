-- ============================================================
-- SmartRail TTE Tables Setup
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- → your project → SQL Editor → New query
-- ============================================================

-- 1. Admin Trains (the TTE hooks query this to find train 12622)
CREATE TABLE IF NOT EXISTS public.admin_trains (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    train_number text NOT NULL UNIQUE,
    name text NOT NULL,
    source text NOT NULL,
    destination text NOT NULL,
    departure_time text,
    arrival_time text,
    created_at timestamptz DEFAULT now()
);

-- Seed Tamil Nadu SF Express
INSERT INTO public.admin_trains (train_number, name, source, destination, departure_time, arrival_time)
VALUES ('12622', 'Tamil Nadu SF Express', 'Chennai Central', 'New Delhi', '22:00', '06:35')
ON CONFLICT (train_number) DO NOTHING;

-- 2. Coaches
CREATE TABLE IF NOT EXISTS public.coaches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    train_id uuid REFERENCES public.admin_trains(id) ON DELETE CASCADE,
    coach_id text NOT NULL,         -- e.g. 'B1', 'S1'
    coach_type text NOT NULL,       -- e.g. '3A', 'SL'
    label text NOT NULL,            -- e.g. 'B1 — AC 3-Tier'
    position integer NOT NULL DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    UNIQUE (train_id, coach_id)
);

-- Seed coaches for Tamil Nadu SF Express
DO $$
DECLARE
    v_train_id uuid;
BEGIN
    SELECT id INTO v_train_id FROM public.admin_trains WHERE train_number = '12622';

    INSERT INTO public.coaches (train_id, coach_id, coach_type, label, position) VALUES
        (v_train_id, 'H1', '1A',  'H1 — First AC',      1),
        (v_train_id, 'A1', '2A',  'A1 — AC 2-Tier',     2),
        (v_train_id, 'A2', '2A',  'A2 — AC 2-Tier',     3),
        (v_train_id, 'B1', '3A',  'B1 — AC 3-Tier',     4),
        (v_train_id, 'B2', '3A',  'B2 — AC 3-Tier',     5),
        (v_train_id, 'B3', '3A',  'B3 — AC 3-Tier',     6),
        (v_train_id, 'B4', '3A',  'B4 — AC 3-Tier',     7),
        (v_train_id, 'S1', 'SL',  'S1 — Sleeper',       8),
        (v_train_id, 'S2', 'SL',  'S2 — Sleeper',       9),
        (v_train_id, 'S3', 'SL',  'S3 — Sleeper',       10),
        (v_train_id, 'S4', 'SL',  'S4 — Sleeper',       11),
        (v_train_id, 'C1', 'CC',  'C1 — Chair Car',     12),
        (v_train_id, 'D1', '2S',  'D1 — 2nd Sitting',   13),
        (v_train_id, 'GS', 'GEN', 'GS — General',       14)
    ON CONFLICT (train_id, coach_id) DO NOTHING;
END $$;

-- Seed Kerala Express (NDLS -> TVC)
INSERT INTO public.admin_trains (train_number, name, source, destination, departure_time, arrival_time)
VALUES ('12625', 'Kerala Express', 'New Delhi', 'Thiruvananthapuram Central', '11:15', '14:30')
ON CONFLICT (train_number) DO NOTHING;

DO $$
DECLARE
    v_train_id uuid;
BEGIN
    SELECT id INTO v_train_id FROM public.admin_trains WHERE train_number = '12625';

    INSERT INTO public.coaches (train_id, coach_id, coach_type, label, position) VALUES
        (v_train_id, 'H1', '1A',  'H1 — First AC',      1),
        (v_train_id, 'A1', '2A',  'A1 — AC 2-Tier',     2),
        (v_train_id, 'A2', '2A',  'A2 — AC 2-Tier',     3),
        (v_train_id, 'B1', '3A',  'B1 — AC 3-Tier',     4),
        (v_train_id, 'B2', '3A',  'B2 — AC 3-Tier',     5),
        (v_train_id, 'B3', '3A',  'B3 — AC 3-Tier',     6),
        (v_train_id, 'B4', '3A',  'B4 — AC 3-Tier',     7),
        (v_train_id, 'S1', 'SL',  'S1 — Sleeper',       8),
        (v_train_id, 'S2', 'SL',  'S2 — Sleeper',       9),
        (v_train_id, 'S3', 'SL',  'S3 — Sleeper',       10),
        (v_train_id, 'S4', 'SL',  'S4 — Sleeper',       11),
        (v_train_id, 'GS', 'GEN', 'GS — General',       12)
    ON CONFLICT (train_id, coach_id) DO NOTHING;
END $$;

-- Seed Kerala Express (TVC -> NDLS)
INSERT INTO public.admin_trains (train_number, name, source, destination, departure_time, arrival_time)
VALUES ('12626', 'Kerala Express', 'Thiruvananthapuram Central', 'New Delhi', '11:15', '14:30')
ON CONFLICT (train_number) DO NOTHING;

DO $$
DECLARE
    v_train_id uuid;
BEGIN
    SELECT id INTO v_train_id FROM public.admin_trains WHERE train_number = '12626';

    INSERT INTO public.coaches (train_id, coach_id, coach_type, label, position) VALUES
        (v_train_id, 'H1', '1A',  'H1 — First AC',      1),
        (v_train_id, 'A1', '2A',  'A1 — AC 2-Tier',     2),
        (v_train_id, 'A2', '2A',  'A2 — AC 2-Tier',     3),
        (v_train_id, 'B1', '3A',  'B1 — AC 3-Tier',     4),
        (v_train_id, 'B2', '3A',  'B2 — AC 3-Tier',     5),
        (v_train_id, 'B3', '3A',  'B3 — AC 3-Tier',     6),
        (v_train_id, 'B4', '3A',  'B4 — AC 3-Tier',     7),
        (v_train_id, 'S1', 'SL',  'S1 — Sleeper',       8),
        (v_train_id, 'S2', 'SL',  'S2 — Sleeper',       9),
        (v_train_id, 'S3', 'SL',  'S3 — Sleeper',       10),
        (v_train_id, 'S4', 'SL',  'S4 — Sleeper',       11),
        (v_train_id, 'GS', 'GEN', 'GS — General',       12)
    ON CONFLICT (train_id, coach_id) DO NOTHING;
END $$;
-- 3. TTE Passengers table (separate from booking passengers)
--    This table holds the chart for onboard TTE verification.
CREATE TABLE IF NOT EXISTS public.tte_passengers (
    id bigserial PRIMARY KEY,
    train_id uuid REFERENCES public.admin_trains(id) ON DELETE CASCADE,
    pnr text NOT NULL,
    name text NOT NULL,
    age integer,
    gender text,
    mobile text,
    seat_no integer,
    coach_id text NOT NULL,
    boarding text,
    destination text,
    status text DEFAULT 'Confirmed'
        CHECK (status IN ('Confirmed', 'RAC', 'Waitlist', 'No-Show')),
    id_proof text,
    ticket_class text,
    verified boolean DEFAULT false,
    verified_at timestamptz,
    flags text[] DEFAULT '{}',
    fare numeric(10,2) DEFAULT 0,
    journey_date date DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tte_passengers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TTE full access" ON public.tte_passengers USING (true) WITH CHECK (true);

-- 4. Incidents
CREATE TABLE IF NOT EXISTS public.incidents (
    id bigserial PRIMARY KEY,
    train_id uuid REFERENCES public.admin_trains(id) ON DELETE CASCADE,
    type text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'Active' CHECK (status IN ('Active', 'Resolved')),
    coach text,
    reporter_name text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TTE incidents access" ON public.incidents USING (true) WITH CHECK (true);

-- 5. Fines
CREATE TABLE IF NOT EXISTS public.fines (
    id bigserial PRIMARY KEY,
    train_id uuid REFERENCES public.admin_trains(id) ON DELETE CASCADE,
    passenger_name text,
    reason text NOT NULL,
    amount numeric(10,2) NOT NULL,
    coach text,
    receipt_no text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TTE fines access" ON public.fines USING (true) WITH CHECK (true);

-- 6. Verifications log
CREATE TABLE IF NOT EXISTS public.verifications (
    id bigserial PRIMARY KEY,
    passenger_id bigint REFERENCES public.tte_passengers(id) ON DELETE CASCADE,
    action text DEFAULT 'verified',
    coach_id text,
    seat_no integer,
    scanned_via text DEFAULT 'manual',
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TTE verifications access" ON public.verifications USING (true) WITH CHECK (true);

-- 7. No-shows log
CREATE TABLE IF NOT EXISTS public.no_shows (
    id bigserial PRIMARY KEY,
    passenger_id bigint REFERENCES public.tte_passengers(id) ON DELETE CASCADE,
    train_id uuid REFERENCES public.admin_trains(id) ON DELETE CASCADE,
    coach_id text,
    seat_no integer,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.no_shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "TTE no_shows access" ON public.no_shows USING (true) WITH CHECK (true);

-- 8. Enable RLS on admin_trains and coaches (public read)
ALTER TABLE public.admin_trains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read trains" ON public.admin_trains FOR SELECT USING (true);

ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read coaches" ON public.coaches FOR SELECT USING (true);
