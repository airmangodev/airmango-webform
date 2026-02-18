CREATE TABLE IF NOT EXISTS public.lead_tracker_new (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ref_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    event_type TEXT NOT NULL, -- 'link_clicked', 'user_signed_up', 'trip_submitted'
    user_email TEXT,
    payload JSONB DEFAULT '{}'::JSONB
);

-- Enable RLS but allow public inserts for tracking (since link clicks are anonymous)
ALTER TABLE public.lead_tracker_new ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anon) to insert tracking events
CREATE POLICY "Allow public insert for tracking" ON public.lead_tracker_new
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users (e.g. dashboard admin) to read
CREATE POLICY "Allow authenticated read" ON public.lead_tracker_new
    FOR SELECT TO authenticated USING (true);
