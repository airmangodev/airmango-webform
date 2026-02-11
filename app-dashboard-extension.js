
// ==========================================
// DASHBOARD INTEGRATION
// ==========================================

window.app = {
    // Reset the editor to a clean state
    resetTrip: function () {
        // Reset State
        state.days = [];
        state.trip = {
            coverImages: [],
            title: '',
            description: '',
            location: 'Iceland'
        };
        state.dayCounter = 0;
        state.currentDayIndex = 0;
        state.activeUploads = 0;
        state.uploadQueue = [];

        // Reset DOM Inputs
        if (elements.tripTitle) elements.tripTitle.value = '';
        if (elements.tripDescription) elements.tripDescription.value = '';
        const loc = document.getElementById('tripLocation');
        if (loc) loc.value = 'Iceland';

        // Clear Cover Images
        if (elements.coverPreviewsContainer) {
            elements.coverPreviewsContainer.innerHTML = '';
            elements.coverPreviewsContainer.hidden = true;
        }
        if (elements.coverPlaceholder) elements.coverPlaceholder.style.display = 'flex';

        // Clear Checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

        // Render Empty
        renderDays();
        renderMobilePreview();
        updateStats();
        updateSubmitButton();

        console.log('[App] Trip editor reset');
    },

    // Load a trip into the editor
    loadTrip: function (data) {
        window.app.resetTrip();

        if (!data) return;

        // Restore Trip Details
        if (data.trip) {
            state.trip.title = data.trip.title || '';
            state.trip.description = data.trip.description || '';
            state.trip.location = data.trip.location || 'Iceland';

            // Restore images (ensure remoteUrl is prioritized)
            if (data.trip.coverImages) {
                state.trip.coverImages = data.trip.coverImages
                    .filter(img => img.url && !img.url.startsWith('blob:'))
                    .map(img => ({
                        url: img.url,
                        remoteUrl: img.url,
                        thumbnail: img.url,
                        id: img.id || generateId(),
                        status: 'uploaded'
                    }));
            }
        }

        // Update DOM inputs
        if (elements.tripTitle) elements.tripTitle.value = state.trip.title;
        if (elements.tripDescription) elements.tripDescription.value = state.trip.description;
        if (document.getElementById('tripLocation')) document.getElementById('tripLocation').value = state.trip.location;

        // Restore Days and Stops
        if (data.days) {
            state.days = data.days.map(day => ({
                id: day.id || generateId(),
                number: day.number,
                title: day.title || '',
                stops: (day.stops || []).map(stop => ({
                    id: stop.id || generateId(),
                    type: stop.type || 'activity',
                    title: stop.title || '',
                    description: stop.description || '',
                    media: (stop.media || [])
                        .filter(m => m.url && !m.url.startsWith('blob:'))
                        .map(m => ({
                            id: m.id || generateId(),
                            url: m.url,
                            remoteUrl: m.url,
                            thumbnail: m.url,
                            status: 'uploaded',
                            fileName: m.fileName || 'media',
                            file: { name: m.fileName || 'media', type: m.fileType || '' }
                        }))
                }))
            }));
            state.dayCounter = state.days.length;
        }

        // Restore Consent
        if (data.consent) {
            if (elements.consentOwnership) elements.consentOwnership.checked = data.consent.ownership;
            if (elements.consentLicense) elements.consentLicense.checked = data.consent.license;
            if (elements.consentAge) elements.consentAge.checked = data.consent.age;
            if (elements.consentPeople) elements.consentPeople.checked = data.consent.people;
        }

        // Re-render
        renderDays();
        renderCoverPreviews();
        renderMobilePreview();
        updateStats();
        updateSubmitButton();

        console.log('[App] Trip loaded');
    },

    // Collect Data for Saving
    getData: function () {
        return {
            trip: {
                title: state.trip.title,
                description: state.trip.description,
                location: state.trip.location,
                coverImages: state.trip.coverImages.map(img => ({
                    url: img.remoteUrl || img.url,
                    remoteUrl: img.remoteUrl || img.url,
                    id: img.id
                }))
            },
            days: state.days.map(day => ({
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
                        url: m.remoteUrl || m.url,
                        remoteUrl: m.remoteUrl || m.url,
                        fileName: m.file?.name,
                        fileType: m.file?.type,
                        status: 'uploaded'
                    }))
                }))
            })),
            consent: {
                ownership: elements.consentOwnership?.checked,
                license: elements.consentLicense?.checked,
                age: elements.consentAge?.checked,
                people: elements.consentPeople?.checked
            },
            updatedAt: new Date().toISOString()
        };
    }
};

// Bind Dashboard Back Button
document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('backToDashboardBtn');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.auth && window.auth.showDashboard) {
                window.auth.showDashboard();
            } else {
                console.warn('Auth dashboard interface not found');
            }
        });
    }
});
