/**
 * ============================================================================
 * AIRMANGO WEBFORM - AUTHENTICATION MODULE
 * ============================================================================
 *
 * Handles:
 *  1. Sign Up (email + password) with email verification
 *  2. Sign In (email + password)
 *  3. Sign Out
 *  4. Session management (auto-detect logged in user)
 *  5. Auto-save form progress (debounced)
 *  6. Restore form progress on login
 *  7. Log consent to consent_logs table
 *  8. IP address capture for legal compliance
 *
 * Depends on: supabase-config.js (must load first)
 * ============================================================================
 */

// ===== Auth State =====
const authState = {
    user: null,
    session: null,
    ipAddress: null,
    saveTimeout: null,
    isSaving: false,
    isRestoring: false,
    lastSavedHash: null // To avoid redundant saves
};

// ===== DOM References for Auth UI =====
const authElements = {};

function cacheAuthElements() {
    authElements.overlay = document.getElementById('authOverlay');
    authElements.loginForm = document.getElementById('authLoginForm');
    authElements.signupForm = document.getElementById('authSignupForm');
    authElements.verifyNotice = document.getElementById('authVerifyNotice');
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
    authElements.userBar = document.getElementById('authUserBar');
    authElements.userBarEmail = document.getElementById('authUserBarEmail');
    authElements.logoutBtn = document.getElementById('authLogoutBtn');
    authElements.saveIndicator = document.getElementById('saveIndicator');
    authElements.verifyEmail = document.getElementById('authVerifyEmail');
}


// ===== Initialize Auth =====
async function initAuth() {
    cacheAuthElements();
    setupAuthListeners();

    // Fetch IP address in background
    fetchIpAddress();

    // Check for existing session
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

    // Listen for auth state changes (e.g., email verification callback)
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('[Auth] State changed:', event);
        if (event === 'SIGNED_IN' && session) {
            authState.user = session.user;
            authState.session = session;
            onAuthSuccess();
        } else if (event === 'SIGNED_OUT') {
            authState.user = null;
            authState.session = null;
            showAuthOverlay();
        }
    });
}


// ===== Auth Event Listeners =====
function setupAuthListeners() {
    // Switch between login and signup forms
    authElements.switchToSignup?.addEventListener('click', (e) => {
        e.preventDefault();
        showSignupForm();
    });

    authElements.switchToLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });

    authElements.backToLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });

    // Login form submit
    authElements.loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });

    // Signup form submit
    authElements.signupForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSignup();
    });

    // Logout
    authElements.logoutBtn?.addEventListener('click', async () => {
        await handleLogout();
    });
}


// ===== Sign Up =====
async function handleSignup() {
    const name = authElements.signupName.value.trim();
    const email = authElements.signupEmail.value.trim();
    const password = authElements.signupPassword.value;

    if (!name || !email || !password) {
        showAuthError('signup', 'Please fill in all fields');
        return;
    }

    if (password.length < 6) {
        showAuthError('signup', 'Password must be at least 6 characters');
        return;
    }

    setAuthLoading('signup', true);
    clearAuthError('signup');

    try {
        const { data, error } = await window.supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name },
                emailRedirectTo: window.location.href
            }
        });

        if (error) throw error;

        // Check if email confirmation is required
        if (data.user && !data.session) {
            // Email confirmation required
            showVerifyNotice(email);
        } else if (data.session) {
            // Auto-confirmed (shouldn't happen with email verification enabled)
            authState.user = data.user;
            authState.session = data.session;
            onAuthSuccess();
        }
    } catch (error) {
        console.error('[Auth] Signup error:', error);
        showAuthError('signup', error.message || 'Sign up failed. Please try again.');
    } finally {
        setAuthLoading('signup', false);
    }
}


// ===== Sign In =====
async function handleLogin() {
    const email = authElements.loginEmail.value.trim();
    const password = authElements.loginPassword.value;

    if (!email || !password) {
        showAuthError('login', 'Please enter email and password');
        return;
    }

    setAuthLoading('login', true);
    clearAuthError('login');

    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        authState.user = data.user;
        authState.session = data.session;
        onAuthSuccess();
    } catch (error) {
        console.error('[Auth] Login error:', error);
        let msg = error.message || 'Login failed. Please try again.';
        if (msg.includes('Invalid login credentials')) {
            msg = 'Invalid email or password. Please try again.';
        }
        if (msg.includes('Email not confirmed')) {
            msg = 'Please verify your email first. Check your inbox.';
        }
        showAuthError('login', msg);
    } finally {
        setAuthLoading('login', false);
    }
}


// ===== Sign Out =====
async function handleLogout() {
    try {
        await window.supabaseClient.auth.signOut();
        authState.user = null;
        authState.session = null;
        clearAutoSave();
        showAuthOverlay();
        // Reload the page for a clean slate
        window.location.reload();
    } catch (error) {
        console.error('[Auth] Logout error:', error);
    }
}


// ===== On Successful Auth =====
async function onAuthSuccess() {
    console.log('[Auth] User authenticated:', authState.user.email);

    // Hide the auth overlay
    hideAuthOverlay();

    // Show user bar
    showUserBar();

    // Pre-fill form fields from user profile
    prefillUserInfo();

    // Restore saved progress (if any)
    await restoreFormProgress();

    // Start auto-saving
    startAutoSave();
}


// ===== UI Helpers =====
function showAuthOverlay() {
    if (authElements.overlay) {
        authElements.overlay.hidden = false;
        authElements.overlay.classList.add('visible');
    }
    showLoginForm();
}

function hideAuthOverlay() {
    if (authElements.overlay) {
        authElements.overlay.classList.remove('visible');
        setTimeout(() => {
            authElements.overlay.hidden = true;
        }, 300);
    }
}

function showLoginForm() {
    if (authElements.loginForm) authElements.loginForm.hidden = false;
    if (authElements.signupForm) authElements.signupForm.hidden = true;
    if (authElements.verifyNotice) authElements.verifyNotice.hidden = true;
    clearAuthError('login');
    clearAuthError('signup');
}

function showSignupForm() {
    if (authElements.loginForm) authElements.loginForm.hidden = true;
    if (authElements.signupForm) authElements.signupForm.hidden = false;
    if (authElements.verifyNotice) authElements.verifyNotice.hidden = true;
    clearAuthError('login');
    clearAuthError('signup');
}

function showVerifyNotice(email) {
    if (authElements.loginForm) authElements.loginForm.hidden = true;
    if (authElements.signupForm) authElements.signupForm.hidden = true;
    if (authElements.verifyNotice) authElements.verifyNotice.hidden = false;
    if (authElements.verifyEmail) authElements.verifyEmail.textContent = email;
}

function showUserBar() {
    if (authElements.userBar) {
        authElements.userBar.hidden = false;
        if (authElements.userBarEmail) {
            authElements.userBarEmail.textContent = authState.user.email;
        }
    }
}

function showAuthError(type, message) {
    const el = type === 'login' ? authElements.loginError : authElements.signupError;
    if (el) {
        el.textContent = message;
        el.hidden = false;
    }
}

function clearAuthError(type) {
    const el = type === 'login' ? authElements.loginError : authElements.signupError;
    if (el) {
        el.textContent = '';
        el.hidden = true;
    }
}

function setAuthLoading(type, loading) {
    const btn = type === 'login' ? authElements.loginBtn : authElements.signupBtn;
    if (btn) {
        btn.disabled = loading;
        btn.querySelector('.auth-btn-text').textContent = loading
            ? (type === 'login' ? 'Signing in...' : 'Creating account...')
            : (type === 'login' ? 'Sign In' : 'Create Account');
    }
}


// ===== Pre-fill User Info =====
function prefillUserInfo() {
    // Inputs removed from DOM as per user request
    // We now use authState directly for submission
}


// ===== IP Address Capture =====
async function fetchIpAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        authState.ipAddress = data.ip;
        console.log('[Auth] IP captured');
    } catch (err) {
        console.warn('[Auth] Could not fetch IP:', err.message);
        authState.ipAddress = 'unknown';
    }
}


// ===== Consent Logging =====
async function logConsent() {
    if (!authState.user) return;

    try {
        const consentData = {
            user_id: authState.user.id,
            ip_address: authState.ipAddress || 'unknown',
            user_agent: navigator.userAgent,
            consent_ownership: document.getElementById('consentOwnership')?.checked ?? false,
            consent_license: document.getElementById('consentLicense')?.checked ?? false,
            consent_age: document.getElementById('consentAge')?.checked ?? false,
            consent_people: document.getElementById('consentPeople')?.checked ?? false,
            notify_launch: document.getElementById('notifyLaunch')?.checked ?? false
        };

        const { error } = await window.supabaseClient
            .from('consent_logs')
            .insert(consentData);

        if (error) throw error;
        console.log('[Auth] Consent logged successfully');
    } catch (err) {
        console.error('[Auth] Error logging consent:', err);
        // Non-blocking — don't fail the submission
    }
}


// ===== Auto-Save Form Progress =====
function startAutoSave() {
    // Save on input changes (debounced)
    document.addEventListener('input', debouncedSave);
    document.addEventListener('change', debouncedSave);

    // Also save periodically
    authState.saveInterval = setInterval(() => {
        saveFormProgress();
    }, 30000); // Every 30 seconds
}

function clearAutoSave() {
    document.removeEventListener('input', debouncedSave);
    document.removeEventListener('change', debouncedSave);
    if (authState.saveInterval) {
        clearInterval(authState.saveInterval);
    }
    if (authState.saveTimeout) {
        clearTimeout(authState.saveTimeout);
    }
}

function debouncedSave() {
    if (authState.saveTimeout) clearTimeout(authState.saveTimeout);
    authState.saveTimeout = setTimeout(() => {
        saveFormProgress();
    }, 3000); // 3 second debounce
}


// ===== Save Form Progress =====
async function saveFormProgress() {
    if (!authState.user || authState.isSaving || authState.isRestoring) return;

    try {
        const formData = collectFormData();
        const dataHash = JSON.stringify(formData);

        // Skip if nothing changed
        if (dataHash === authState.lastSavedHash) return;

        authState.isSaving = true;
        showSaveIndicator('saving');

        const { error } = await window.supabaseClient
            .from('form_progress')
            .upsert({
                user_id: authState.user.id,
                form_data: formData,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (error) throw error;

        authState.lastSavedHash = dataHash;
        showSaveIndicator('saved');
        console.log('[Auth] Progress saved');
    } catch (err) {
        console.error('[Auth] Error saving progress:', err);
        showSaveIndicator('error');
    } finally {
        authState.isSaving = false;
    }
}


// ===== Collect Current Form Data =====
function collectFormData() {
    return {
        user: {
            name: authState.user?.user_metadata?.full_name || '',
            email: authState.user?.email || ''
        },
        trip: {
            title: document.getElementById('tripTitle')?.value || '',
            description: document.getElementById('tripDescription')?.value || '',
            location: document.getElementById('tripLocation')?.value || '',
            // Save cover image URLs (not files — serialize only uploaded URLs)
            coverImages: (typeof state !== 'undefined' && state.trip)
                ? state.trip.coverImages.map(img => ({
                    url: img.remoteUrl || img.url || '',
                    id: img.id
                }))
                : []
        },
        // Save full days/stops state (with media URLs only)
        days: (typeof state !== 'undefined')
            ? state.days.map(day => ({
                id: day.id,
                number: day.number,
                title: day.title,
                stops: day.stops.map(stop => ({
                    id: stop.id,
                    type: stop.type,
                    title: stop.title,
                    description: stop.description,
                    media: stop.media.map(m => ({
                        id: m.id,
                        url: m.remoteUrl || m.url || '',
                        fileName: m.file?.name || '',
                        fileType: m.file?.type || '',
                        status: m.status
                    }))
                }))
            }))
            : [],
        consent: {
            ownership: document.getElementById('consentOwnership')?.checked ?? false,
            license: document.getElementById('consentLicense')?.checked ?? false,
            age: document.getElementById('consentAge')?.checked ?? false,
            people: document.getElementById('consentPeople')?.checked ?? false
        },
        preferences: {
            notifyLaunch: document.getElementById('notifyLaunch')?.checked ?? false
        },
        savedAt: new Date().toISOString()
    };
}


// ===== Restore Form Progress =====
async function restoreFormProgress() {
    if (!authState.user) return;

    try {
        authState.isRestoring = true;

        const { data, error } = await window.supabaseClient
            .from('form_progress')
            .select('form_data')
            .eq('user_id', authState.user.id)
            .maybeSingle();

        if (error) throw error;
        if (!data || !data.form_data) {
            console.log('[Auth] No saved progress found');
            return;
        }

        const saved = data.form_data;
        console.log('[Auth] Restoring saved progress from', saved.savedAt);

        // Restore trip details
        const titleInput = document.getElementById('tripTitle');
        if (titleInput && saved.trip?.title) titleInput.value = saved.trip.title;

        const descInput = document.getElementById('tripDescription');
        if (descInput && saved.trip?.description) descInput.value = saved.trip.description;

        const locInput = document.getElementById('tripLocation');
        if (locInput && saved.trip?.location) locInput.value = saved.trip.location;

        // Restore consent checkboxes
        if (saved.consent) {
            const cb1 = document.getElementById('consentOwnership');
            const cb2 = document.getElementById('consentLicense');
            const cb3 = document.getElementById('consentAge');
            const cb4 = document.getElementById('consentPeople');
            if (cb1) cb1.checked = saved.consent.ownership ?? false;
            if (cb2) cb2.checked = saved.consent.license ?? false;
            if (cb3) cb3.checked = saved.consent.age ?? false;
            if (cb4) cb4.checked = saved.consent.people ?? false;
        }

        // Restore preferences
        if (saved.preferences) {
            const notify = document.getElementById('notifyLaunch');
            if (notify) notify.checked = saved.preferences.notifyLaunch ?? false;
        }

        // Restore app state (trip, days, stops, media references)
        if (typeof state !== 'undefined') {
            // Restore trip state
            if (saved.trip) {
                state.trip.title = saved.trip.title || '';
                state.trip.description = saved.trip.description || '';
                state.trip.location = saved.trip.location || 'Iceland';

                // Restore cover images (only remote URLs — files need re-upload)
                if (saved.trip.coverImages && saved.trip.coverImages.length > 0) {
                    state.trip.coverImages = saved.trip.coverImages
                        .filter(img => img.url)
                        .map(img => ({
                            url: img.url,
                            remoteUrl: img.url,
                            id: img.id || generateId()
                        }));
                }
            }

            // Restore days/stops structure
            if (saved.days && saved.days.length > 0) {
                state.days = saved.days.map(day => ({
                    id: day.id || generateId(),
                    number: day.number,
                    title: day.title || '',
                    stops: (day.stops || []).map(stop => ({
                        id: stop.id || generateId(),
                        type: stop.type || 'activity',
                        title: stop.title || '',
                        description: stop.description || '',
                        media: (stop.media || [])
                            .filter(m => m.url && m.status === 'uploaded')
                            .map(m => ({
                                id: m.id || generateId(),
                                url: m.url,
                                remoteUrl: m.url,
                                status: 'uploaded',
                                fileName: m.fileName || '',
                                file: { name: m.fileName || '', type: m.fileType || '' }
                            }))
                    }))
                }));
                state.dayCounter = saved.days.length;
                state.currentDayIndex = 0;
            }

            // Re-render everything
            if (typeof renderDays === 'function') renderDays();
            if (typeof renderCoverPreviews === 'function') renderCoverPreviews();
            if (typeof updateMobilePreview === 'function') updateMobilePreview();
            if (typeof updateStats === 'function') updateStats();
            if (typeof updateDayNavigation === 'function') updateDayNavigation();
            if (typeof renderStopCards === 'function') renderStopCards();
        }

        // Set the hash so we don't immediately re-save
        authState.lastSavedHash = JSON.stringify(collectFormData());

        showSaveIndicator('restored');
        console.log('[Auth] Progress restored successfully');

    } catch (err) {
        console.error('[Auth] Error restoring progress:', err);
    } finally {
        authState.isRestoring = false;
    }
}


// ===== Clear Saved Progress (after successful submission) =====
async function clearFormProgress() {
    if (!authState.user) return;

    try {
        await window.supabaseClient
            .from('form_progress')
            .delete()
            .eq('user_id', authState.user.id);

        authState.lastSavedHash = null;
        console.log('[Auth] Saved progress cleared');
    } catch (err) {
        console.error('[Auth] Error clearing progress:', err);
    }
}


// ===== Save Indicator =====
function showSaveIndicator(status) {
    const indicator = authElements.saveIndicator;
    if (!indicator) return;

    indicator.hidden = false;
    indicator.className = 'save-indicator';

    switch (status) {
        case 'saving':
            indicator.innerHTML = '<span class="save-dot pulsing"></span> Saving...';
            indicator.classList.add('saving');
            break;
        case 'saved':
            indicator.innerHTML = '<span class="save-check">✓</span> Saved';
            indicator.classList.add('saved');
            setTimeout(() => { indicator.hidden = true; }, 2000);
            break;
        case 'restored':
            indicator.innerHTML = '<span class="save-check">↺</span> Progress restored';
            indicator.classList.add('restored');
            setTimeout(() => { indicator.hidden = true; }, 3000);
            break;
        case 'error':
            indicator.innerHTML = '<span class="save-x">✗</span> Save failed';
            indicator.classList.add('error');
            setTimeout(() => { indicator.hidden = true; }, 3000);
            break;
    }
}


// ===== Get Auth User ID (for submission payload) =====
function getAuthUserId() {
    return authState.user?.id || null;
}

// ===== Initialize on DOM ready =====
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure supabase-config.js has loaded
    setTimeout(initAuth, 100);
});
