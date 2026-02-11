-- ============================================================================
-- AIRMANGO WEBFORM - SUPABASE DATABASE SETUP
-- ============================================================================
-- Run this against your Supabase PostgreSQL database to create all
-- necessary tables, RLS policies, and triggers.
-- ============================================================================

-- 1. USER PROFILES
-- Extends Supabase auth.users with app-specific fields
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_profiles_updated
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- 2. CONSENT LOGS
-- Immutable legal record of user consent actions
CREATE TABLE IF NOT EXISTS public.consent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    consent_ownership BOOLEAN DEFAULT FALSE,
    consent_license BOOLEAN DEFAULT FALSE,
    consent_age BOOLEAN DEFAULT FALSE,
    consent_people BOOLEAN DEFAULT FALSE,
    notify_launch BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own consent logs
CREATE POLICY "Users can insert own consent logs"
    ON public.consent_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can read their own consent logs
CREATE POLICY "Users can view own consent logs"
    ON public.consent_logs FOR SELECT
    USING (auth.uid() = user_id);

-- No UPDATE or DELETE allowed — consent logs are immutable


-- 3. FORM PROGRESS
-- Auto-saved draft form state (one draft per user)
CREATE TABLE IF NOT EXISTS public.form_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    form_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.form_progress ENABLE ROW LEVEL SECURITY;

-- Users can manage their own progress
CREATE POLICY "Users can view own progress"
    ON public.form_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
    ON public.form_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
    ON public.form_progress FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
    ON public.form_progress FOR DELETE
    USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER on_form_progress_updated
    BEFORE UPDATE ON public.form_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id ON public.consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_created_at ON public.consent_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_form_progress_user_id ON public.form_progress(user_id);
