const { createClient } = require('@supabase/supabase-js');

// Config from supabase-config.js
const SUPABASE_URL = 'https://fjzrixjgqdpyplkgqvyp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqenJpeGpncWRweXBsa2dxdnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3ODI4ODcsImV4cCI6MjA4NjM1ODg4N30.qeI9hNXYuEoORTTLidpSw9_UXvvTMPv6Ct-TCXOYJTc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testTracking() {
    console.log('Testing Supabase Tracking Table...');

    const eventData = {
        ref_token: 'TEST_VERIFICATION_' + Date.now(),
        event_type: 'verification_test',
        payload: { source: 'automated_check' }
    };

    try {
        const { data, error } = await supabase
            .from('lead_tracker_new')
            .insert(eventData)
            .select();

        if (error) {
            console.error('❌ Insert FAILED:', error.message);
            if (error.code === '42P01') {
                console.error('Reason: Table "lead_tracker_new" does not exist yet. Please run the SQL migration!');
            }
        } else {
            console.log('✅ Insert SUCCESS! Table exists and is writable.');
            console.log('Inserted:', data);
        }
    } catch (err) {
        console.error('❌ Exception:', err);
    }
}

testTracking();
