/**
 * Airmango Trip Content Upload Form
 * Exact Figma Design Implementation
 */

// ===== Configuration =====
const CONFIG = {
    uploadWebhook: 'https://n8n.restaurantreykjavik.com/webhook/media-upload',
    maxVideoSize: 1024 * 1024 * 1024,
    maxImageSize: 50 * 1024 * 1024,
    maxConcurrentUploads: 2,
    allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'],
    allowedVideoTypes: ['video/mp4', 'video/quicktime', 'video/mov']
};

// ===== State =====
const state = {
    trip: {
        coverImage: null,
        title: '',
        description: '',
        location: 'Iceland'
    },
    days: [],
    dayCounter: 0,
    currentDayIndex: 0,
    activeUploads: 0,
    uploadQueue: []
};

// ===== DOM Elements =====
const elements = {
    daysContainer: document.getElementById('daysContainer'),
    addDayBtn: document.getElementById('addDayBtn'),
    submitBtn: document.getElementById('submitBtn'),
    userName: document.getElementById('userName'),
    userEmail: document.getElementById('userEmail'),
    legalConsent: document.getElementById('legalConsent'),

    coverUploadZone: document.getElementById('coverUploadZone'),
    coverImageInput: document.getElementById('coverImageInput'),
    coverPreview: document.getElementById('coverPreview'),
    coverPreviewImg: document.getElementById('coverPreviewImg'),
    coverPlaceholder: document.getElementById('coverPlaceholder'),
    removeCoverBtn: document.getElementById('removeCoverBtn'),
    tripTitle: document.getElementById('tripTitle'),
    tripDescription: document.getElementById('tripDescription'),
    tripLocation: document.getElementById('tripLocation'),

    appCoverImage: document.getElementById('appCoverImage'),
    appLocationBadge: document.getElementById('appLocationBadge'),
    appImageCounter: document.getElementById('appImageCounter'),
    appAuthorName: document.getElementById('appAuthorName'),
    appTripTitle: document.getElementById('appTripTitle'),
    appTripDesc: document.getElementById('appTripDesc'),
    dayNavLabel: document.getElementById('dayNavLabel'),
    dayNavTitle: document.getElementById('dayNavTitle'),
    dayPrevBtn: document.getElementById('dayPrevBtn'),
    dayNextBtn: document.getElementById('dayNextBtn'),
    stopsCarousel: document.getElementById('stopsCarousel'),
    stopsTrack: document.getElementById('stopsTrack'),

    totalDays: document.getElementById('totalDays'),
    totalStops: document.getElementById('totalStops'),
    totalMedia: document.getElementById('totalMedia'),

    toastContainer: document.getElementById('toastContainer'),
    successModal: document.getElementById('successModal')
};

// ===== Initialize =====
function init() {
    setupEventListeners();
    updateStats();
    updateSubmitButton();
    renderMobilePreview();
}

function setupEventListeners() {
    elements.addDayBtn?.addEventListener('click', addDay);
    elements.submitBtn?.addEventListener('click', handleSubmit);
    elements.userName?.addEventListener('input', () => {
        updateMobilePreview();
        updateSubmitButton();
    });
    elements.userEmail?.addEventListener('input', updateSubmitButton);
    elements.legalConsent?.addEventListener('change', updateSubmitButton);

    elements.coverUploadZone?.addEventListener('click', () => elements.coverImageInput.click());
    elements.coverImageInput?.addEventListener('change', handleCoverImageSelect);
    elements.removeCoverBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        removeCoverImage();
    });
    elements.tripTitle?.addEventListener('input', () => {
        state.trip.title = elements.tripTitle.value;
        updateMobilePreview();
        updateSubmitButton();
    });
    elements.tripDescription?.addEventListener('input', () => {
        state.trip.description = elements.tripDescription.value;
        updateMobilePreview();
        updateSubmitButton();
    });
    elements.tripLocation?.addEventListener('input', () => {
        state.trip.location = elements.tripLocation.value;
        updateMobilePreview();
    });

    // Day navigation - these scroll through stops, not change days
    elements.dayPrevBtn?.addEventListener('click', () => scrollStops(-1));
    elements.dayNextBtn?.addEventListener('click', () => scrollStops(1));

    setupCarouselSwipe();
}

// ===== Scroll Stops with Arrow Buttons =====
function scrollStops(direction) {
    const carousel = elements.stopsCarousel;
    if (!carousel) return;

    const cardWidth = 220 + 12; // card width + gap
    carousel.scrollBy({
        left: direction * cardWidth,
        behavior: 'smooth'
    });
}

// ===== Cover Image Handling =====
function handleCoverImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!CONFIG.allowedImageTypes.includes(file.type)) {
        showToast('Please select a valid image file (JPG, PNG, HEIC)', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        state.trip.coverImage = {
            file: file,
            url: e.target.result,
            thumbnail: e.target.result
        };

        elements.coverPreviewImg.src = e.target.result;
        elements.coverPreview.hidden = false;
        elements.coverPlaceholder.style.display = 'none';

        updateMobilePreview();
        updateSubmitButton();
    };
    reader.readAsDataURL(file);
}

function removeCoverImage() {
    state.trip.coverImage = null;
    elements.coverPreviewImg.src = '';
    elements.coverPreview.hidden = true;
    elements.coverPlaceholder.style.display = 'flex';
    elements.coverImageInput.value = '';
    updateMobilePreview();
    updateSubmitButton();
}

// ===== Days & Stops Management =====
function addDay() {
    state.dayCounter++;
    const day = {
        id: generateId(),
        number: state.dayCounter,
        title: '',
        stops: []
    };
    state.days.push(day);
    state.currentDayIndex = state.days.length - 1;
    renderDays();
    renderMobilePreview();
    updateStats();
    updateSubmitButton();
}

function removeDay(dayId) {
    const dayIndex = state.days.findIndex(d => d.id === dayId);
    if (dayIndex === -1) return;

    state.days.splice(dayIndex, 1);
    state.days.forEach((day, index) => { day.number = index + 1; });
    state.dayCounter = state.days.length;

    if (state.currentDayIndex >= state.days.length) {
        state.currentDayIndex = Math.max(0, state.days.length - 1);
    }

    renderDays();
    renderMobilePreview();
    updateStats();
    updateSubmitButton();
}

function updateDayTitle(dayId, title) {
    const day = state.days.find(d => d.id === dayId);
    if (day) {
        day.title = title;
        renderMobilePreview();
        updateSubmitButton();
    }
}

function addStop(dayId, type) {
    const day = state.days.find(d => d.id === dayId);
    if (!day) return;

    const stop = {
        id: generateId(),
        type: type,
        title: '',
        description: '',
        media: []
    };

    day.stops.push(stop);
    renderDays();
    renderMobilePreview();
    updateStats();
    updateSubmitButton();
}

function removeStop(stopId) {
    for (const day of state.days) {
        const stopIndex = day.stops.findIndex(s => s.id === stopId);
        if (stopIndex !== -1) {
            day.stops.splice(stopIndex, 1);
            renderDays();
            renderMobilePreview();
            updateStats();
            updateSubmitButton();
            return;
        }
    }
}

function updateStopTitle(stopId, title) {
    const stop = findStopById(stopId);
    if (stop) {
        stop.title = title;
        renderMobilePreview();
        updateSubmitButton();
    }
}

function updateStopDescription(stopId, description) {
    const stop = findStopById(stopId);
    if (stop) {
        stop.description = description;
        renderMobilePreview();
        updateSubmitButton();
    }
}

function findStopById(stopId) {
    for (const day of state.days) {
        const stop = day.stops.find(s => s.id === stopId);
        if (stop) return stop;
    }
    return null;
}

// ===== Carousel Swipe Support =====
function setupCarouselSwipe() {
    const carousel = elements.stopsCarousel;
    if (!carousel) return;

    let startX = 0;
    let scrollLeft = 0;
    let isDragging = false;
    let startTime = 0;

    carousel.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
        startTime = Date.now();
        carousel.style.cursor = 'grabbing';
    });

    carousel.addEventListener('mouseleave', () => {
        isDragging = false;
        carousel.style.cursor = 'grab';
    });

    carousel.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        carousel.style.cursor = 'grab';

        const endX = e.pageX - carousel.offsetLeft;
        const distance = startX - endX;
        const duration = Date.now() - startTime;

        if (duration < 200 && Math.abs(distance) > 50) {
            const velocity = distance / duration;
            carousel.scrollBy({ left: velocity * 200, behavior: 'smooth' });
        }
    });

    carousel.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - carousel.offsetLeft;
        const walk = (x - startX) * 1.5;
        carousel.scrollLeft = scrollLeft - walk;
    });

    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].pageX;
        scrollLeft = carousel.scrollLeft;
        startTime = Date.now();
    }, { passive: true });

    carousel.addEventListener('touchmove', (e) => {
        const x = e.touches[0].pageX;
        const walk = (x - startX);
        carousel.scrollLeft = scrollLeft - walk;
    }, { passive: true });

    carousel.addEventListener('touchend', (e) => {
        const endX = e.changedTouches[0].pageX;
        const distance = startX - endX;
        const duration = Date.now() - startTime;

        if (duration < 200 && Math.abs(distance) > 30) {
            const velocity = distance / duration;
            carousel.scrollBy({ left: velocity * 150, behavior: 'smooth' });
        }
    });
}

// ===== Media Upload per Stop =====
function handleStopMediaUpload(stopId, files) {
    const stop = findStopById(stopId);
    if (!stop) return;

    for (const file of files) {
        const validation = validateFile(file);
        if (!validation.valid) {
            showToast(validation.error, 'error');
            continue;
        }

        const mediaItem = {
            id: generateId(),
            file: file,
            url: null,
            thumbnail: null,
            status: 'pending'
        };

        stop.media.push(mediaItem);
        generateThumbnail(mediaItem, file);
        state.uploadQueue.push({ stopId, mediaId: mediaItem.id });
    }

    renderDays();
    renderMobilePreview();
    updateStats();
    processUploadQueue();
}

function removeMediaFromStop(stopId, mediaId) {
    const stop = findStopById(stopId);
    if (!stop) return;

    const mediaIndex = stop.media.findIndex(m => m.id === mediaId);
    if (mediaIndex !== -1) {
        stop.media.splice(mediaIndex, 1);
        renderDays();
        renderMobilePreview();
        updateStats();
        updateSubmitButton();
    }
}

function validateFile(file) {
    const isImage = CONFIG.allowedImageTypes.includes(file.type);
    const isVideo = CONFIG.allowedVideoTypes.includes(file.type);

    if (!isImage && !isVideo) {
        return { valid: false, error: `Unsupported file type: ${file.name}` };
    }

    if (isVideo && file.size > CONFIG.maxVideoSize) {
        return { valid: false, error: `Video too large: ${file.name} (max 1GB)` };
    }

    if (isImage && file.size > CONFIG.maxImageSize) {
        return { valid: false, error: `Image too large: ${file.name} (max 50MB)` };
    }

    return { valid: true };
}

function generateThumbnail(mediaItem, file) {
    const isVideo = file.type.startsWith('video/');

    if (isVideo) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        video.onloadeddata = () => { video.currentTime = 1; };
        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 220;
            canvas.height = 116;
            const ctx = canvas.getContext('2d');
            const scale = Math.max(220 / video.videoWidth, 116 / video.videoHeight);
            const x = (220 - video.videoWidth * scale) / 2;
            const y = (116 - video.videoHeight * scale) / 2;
            ctx.drawImage(video, x, y, video.videoWidth * scale, video.videoHeight * scale);
            mediaItem.thumbnail = canvas.toDataURL('image/jpeg', 0.7);
            URL.revokeObjectURL(video.src);
            renderDays();
            renderMobilePreview();
        };
    } else {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 220;
                canvas.height = 116;
                const ctx = canvas.getContext('2d');
                const scale = Math.max(220 / img.width, 116 / img.height);
                const x = (220 - img.width * scale) / 2;
                const y = (116 - img.height * scale) / 2;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                mediaItem.thumbnail = canvas.toDataURL('image/jpeg', 0.7);
                renderDays();
                renderMobilePreview();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// ===== Upload Queue Processing =====
function processUploadQueue() {
    while (state.uploadQueue.length > 0 && state.activeUploads < CONFIG.maxConcurrentUploads) {
        const item = state.uploadQueue.shift();
        uploadMedia(item.stopId, item.mediaId);
    }
}

async function uploadMedia(stopId, mediaId) {
    const stop = findStopById(stopId);
    if (!stop) return;

    const mediaItem = stop.media.find(m => m.id === mediaId);
    if (!mediaItem || mediaItem.status === 'uploaded') return;

    mediaItem.status = 'uploading';
    state.activeUploads++;
    renderDays();

    try {
        const formData = new FormData();
        formData.append('file', mediaItem.file);
        formData.append('stopId', stopId);
        formData.append('mediaId', mediaId);

        const response = await fetch(CONFIG.uploadWebhook, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');

        const result = await response.json();
        mediaItem.url = result.url || result.fileUrl || `uploaded_${mediaId}`;
        mediaItem.status = 'uploaded';
        showToast('File uploaded successfully', 'success');
    } catch (error) {
        console.error('Upload error:', error);
        mediaItem.status = 'error';
        showToast(`Upload failed: ${mediaItem.file.name}`, 'error');
    } finally {
        state.activeUploads--;
        renderDays();
        updateStats();
        updateSubmitButton();
        processUploadQueue();
    }
}

// ===== Render Days (Editor) =====
function renderDays() {
    if (!elements.daysContainer) return;

    if (state.days.length === 0) {
        elements.daysContainer.innerHTML = `
            <div class="empty-state">
                <p>No days added yet. Click "Add Day" to start organizing your trip.</p>
            </div>
        `;
        return;
    }

    elements.daysContainer.innerHTML = state.days.map(day => createDayHtml(day)).join('');

    state.days.forEach(day => {
        day.stops.forEach(stop => {
            const fileInput = document.getElementById(`media-input-${stop.id}`);
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    handleStopMediaUpload(stop.id, e.target.files);
                    e.target.value = '';
                });
            }
        });
    });
}

function createDayHtml(day) {
    return `
        <div class="day-card" data-day-id="${day.id}">
            <div class="day-header">
                <div class="day-title">
                    <span class="day-number">Day ${day.number}</span>
                    <input type="text" class="day-title-input" 
                        placeholder="Enter day title" 
                        value="${escapeHtml(day.title)}"
                        onchange="updateDayTitle('${day.id}', this.value)"
                        required>
                    <span class="required">*</span>
                </div>
                <div class="day-actions">
                    <button type="button" class="btn btn-icon btn-danger" onclick="removeDay('${day.id}')" title="Remove Day">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path d="M6 2l2-2h4l2 2h4v2H2V2h4zM3 6h14l-1 12H4L3 6zm5 2v8M12 8v8"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="day-content">
                <div class="stops-container">
                    ${day.stops.map(stop => createStopHtml(stop)).join('')}
                </div>
                <div class="add-stop-buttons">
                    <button type="button" class="btn btn-outline btn-sm" onclick="addStop('${day.id}', 'activity')">+ Activity</button>
                    <button type="button" class="btn btn-outline btn-sm" onclick="addStop('${day.id}', 'attraction')">+ Attraction</button>
                    <button type="button" class="btn btn-outline btn-sm" onclick="addStop('${day.id}', 'accommodation')">+ Accommodation</button>
                </div>
            </div>
        </div>
    `;
}

function createStopHtml(stop) {
    const typeLabels = { activity: 'Activity', attraction: 'Attraction', accommodation: 'Accommodation' };

    return `
        <div class="stop-card ${stop.type}" data-stop-id="${stop.id}">
            <div class="stop-header">
                <div class="stop-type">
                    <span class="stop-badge ${stop.type}">${typeLabels[stop.type]}</span>
                </div>
                <button type="button" class="btn btn-icon btn-sm" onclick="removeStop('${stop.id}')" title="Remove">
                    <svg viewBox="0 0 20 20" fill="none">
                        <path d="M6 6L14 14M6 14L14 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <div class="stop-form">
                <div class="stop-form-group">
                    <label>Title <span class="required">*</span></label>
                    <input type="text" placeholder="Enter ${typeLabels[stop.type].toLowerCase()} name"
                        value="${escapeHtml(stop.title)}"
                        onchange="updateStopTitle('${stop.id}', this.value)" required>
                </div>
                <div class="stop-form-group">
                    <label>Description <span class="required">*</span></label>
                    <textarea placeholder="Describe this ${typeLabels[stop.type].toLowerCase()}..."
                        onchange="updateStopDescription('${stop.id}', this.value)" required>${escapeHtml(stop.description)}</textarea>
                </div>
                <div class="stop-media-section">
                    <label class="stop-media-upload" onclick="document.getElementById('media-input-${stop.id}').click()">
                        <svg viewBox="0 0 20 20" fill="none">
                            <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <span>Add Photos/Videos</span>
                        <input type="file" id="media-input-${stop.id}" multiple 
                            accept="image/jpeg,image/jpg,image/png,image/heic,video/mp4,video/quicktime,video/mov" hidden>
                    </label>
                    ${stop.media.length > 0 ? `
                        <div class="stop-media-grid">
                            ${stop.media.map(m => `
                                <div class="stop-media-item ${m.status}">
                                    ${m.thumbnail ? `<img src="${m.thumbnail}" alt="Media">` : '<div class="loading"></div>'}
                                    <button type="button" class="remove-media" onclick="removeMediaFromStop('${stop.id}', '${m.id}')">&times;</button>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// ===== Render Mobile Preview =====
function renderMobilePreview() {
    updateMobilePreview();
    renderStopCards();
    updateDayNavigation();
}

function updateMobilePreview() {
    // Update cover image
    const coverImageEl = elements.appCoverImage;
    if (coverImageEl) {
        if (state.trip.coverImage) {
            coverImageEl.style.backgroundImage = `url('${state.trip.coverImage.url}')`;
            coverImageEl.innerHTML = '';
        } else {
            coverImageEl.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            coverImageEl.innerHTML = `
                <div class="cover-placeholder-app">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                    </svg>
                    <span>Add cover image</span>
                </div>
            `;
        }
    }

    // Update location badge
    if (elements.appLocationBadge) {
        const span = elements.appLocationBadge.querySelector('span');
        if (span) span.textContent = state.trip.location || 'Iceland';
    }

    // Count total media
    let totalMedia = state.trip.coverImage ? 1 : 0;
    state.days.forEach(day => {
        day.stops.forEach(stop => { totalMedia += stop.media.length; });
    });
    if (elements.appImageCounter) {
        elements.appImageCounter.textContent = `1/${totalMedia || 1}`;
    }

    // Update author name
    if (elements.appAuthorName) {
        elements.appAuthorName.textContent = elements.userName?.value || 'Your Name';
    }

    // Update trip title
    if (elements.appTripTitle) {
        elements.appTripTitle.textContent = state.trip.title || 'South Iceland Highlights';
    }

    // Update trip description
    if (elements.appTripDesc) {
        elements.appTripDesc.textContent = state.trip.description || 'Discover the most iconic landscapes of South Iceland — from moss-covered canyons and black-sand beaches to powerful waterfalls and dramatic cliffs sha...';
    }
}

function updateDayNavigation() {
    const totalDays = state.days.length;

    if (totalDays === 0) {
        if (elements.dayNavLabel) elements.dayNavLabel.textContent = 'Day 1 of 1:';
        if (elements.dayNavTitle) elements.dayNavTitle.textContent = 'South Coast Discovery';
        if (elements.dayPrevBtn) elements.dayPrevBtn.disabled = true;
        if (elements.dayNextBtn) elements.dayNextBtn.disabled = true;
        return;
    }

    const currentDay = state.days[state.currentDayIndex];
    if (elements.dayNavLabel) elements.dayNavLabel.textContent = `Day ${currentDay.number} of ${totalDays}:`;
    if (elements.dayNavTitle) elements.dayNavTitle.textContent = currentDay.title || 'No title';

    // Enable/disable based on scroll position and number of stops
    const hasStops = state.days.some(d => d.stops.length > 0);
    if (elements.dayPrevBtn) elements.dayPrevBtn.disabled = !hasStops;
    if (elements.dayNextBtn) elements.dayNextBtn.disabled = !hasStops;
}

function renderStopCards() {
    if (!elements.stopsTrack) return;

    // Collect all stops across all days
    let allStops = [];
    let stopNumber = 1;

    state.days.forEach((day, dayIndex) => {
        // Add day divider before each day except the first
        if (dayIndex > 0 && day.stops.length > 0) {
            allStops.push({ type: 'divider', dayNumber: day.number });
        }

        day.stops.forEach((stop, stopIndex) => {
            allStops.push({
                type: 'stop',
                stop: stop,
                stopNumber: stopNumber,
                isTapped: stopIndex === 0 && dayIndex === 0 // Mark first stop as tapped
            });
            stopNumber++;
        });
    });

    if (allStops.length === 0) {
        elements.stopsTrack.innerHTML = `
            <div class="stop-card-empty">
                <p>Add stops to your days to see them here</p>
            </div>
        `;
        return;
    }

    elements.stopsTrack.innerHTML = allStops.map(item => {
        if (item.type === 'divider') {
            return `
                <div class="app-day-divider">
                    <span>Day ${item.dayNumber}</span>
                </div>
            `;
        }

        const stop = item.stop;
        const coverImage = stop.media.length > 0 && stop.media[0].thumbnail
            ? stop.media[0].thumbnail
            : null;

        return `
            <div class="app-stop-card ${item.isTapped ? 'tapped' : ''}">
                <div class="stop-card-image" style="${coverImage ? `background-image: url('${coverImage}')` : ''}">
                    <span class="stop-card-badge">Stop ${item.stopNumber}</span>
                    ${item.isTapped ? '<span class="stop-card-tapped-badge">Tapped in Feed</span>' : ''}
                </div>
                <div class="stop-card-content">
                    <div class="stop-card-title">${escapeHtml(stop.title) || 'Untitled'}</div>
                    <div class="stop-card-desc">${escapeHtml(stop.description) || 'No description'}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== Stats & Validation =====
function updateStats() {
    const totalDays = state.days.length;
    let totalStops = 0;
    let totalMedia = state.trip.coverImage ? 1 : 0;

    state.days.forEach(day => {
        totalStops += day.stops.length;
        day.stops.forEach(stop => { totalMedia += stop.media.length; });
    });

    if (elements.totalDays) elements.totalDays.textContent = totalDays;
    if (elements.totalStops) elements.totalStops.textContent = totalStops;
    if (elements.totalMedia) elements.totalMedia.textContent = totalMedia;
}

function updateSubmitButton() {
    const isValid = validateForm();
    if (elements.submitBtn) elements.submitBtn.disabled = !isValid;
}

function validateForm() {
    const userName = elements.userName?.value.trim();
    const userEmail = elements.userEmail?.value.trim();
    const legalConsent = elements.legalConsent?.checked;

    if (!userName || !userEmail || !legalConsent) return false;
    if (!isValidEmail(userEmail)) return false;
    if (!state.trip.coverImage) return false;
    if (!state.trip.title.trim()) return false;
    if (!state.trip.description.trim()) return false;
    if (state.days.length === 0) return false;

    for (const day of state.days) {
        if (!day.title.trim()) return false;
        for (const stop of day.stops) {
            if (!stop.title.trim() || !stop.description.trim()) return false;
        }
    }

    if (state.activeUploads > 0) return false;

    return true;
}

// ===== Submit =====
async function handleSubmit() {
    if (!validateForm()) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    const submitBtn = elements.submitBtn;
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    submitBtn.disabled = true;
    if (btnText) btnText.hidden = true;
    if (btnLoader) btnLoader.hidden = false;

    try {
        const payload = buildSubmissionPayload();

        const response = await fetch(CONFIG.uploadWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Submission failed');

        if (elements.successModal) elements.successModal.hidden = false;
    } catch (error) {
        console.error('Submit error:', error);
        showToast('Submission failed. Please try again.', 'error');
        submitBtn.disabled = false;
    } finally {
        if (btnText) btnText.hidden = false;
        if (btnLoader) btnLoader.hidden = true;
    }
}

function buildSubmissionPayload() {
    return {
        user: {
            name: elements.userName.value.trim(),
            email: elements.userEmail.value.trim()
        },
        trip: {
            title: state.trip.title,
            description: state.trip.description,
            location: state.trip.location,
            coverImage: state.trip.coverImage?.url || null
        },
        submittedAt: new Date().toISOString(),
        days: state.days.map(day => ({
            number: day.number,
            title: day.title,
            stops: day.stops.map(stop => ({
                type: stop.type,
                title: stop.title,
                description: stop.description,
                media: stop.media.filter(m => m.status === 'uploaded').map(m => ({
                    url: m.url,
                    fileName: m.file.name,
                    fileType: m.file.type,
                    fileSize: m.file.size
                }))
            }))
        }))
    };
}

// ===== Toast Notifications =====
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : '!'}</span>
        <span class="toast-message">${message}</span>
    `;

    elements.toastContainer?.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== Utilities =====
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== Expose functions globally =====
window.removeDay = removeDay;
window.addStop = addStop;
window.removeStop = removeStop;
window.updateDayTitle = updateDayTitle;
window.updateStopTitle = updateStopTitle;
window.updateStopDescription = updateStopDescription;
window.removeMediaFromStop = removeMediaFromStop;

// ===== Initialize on DOM load =====
document.addEventListener('DOMContentLoaded', init);
