/**
 * ============================================================================
 * SUPABASE CONFIGURATION
 * ============================================================================
 * Reusable Supabase client setup for the Airmango Webform.
 * This file initializes the Supabase client with the project credentials.
 * ============================================================================
 */

const SUPABASE_URL = 'https://fjzrixjgqdpyplkgqvyp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqenJpeGpncWRweXBsa2dxdnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3ODI4ODcsImV4cCI6MjA4NjM1ODg4N30.qeI9hNXYuEoORTTLidpSw9_UXvvTMPv6Ct-TCXOYJTc';

// Initialize the Supabase client (supabase-js loaded from CDN in index.html)
// "window.supabase" is the library. We must create a client instance.
// We attach it to "window.supabaseClient" to avoid scope conflicts.
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('[Supabase] Client initialized');
console.log('[Supabase] Client auth available:', !!window.supabaseClient.auth);
