/**
 * ============================================================================
 * AIRMANGO WEBFORM - AUTHENTICATION & DASHBOARD MODULE
 * ============================================================================
 *
 * Handles:
 *  1. Authentication (Sign Up, Sign In, Sign Out)
 *  2. Dashboard Logic (Load Trips, Create Trip, Delete Trip)
 *  3. Editor Integration (Open Trip, Save Progress)
 *  4. Database Sync (updated to support 'trips' table)
 *
 * Use window.auth to access dashboard functions.
 * Assumes app.js exposes window.app for editor control.
 */

// ===== Auth State =====
const authState = {
    user: null,
    session: null,
    currentTripId: null, // Track which trip is currently open
    ipAddress: null,
    saveTimeout: null,
    isSaving: false,
    saveInterval: null,
    saveInterval: null,
    lastSavedHash: null,
    // Pagination
    currentPage: 0,
    pageSize: 12,
    hasMoreTrips: true
};

// ===== DOM References =====
const authElements = {};

function cacheAuthElements() {
    // Auth Overlay
    authElements.overlay = document.getElementById('authOverlay');
    authElements.loginForm = document.getElementById('authLoginForm');
    authElements.signupForm = document.getElementById('authSignupForm');
    authElements.verifyNotice = document.getElementById('authVerifyNotice');

    // Auth Inputs
    authElements.loginEmail = document.getElementById('authLoginEmail');
    authElements.loginPassword = document.getElementById('authLoginPassword');
    authElements.signupName = document.getElementById('authSignupName');
    authElements.signupEmail = document.getElementById('authSignupEmail');
    authElements.signupPassword = document.getElementById('authSignupPassword');
    authElements.loginBtn = document.getElementById('authLoginBtn');
    authElements.signupBtn = document.getElementById('authSignupBtn');
    authElements.loginError = document.getElementById('authLoginError');
    authElements.signupError = document.getElementById('authSignupError');
    authElements.switchToSignup = document.getElementById('switchToSignup');
    authElements.switchToLogin = document.getElementById('switchToLogin');
    authElements.backToLogin = document.getElementById('backToLogin');
    authElements.verifyEmail = document.getElementById('authVerifyEmail');

    // Dashboard User Bar
    authElements.dashboardUserEmail = document.getElementById('dashboardUserEmail');
    authElements.dashboardLogoutBtns = document.querySelectorAll('.dashboard-logout-btn, #authLogoutBtn');

    // Dashboard
    authElements.dashboardView = document.getElementById('dashboardView');
    authElements.tripsGrid = document.getElementById('tripsGrid');
    authElements.createTripBtn = document.getElementById('createNewTripBtn');

    // Editor View
    authElements.editorHeader = document.getElementById('editorHeader');
    authElements.editorMain = document.getElementById('editorMain');
    authElements.saveIndicator = document.getElementById('saveIndicator');
}

// ===== Exposed Interface =====
window.auth = {
    showDashboard: () => loadDashboard(),
    saveCurrentTrip: () => saveFormProgress(true) // Force save
};

// ===== Ref Token Capture & Webhook Helpers =====
// NOTE: URLs are hardcoded here because auth.js loads BEFORE app.js (where CONFIG is defined)
const TRACKING_WEBHOOKS = {
    linkClicked: 'https://n8n.restaurantreykjavik.com/webhook/link-clicked',
    signup: 'https://n8n.restaurantreykjavik.com/webhook/user-signed-up'
};

/**
 * Captures ?ref=TOKEN from the URL, stores it in localStorage,
 * and fires the "link clicked" webhook to n8n.
 */
function captureRefToken() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const refToken = urlParams.get('ref');

        if (refToken) {
            // Store in localStorage so it persists through signup/login flow
            localStorage.setItem('airmango_ref_token', refToken);
            console.log('[Tracking] Ref token captured:', refToken);

            // Fire link-clicked webhook using sendBeacon (avoids CORS preflight)
            const payload = JSON.stringify({
                event: 'link_clicked',
                ref_token: refToken,
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                page_url: window.location.href
            });
            const blob = new Blob([payload], { type: 'application/json' });
            const sent = navigator.sendBeacon(TRACKING_WEBHOOKS.linkClicked, blob);
            console.log('[Tracking] Link-click beacon sent:', sent);

            // Clean the URL to remove ?ref= (cosmetic)
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    } catch (err) {
        console.warn('[Tracking] Failed to capture ref token:', err);
    }
}

/**
 * Fires the "user signed up" webhook to n8n with the stored ref token.
 */
function fireSignupWebhook(name, email) {
    try {
        const refToken = localStorage.getItem('airmango_ref_token') || null;

        const payload = JSON.stringify({
            event: 'user_signed_up',
            ref_token: refToken,
            signup_name: name,
            signup_email: email,
            timestamp: new Date().toISOString()
        });
        const blob = new Blob([payload], { type: 'application/json' });
        const sent = navigator.sendBeacon(TRACKING_WEBHOOKS.signup, blob);
        console.log('[Tracking] Signup beacon sent:', sent);
    } catch (err) {
        console.warn('[Tracking] Failed to fire signup webhook:', err);
    }
}

// ===== Initialize =====
async function initAuth() {
    cacheAuthElements();
    setupAuthListeners();
    fetchIpAddress();

    // Capture ?ref= token from URL and fire link-clicked webhook
    captureRefToken();

    if (!window.supabaseClient) {
        console.error('[Auth] Supabase client not initialized!');
        return;
    }

    const { data: { session } } = await window.supabaseClient.auth.getSession();

    if (session) {
        authState.user = session.user;
        authState.session = session;
        onAuthSuccess();
    } else {
        showAuthOverlay();
    }

    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            authState.user = session.user;
            authState.session = session;
            onAuthSuccess();
        } else if (event === 'SIGNED_OUT') {
            authState.user = null;
            authState.session = null;
            authState.currentTripId = null;
            showAuthOverlay();
        }
    });
}

function setupAuthListeners() {
    authElements.switchToSignup?.addEventListener('click', (e) => { e.preventDefault(); showSignupForm(); });
    authElements.switchToLogin?.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });
    authElements.backToLogin?.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });

    authElements.loginForm?.addEventListener('submit', async (e) => { e.preventDefault(); await handleLogin(); });
    authElements.signupForm?.addEventListener('submit', async (e) => { e.preventDefault(); await handleSignup(); });

    // Logout (bind to all logout buttons)
    authElements.dashboardLogoutBtns?.forEach(btn => {
        btn.addEventListener('click', handleLogout);
    });

    // Create New Trip
    authElements.createTripBtn?.addEventListener('click', createNewTrip);
}

// ===== Auth Logic (Signup/Login/Logout) =====
async function handleSignup() {
    const name = authElements.signupName.value.trim();
    const email = authElements.signupEmail.value.trim();
    const password = authElements.signupPassword.value;

    if (!name || !email || !password) return showAuthError('signup', 'Please fill in all fields');
    if (password.length < 6) return showAuthError('signup', 'Password must be at least 6 characters');

    try {
        setAuthLoading('signup', true);
        const { data, error } = await window.supabaseClient.auth.signUp({
            email, password,
            options: { data: { full_name: name }, emailRedirectTo: window.location.href }
        });
        if (error) throw error;

        // Fire signup webhook to n8n (non-blocking)
        fireSignupWebhook(name, email);

        if (data.user && !data.session) showVerifyNotice(email);
    } catch (err) {
        showAuthError('signup', err.message);
    } finally {
        setAuthLoading('signup', false);
    }
}

async function handleLogin() {
    const email = authElements.loginEmail.value.trim();
    const password = authElements.loginPassword.value;

    if (!email || !password) return showAuthError('login', 'Enter email and password');

    try {
        setAuthLoading('login', true);
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Success handled by onAuthStateChange
    } catch (err) {
        showAuthError('login', err.message);
    } finally {
        setAuthLoading('login', false);
    }
}

async function handleLogout() {
    await window.supabaseClient.auth.signOut();
    window.location.reload();
}

function onAuthSuccess() {
    hideAuthOverlay();
    // Update dashboard user info
    if (authElements.dashboardUserEmail) {
        authElements.dashboardUserEmail.textContent = authState.user.email;
    }
    // Load Dashboard instead of restoring single trip
    // Check for last open trip to restore session
    const lastTripId = localStorage.getItem('lastOpenTripId');
    if (lastTripId) {
        window.openTrip(lastTripId);
    } else {
        loadDashboard();
    }
    // Start auto-save listener (but it will only save if currentTripId is set)
    startAutoSaveListener();
}

// ===== Dashboard Logic =====
async function loadDashboard(reset = true) {
    if (authElements.dashboardView) authElements.dashboardView.hidden = false;
    if (authElements.editorHeader) authElements.editorHeader.hidden = true;
    if (authElements.editorMain) authElements.editorMain.hidden = true;

    if (window.app && window.app.resetTrip) window.app.resetTrip();

    authState.currentTripId = null;

    // Reset pagination if needed
    if (reset) {
        localStorage.removeItem('lastOpenTripId'); // Clear persistence on explicit dashboard load
        authState.currentPage = 0;
        authState.hasMoreTrips = true;
        if (authElements.tripsGrid) authElements.tripsGrid.innerHTML = '<div class="dashboard-loading">Loading trips...</div>';
    }

    if (!authElements.tripsGrid) return;

    try {
        // Calculate range
        const from = authState.currentPage * authState.pageSize;
        const to = from + authState.pageSize - 1;

        const { data: trips, error } = await window.supabaseClient
            .from('trips')
            .select('*')
            .eq('user_id', authState.user.id)
            .order('updated_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Check if we reached the end
        if (!trips || trips.length < authState.pageSize) {
            authState.hasMoreTrips = false;
        }

        renderTrips(trips || [], reset);

        // Prepare next page
        if (trips && trips.length > 0) {
            authState.currentPage++;
        }

        updateLoadMoreButton();

    } catch (err) {
        console.error('Error fetching trips:', err);
        if (err.code === '42P01') { // undefined_table
            authElements.tripsGrid.innerHTML = renderMigrationRequiredUI();
        } else {
            authElements.tripsGrid.innerHTML = `<p class="error-text">Failed to load trips: ${err.message} (Code: ${err.code || 'unknown'})</p>`;
        }
    }
}

function updateLoadMoreButton() {
    let btn = document.getElementById('dashboardLoadMoreBtn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'dashboardLoadMoreBtn';
        btn.className = 'btn-secondary';
        btn.textContent = 'Load More Trips';
        btn.style.display = 'block';
        btn.style.margin = '2rem auto';
        btn.onclick = () => loadDashboard(false);
        // Insert after grid
        if (authElements.tripsGrid && authElements.tripsGrid.parentNode) {
            authElements.tripsGrid.parentNode.appendChild(btn);
        }
    }

    // Toggle visibility
    btn.hidden = !authState.hasMoreTrips;
}

function renderMigrationRequiredUI() {
    return `
        <div class="migration-alert" style="background: #fff1f2; border: 1px solid #fda4af; padding: 24px; border-radius: 12px; grid-column: 1/-1;">
            <h3 style="color: #9f1239; margin-top: 0;">⚠️ Database Update Required</h3>
            <p style="color: #881337; margin-bottom: 16px;">
                The app has been upgraded to a multi-trip dashboard, but your database still has the old structure. 
                <strong>You must run the following SQL command in your Supabase SQL Editor to fix this.</strong>
            </p>
            <textarea readonly style="width: 100%; height: 250px; padding: 12px; font-family: monospace; border: 1px solid #ccc; border-radius: 8px; font-size: 13px; background: #fff;" onclick="this.select()">
-- 1. Rename table and relax constraints
ALTER TABLE public.form_progress RENAME TO trips;
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS form_progress_user_id_key;

-- 2. Add Dashboard columns
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Untitled Trip';
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- 3. Update Permissions (Crucial for Create/Delete)
DROP POLICY IF EXISTS "Users can delete own progress" ON public.trips;
CREATE POLICY "Users can delete own trips" ON public.trips FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own progress" ON public.trips;
CREATE POLICY "Users can view own trips" ON public.trips FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON public.trips;
CREATE POLICY "Users can insert own trips" ON public.trips FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.trips;
CREATE POLICY "Users can update own trips" ON public.trips FOR UPDATE USING (auth.uid() = user_id);
            </textarea>
            <p style="margin-top: 12px; font-size: 0.9em; color: #4b5563;">
                1. Copy the code above.<br>
                2. Go to your <a href="https://supabase.com/dashboard/project/fjzrixjgqdpyplkgqvyp/sql" target="_blank" style="color: #be123c; text-decoration: underline;">Supabase SQL Editor</a>.<br>
                3. Paste and run it.<br>
                4. Refresh this page.
            </p>
        </div>
    `;
}

function renderTrips(trips, reset = false) {
    if (!authElements.tripsGrid) return;

    if (reset && trips.length === 0) {
        authElements.tripsGrid.innerHTML = `
            <div class="empty-dashboard">
                <p>You haven't created any trips yet.</p>
                <div class="arrow-hint">&uarr; Click above to start!</div>
            </div>
        `;
        return;
    }

    const html = trips.map(trip => {
        // Safe access to trip properties
        const title = trip.title || trip.form_data?.trip?.title || 'Untitled Trip';
        const location = trip.form_data?.trip?.location || 'Iceland';
        const status = trip.status || 'draft';
        const updatedAt = new Date(trip.updated_at).toLocaleDateString();

        // Helper to secure HTTP images via proxy
        const getSecureUrl = (url) => {
            if (!url) return null;
            if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('https://')) return url;
            return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=400&output=webp`;
        };

        // Find a cover image if available
        let coverUrl = null;
        if (trip.form_data?.trip?.coverImages && trip.form_data.trip.coverImages.length > 0) {
            const firstImg = trip.form_data.trip.coverImages[0];
            // Use remoteUrl if available, otherwise url (if it matches logic)
            // But we specifically need to secure it
            const rawUrl = firstImg.remoteUrl || firstImg.url;
            coverUrl = getSecureUrl(rawUrl);
        }

        return `
            <div class="trip-card" onclick="openTrip('${trip.id}')">
                <div class="trip-card-cover" style="${coverUrl ? `background-image: url('${coverUrl}')` : ''}">
                    ${!coverUrl ? '<span>No Cover</span>' : ''}
                    <div class="trip-card-actions-top">
                        <button class="delete-trip-btn" onclick="deleteTrip('${trip.id}', event)" title="Delete Trip">
                            &times;
                        </button>
                    </div>
                </div>
                <div class="trip-card-content">
                    <h3 class="trip-card-title">${escapeHtml(title)}</h3>
                    <div class="trip-card-meta">
                        <span>${location}</span>
                        <span class="trip-status ${status}">${status}</span>
                    </div>
                    <div class="trip-card-date" style="font-size: 0.75rem; color: #9ca3af; margin-top: 8px;">
                        Edited: ${updatedAt}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (reset) {
        authElements.tripsGrid.innerHTML = html;
    } else {
        authElements.tripsGrid.insertAdjacentHTML('beforeend', html);
    }
}

// Make functions global for onclick events in HTML string
window.openTrip = async function (tripId) {
    // Fetch latest data for this trip
    try {
        const { data, error } = await window.supabaseClient
            .from('trips')
            .select('*')
            .eq('id', tripId)
            .single();

        if (error) throw error;
        if (data) {
            authState.currentTripId = tripId;
            localStorage.setItem('lastOpenTripId', tripId); // Persist session

            // Switch to Editor View
            if (authElements.dashboardView) authElements.dashboardView.hidden = true;
            if (authElements.editorHeader) authElements.editorHeader.hidden = false;
            if (authElements.editorMain) authElements.editorMain.hidden = false;

            // Load data into App
            if (window.app && window.app.loadTrip) {
                // Ensure data.form_data is passed correctly
                // If form_data is null, pass empty object
                window.app.loadTrip(data.form_data || {});
            }
        }
    } catch (err) {
        console.error('Error opening trip:', err);
        alert('Failed to open trip. Please try again.');
    }
};

window.deleteTrip = async function (tripId, event) {
    if (event) event.stopPropagation();
    if (!confirm('Are you sure you want to delete this trip specifically? This cannot be undone.')) return;

    try {
        const { error } = await window.supabaseClient
            .from('trips')
            .delete()
            .eq('id', tripId);

        if (error) throw error;

        // Refresh dashboard
        loadDashboard();
    } catch (err) {
        console.error('Error deleting trip:', err);
        alert('Failed to delete trip.');
    }
};

async function createNewTrip() {
    try {
        const { data, error } = await window.supabaseClient
            .from('trips')
            .insert({
                user_id: authState.user.id,
                title: 'Untitled Trip',
                status: 'draft',
                form_data: {}
            })
            .select() // Select to return the inserted row (requires RLS policy for Select)
            .single();

        if (error) throw error;
        if (data) {
            // Open the new trip
            authState.currentTripId = data.id;
            localStorage.setItem('lastOpenTripId', data.id); // Persist session

            // Switch to Editor View
            if (authElements.dashboardView) authElements.dashboardView.hidden = true;
            if (authElements.editorHeader) authElements.editorHeader.hidden = false;
            if (authElements.editorMain) authElements.editorMain.hidden = false;

            // Retrieve fresh state
            if (window.app && window.app.resetTrip) {
                window.app.resetTrip();
            }
        }
    } catch (err) {
        console.error('Error creating trip:', err);
        if (err.code === '42P01') {
            alert('Database migration missing! Please check the dashboard for instructions.');
        } else {
            alert(`Failed to create new trip: ${err.message} (${err.code || ''})`);
        }
    }
}


// ===== Editor Integration (Save Progress) =====

function startAutoSaveListener() {
    // Debounced save on input
    document.addEventListener('input', debouncedSave);
    document.addEventListener('change', debouncedSave);
    // Periodic save
    authState.saveInterval = setInterval(() => saveFormProgress(), 30000);
}

function debouncedSave() {
    if (authState.saveTimeout) clearTimeout(authState.saveTimeout);
    authState.saveTimeout = setTimeout(() => saveFormProgress(), 1000); // 1s instant debounce
}

async function saveFormProgress(force = false) {
    if (!authState.user || !authState.currentTripId) return;
    if (authState.isSaving) return;

    try {
        // Collect data from App
        if (!window.app || !window.app.getData) {
            console.warn('App interface not ready');
            return;
        }

        const formData = window.app.getData();
        const dataHash = JSON.stringify(formData);

        // Skip if nothing changed (unless forced)
        if (!force && dataHash === authState.lastSavedHash) return;

        authState.isSaving = true;
        showSaveIndicator('saving');

        // Extract title for the main table column
        const tripTitle = formData.trip?.title || 'Untitled Trip';

        // Update DB by TRIP ID (not user_id)
        const { error } = await window.supabaseClient
            .from('trips')
            .update({
                form_data: formData,
                title: tripTitle,
                updated_at: new Date().toISOString()
            })
            .eq('id', authState.currentTripId);

        if (error) throw error;

        authState.lastSavedHash = dataHash;
        showSaveIndicator('saved');
    } catch (err) {
        console.error('Save error:', err);
        showSaveIndicator('error');
    } finally {
        authState.isSaving = false;
    }
}


// ===== UI Helpers =====
function showAuthOverlay() {
    if (authElements.overlay) {
        authElements.overlay.hidden = false;
        authElements.overlay.classList.add('visible');
    }
    showSignupForm();
}

function hideAuthOverlay() {
    if (authElements.overlay) {
        authElements.overlay.classList.remove('visible');
        setTimeout(() => { authElements.overlay.hidden = true; }, 300);
    }
}

function showLoginForm() {
    if (authElements.loginForm) authElements.loginForm.hidden = false;
    if (authElements.signupForm) authElements.signupForm.hidden = true;
    if (authElements.verifyNotice) authElements.verifyNotice.hidden = true;
    clearAuthError('login');
}

function showSignupForm() {
    if (authElements.loginForm) authElements.loginForm.hidden = true;
    if (authElements.signupForm) authElements.signupForm.hidden = false;
    if (authElements.verifyNotice) authElements.verifyNotice.hidden = true;
    clearAuthError('signup');
}

function showVerifyNotice(email) {
    if (authElements.loginForm) authElements.loginForm.hidden = true;
    if (authElements.signupForm) authElements.signupForm.hidden = true;
    if (authElements.verifyNotice) authElements.verifyNotice.hidden = false;
    if (authElements.verifyEmail) authElements.verifyEmail.textContent = email;
}

function showAuthError(type, msg) {
    const el = type === 'login' ? authElements.loginError : authElements.signupError;
    if (el) { el.textContent = msg; el.hidden = false; }
}

function clearAuthError(type) {
    const el = type === 'login' ? authElements.loginError : authElements.signupError;
    if (el) { el.textContent = ''; el.hidden = true; }
}

function setAuthLoading(type, loading) {
    const btn = type === 'login' ? authElements.loginBtn : authElements.signupBtn;
    if (btn) {
        btn.disabled = loading;
        btn.querySelector('.auth-btn-text').textContent = loading ? 'Processing...' : (type === 'login' ? 'Sign In' : 'Create Account');
    }
}

function showSaveIndicator(status) {
    const indicator = authElements.saveIndicator;
    if (!indicator) return;
    indicator.hidden = false;
    indicator.className = 'save-indicator ' + status;

    if (status === 'saving') indicator.innerHTML = 'Saving...';
    else if (status === 'saved') {
        indicator.innerHTML = 'All changes saved';
        setTimeout(() => { indicator.hidden = true; }, 2000);
    } else {
        indicator.innerHTML = 'Error saving';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// IP Fetch
async function fetchIpAddress() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        authState.ipAddress = data.ip;
    } catch (e) { authState.ipAddress = 'unknown'; }
}

// Global Log Consent (called by app.js submission)
window.logConsent = async function (consentData) {
    if (!authState.user) return;

    // Default values if not provided
    const data = {
        user_id: authState.user.id,
        ip_address: authState.ipAddress || 'unknown',
        user_agent: navigator.userAgent,
        consent_ownership: !!consentData?.ownership,
        consent_license: !!consentData?.license,
        consent_age: !!consentData?.age,
        consent_people: !!consentData?.people,
        notify_launch: !!consentData?.notifyLaunch
        // created_at is handled automatically by DB default
    };

    try {
        console.log('[Auth] Logging consent:', data);
        const { error } = await window.supabaseClient.from('consent_logs').insert(data);
        if (error) {
            console.error('Consent log DB error:', error);
            // Don't throw, just log. Submission should succeed even if log fails (unless strict legal requirement?)
            // Usually we don't block user flow for background logging unless critical.
        }
    } catch (e) {
        console.error('Consent log exception:', e);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initAuth, 100);
});
