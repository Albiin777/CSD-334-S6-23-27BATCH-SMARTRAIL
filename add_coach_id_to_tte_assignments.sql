-- Add coach_id to tte_assignments if it doesn't already exist
-- Run this in your Supabase SQL Editor

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tte_assignments'
          AND column_name = 'coach_id'
    ) THEN
        ALTER TABLE tte_assignments
        ADD COLUMN coach_id TEXT;

        COMMENT ON COLUMN tte_assignments.coach_id IS
            'The specific coach ID the TTE is assigned to (e.g., B1, S3, A2). Used to default the seat map view to the correct coach.';
    END IF;
END $$;
