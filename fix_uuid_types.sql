-- ========================================================
-- DATABASE MIGRATION: UUID TO TEXT (FOR FIREBASE AUTH)
-- ========================================================
-- VERSION 4: Handles deep RLS dependencies (Complaints -> Replies, Trains -> Profiles).

-- 1. DROP ALL POTENTIAL DEPENDENT POLICIES
-- We drop these across multiple tables because they often reference profiles.id or users.id
DO $$ 
BEGIN 
    -- Notifications
    DROP POLICY IF EXISTS "Users can view their own or global notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can view their own notifications or global broadcasts" ON public.notifications;

    -- Bookings
    DROP POLICY IF EXISTS "Users can view their own bookings" ON public.pnr_bookings;
    DROP POLICY IF EXISTS "Users can see own bookings" ON public.pnr_bookings;

    -- Complaints & Replies
    DROP POLICY IF EXISTS "Users can insert their own complaints" ON public.complaints;
    DROP POLICY IF EXISTS "Users can view their own complaints" ON public.complaints;
    DROP POLICY IF EXISTS "Users can delete their own open complaints" ON public.complaints;
    DROP POLICY IF EXISTS "Users can view replies on their complaints" ON public.complaint_replies;
    DROP POLICY IF EXISTS "Users can reply to their complaints" ON public.complaint_replies;
    DROP POLICY IF EXISTS "Users can update their own replies" ON public.complaint_replies;
    DROP POLICY IF EXISTS "Users can delete their own replies" ON public.complaint_replies;

    -- Trains (Sometimes references profiles/users for admin checks)
    DROP POLICY IF EXISTS "Admins can manage trains" ON public.trains;
    DROP POLICY IF EXISTS "Public read trains" ON public.trains;
    DROP POLICY IF EXISTS "Public read trains" ON public.admin_trains;

    -- Profiles / Users
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
END $$;

-- 2. ALTER COLUMN TYPES
DO $$ 
BEGIN 
    -- 2.1 Notifications
    IF (SELECT to_regclass('public.notifications')) IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'userId') THEN
            ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_userId_fkey;
            ALTER TABLE public.notifications ALTER COLUMN "userId" TYPE text;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
            ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
            ALTER TABLE public.notifications ALTER COLUMN "user_id" TYPE text;
        END IF;
    END IF;

    -- 2.2 Bookings
    IF (SELECT to_regclass('public.pnr_bookings')) IS NOT NULL THEN
        ALTER TABLE public.pnr_bookings DROP CONSTRAINT IF EXISTS pnr_bookings_user_id_fkey;
        ALTER TABLE public.pnr_bookings ALTER COLUMN user_id TYPE text;
    END IF;

    -- 2.3 Complaint Replies
    IF (SELECT to_regclass('public.complaint_replies')) IS NOT NULL THEN
        ALTER TABLE public.complaint_replies DROP CONSTRAINT IF EXISTS complaint_replies_user_id_fkey;
        ALTER TABLE public.complaint_replies ALTER COLUMN user_id TYPE text;
    END IF;

    -- 2.4 Complaints
    IF (SELECT to_regclass('public.complaints')) IS NOT NULL THEN
        ALTER TABLE public.complaints DROP CONSTRAINT IF EXISTS complaints_user_id_fkey;
        ALTER TABLE public.complaints ALTER COLUMN user_id TYPE text;
    END IF;

    -- 2.5 Profiles / Users
    IF (SELECT to_regclass('public.users')) IS NOT NULL THEN
        ALTER TABLE public.users ALTER COLUMN id TYPE text;
    END IF;
    IF (SELECT to_regclass('public.profiles')) IS NOT NULL THEN
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
        ALTER TABLE public.profiles ALTER COLUMN id TYPE text;
    END IF;
END $$;

-- 3. RECREATE POLICIES (WITH ::TEXT CASTING)
DO $$ 
BEGIN 
    -- Notifications
    IF (SELECT to_regclass('public.notifications')) IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
            CREATE POLICY "Users can view their own or global notifications" ON public.notifications 
            FOR SELECT USING (auth.uid()::text = user_id OR user_id IS NULL);
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'userId') THEN
            CREATE POLICY "Users can view their own or global notifications" ON public.notifications 
            FOR SELECT USING (auth.uid()::text = "userId" OR "userId" IS NULL);
        END IF;
    END IF;

    -- Bookings
    IF (SELECT to_regclass('public.pnr_bookings')) IS NOT NULL THEN
        CREATE POLICY "Users can view their own bookings" ON public.pnr_bookings 
        FOR SELECT USING (auth.uid()::text = user_id);
    END IF;

    -- Complaints
    IF (SELECT to_regclass('public.complaints')) IS NOT NULL THEN
        CREATE POLICY "Users can insert their own complaints" ON public.complaints FOR INSERT WITH CHECK (auth.uid()::text = user_id);
        CREATE POLICY "Users can view their own complaints" ON public.complaints FOR SELECT USING (auth.uid()::text = user_id);
        CREATE POLICY "Users can delete their own open complaints" ON public.complaints FOR DELETE USING (auth.uid()::text = user_id AND status = 'open');
    END IF;

    -- Complaint Replies
    IF (SELECT to_regclass('public.complaint_replies')) IS NOT NULL THEN
        CREATE POLICY "Users can view replies on their complaints" ON public.complaint_replies FOR SELECT
        USING (EXISTS (SELECT 1 FROM public.complaints WHERE id = public.complaint_replies.complaint_id AND user_id = auth.uid()::text));
        
        CREATE POLICY "Users can reply to their complaints" ON public.complaint_replies FOR INSERT
        WITH CHECK (user_id = auth.uid()::text AND EXISTS (SELECT 1 FROM public.complaints WHERE id = public.complaint_replies.complaint_id AND user_id = auth.uid()::text));
        
        CREATE POLICY "Users can update their own replies" ON public.complaint_replies FOR UPDATE USING (user_id = auth.uid()::text);
        CREATE POLICY "Users can delete their own replies" ON public.complaint_replies FOR DELETE USING (user_id = auth.uid()::text);
    END IF;

    -- Profiles
    IF (SELECT to_regclass('public.profiles')) IS NOT NULL THEN
        CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid()::text = id);
        CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = id);
        CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
    END IF;

    -- Re-add Trains Admin policy if both tables exist
    IF (SELECT to_regclass('public.trains')) IS NOT NULL 
       AND (SELECT to_regclass('public.users')) IS NOT NULL THEN
        CREATE POLICY "Admins can manage trains" ON public.trains 
        FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'admin'));
    END IF;
END $$;
