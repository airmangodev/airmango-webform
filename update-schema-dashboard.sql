-- Migration to support Multi-Trip Dashboard

-- 1. Drop the UNIQUE constraint on user_id to allow multiple rows per user
ALTER TABLE public.form_progress DROP CONSTRAINT IF EXISTS form_progress_user_id_key;

-- 2. Add 'title' column for easier dashboard display
ALTER TABLE public.form_progress ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Untitled Trip';

-- 3. Add 'status' column to track drafts vs submitted
ALTER TABLE public.form_progress ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- 4. Rename table to 'trips' for clarity
ALTER TABLE public.form_progress RENAME TO trips;

-- 5. Update Policies (Renaming table usually preserves policies, but we ensure names are consistent)
-- We might need to drop and re-create policies if they reference the old name explicitly in their definition string?
-- Usually Postgres handles this, but let's be sure.

-- Ensure RLS is enabled on new table name
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- 6. Add policy for deleting specific trips (by ID) if not already covered
-- The old policy was "Users can delete own progress" using user_id.
-- We need to ensure they can delete by ID too.
DROP POLICY IF EXISTS "Users can delete own progress" ON public.trips;
CREATE POLICY "Users can delete own trips"
    ON public.trips FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own progress" ON public.trips;
CREATE POLICY "Users can view own trips"
    ON public.trips FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON public.trips;
CREATE POLICY "Users can insert own trips"
    ON public.trips FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.trips;
CREATE POLICY "Users can update own trips"
    ON public.trips FOR UPDATE
    USING (auth.uid() = user_id);
