-- Create Consent Logs Table for Legal Compliance
CREATE TABLE IF NOT EXISTS public.consent_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    consent_ownership BOOLEAN DEFAULT false,
    consent_license BOOLEAN DEFAULT false,
    consent_age BOOLEAN DEFAULT false,
    consent_people BOOLEAN DEFAULT false,
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own logs
CREATE POLICY "Users can insert own consent logs" 
ON public.consent_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Start fresh if needed (Optional)
-- DELETE FROM public.consent_logs;
