const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://fjzrixjgqdpyplkgqvyp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqenJpeGpncWRweXBsa2dxdnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3ODI4ODcsImV4cCI6MjA4NjM1ODg4N30.qeI9hNXYuEoORTTLidpSw9_UXvvTMPv6Ct-TCXOYJTc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkTable(tableName) {
    try {
        console.log(`Checking table '${tableName}'...`);
        const { data, error } = await supabase.from(tableName).select('*').limit(1);

        if (error) {
            console.log(`[FAIL] Table '${tableName}' error:`, error.message, `(${error.code})`);
            return false;
        } else {
            console.log(`[OK] Table '${tableName}' exists and is accessible.`);
            return true;
        }
    } catch (err) {
        console.log(`[ERROR] Exception checking '${tableName}':`, err.message);
        return false;
    }
}

async function verify() {
    console.log('--- Database Verification ---');

    // Check old table
    const oldTableExists = await checkTable('form_progress');

    // Check new table
    const newTableExists = await checkTable('trips');

    console.log('-----------------------------');

    if (oldTableExists && !newTableExists) {
        console.log('DIAGNOSIS: The migration SQL has NOT been run yet.');
        console.log('ACTION: You must run the SQL script provided on the dashboard.');
    } else if (!oldTableExists && newTableExists) {
        console.log('DIAGNOSIS: The migration seems successful!');
        console.log('ACTION: If you still see errors, try reloading the Supabase Schema Cache or checking console logs.');
    } else if (oldTableExists && newTableExists) {
        console.log('DIAGNOSIS: Both tables exist? This is strange. Maybe you created a new table instead of renaming?');
        console.log('ACTION: Ensure code points to "trips".');
    } else {
        console.log('DIAGNOSIS: Neither table is accessible. Check connection or RLS policies.');
    }
}

verify();
