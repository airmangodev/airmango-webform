/**
 * ============================================================================
 * AIRMANGO TRIP CONTENT UPLOAD FORM
 * ============================================================================
 *
 * TABLE OF CONTENTS
 * -----------------
 * 1.  Configuration (CONFIG)                          ~Line 30
 * 2.  State Management                                ~Line 40
 * 3.  DOM Elements                                    ~Line 60
 * 4.  Initialize & Event Listeners                    ~Line 120
 * 5.  Scroll/Navigation Helpers                       ~Line 175
 * 6.  Cover Image Handling                            ~Line 190
 * 7.  Days & Stops Management                         ~Line 280
 *     - addDay, removeDay, updateDayTitle
 *     - addStop, removeStop, updateStopTitle/Description
 * 8.  Carousel Swipe Support                          ~Line 395
 * 9.  Media Upload per Stop                           ~Line 510
 *     - handleStopMediaUpload, removeMediaFromStop
 *     - validateFile, generateThumbnail
 * 10. Upload Queue Processing                         ~Line 645
 * 11. Render Days (Editor Panel)                      ~Line 740
 *     - renderDays, createDayHtml, createStopHtml
 * 12. Render Mobile Preview                           ~Line 850
 *     - updateMobilePreview, scrollCoverMedia
 *     - renderStopCards, updateDayNavigation
 * 13. Stats & Form Validation                         ~Line 1035
 * 14. Form Submission                                 ~Line 1100
 * 15. Toast Notifications                             ~Line 1170
 * 16. Utility Functions                               ~Line 1190
 * 17. Stops Detail Screen                             ~Line 1205
 *     - openStopsDetailScreen, closeStopsDetailScreen
 *     - renderStopsTabs, renderStopsMedia
 * 18. Media Feed (Reels-Style)                        ~Line 1330
 *     - openMediaFeed, closeMediaFeed
 *     - renderFeedItems, navigateFeed
 *     - setupFeedSwipe, toggleFeedVideo
 * 19. Global Function Exports                         ~Line 1765
 *
 * ============================================================================
 */

// ===== Configuration =====
const CONFIG = {
    mediaUploadWebhook: 'https://n8n.restaurantreykjavik.com/webhook/general-media-upload',
    finalSubmissionWebhook: 'https://n8n.restaurantreykjavik.com/webhook/new-form-trip-submission',
    maxVideoSize: 1024 * 1024 * 1024,
    maxImageSize: 50 * 1024 * 1024,
    maxConcurrentUploads: 2,
    allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'],
    allowedVideoTypes: ['video/mp4', 'video/quicktime', 'video/mov']
};

// ===== Clicky Analytics Helper =====
// Tracks custom events in Clicky analytics dashboard
function trackEvent(action, label = '', value = '') {
    try {
        if (typeof clicky !== 'undefined' && clicky.goal) {
            // Clicky goal tracking: clicky.goal(goalName, revenue, noQueue)
            clicky.goal(action);
        }
        if (typeof clicky !== 'undefined' && clicky.log) {
            // Also log as a custom page view for more detail
            const path = `/events/${action}${label ? '/' + label : ''}`;
            clicky.log(path, action + (label ? ': ' + label : ''));
        }
        console.log(`[Analytics] ${action}${label ? ': ' + label : ''}${value ? ' (' + value + ')' : ''}`);
    } catch (e) {
        // Silently fail if Clicky is not loaded
        console.log(`[Analytics] ${action}${label ? ': ' + label : ''} (Clicky not loaded)`);
    }
}

// ===== State =====
const state = {
    trip: {
        coverImages: [], // Array of {url, file, id}
        title: '',
        description: '',
        location: 'Iceland'
    },
    days: [],
    dayCounter: 0,
    currentDayIndex: 0,
    currentCoverIndex: 0, // For cover image slider
    activeUploads: 0,
    uploadQueue: [],
    selectedStopIndex: 0,  // For stops detail screen
    // Media Feed state
    feed: {
        items: [],        // Filtered featured media
        currentIndex: 0,  // Currently viewing
        isOpen: false
    }
};

// ===== DOM Elements =====
const elements = {
    daysContainer: document.getElementById('daysContainer'),
    addDayBtn: document.getElementById('addDayBtn'),
    submitBtn: document.getElementById('submitBtn'),
    // userName/userEmail removed - accessing via authState instead
    legalConsent: document.getElementById('legalConsent'),

    coverUploadZone: document.getElementById('coverUploadZone'),
    coverImageInput: document.getElementById('coverImageInput'),
    coverPreviewsContainer: document.getElementById('coverPreviewsContainer'),
    coverPlaceholder: document.getElementById('coverPlaceholder'),
    tripTitle: document.getElementById('tripTitle'),
    tripDescription: document.getElementById('tripDescription'),
    tripLocation: document.getElementById('tripLocation'),

    appCoverSlider: document.getElementById('appCoverSlider'),
    appLocationBadge: document.getElementById('appLocationBadge'),
    appImageCounter: document.getElementById('appImageCounter'),
    appAuthorName: document.getElementById('appAuthorName'),
    appTripTitle: document.getElementById('appTripTitle'),
    appTripDesc: document.getElementById('appTripDesc'),
    coverPrevBtn: document.getElementById('coverPrevBtn'),
    coverNextBtn: document.getElementById('coverNextBtn'),
    dayNavLabel: document.getElementById('dayNavLabel'),
    dayNavTitle: document.getElementById('dayNavTitle'),
    dayPrevBtn: document.getElementById('dayPrevBtn'),
    dayNextBtn: document.getElementById('dayNextBtn'),
    stopsCarousel: document.getElementById('stopsCarousel'),
    stopsTrack: document.getElementById('stopsTrack'),

    // Stops Detail Screen
    stopsDetailScreen: document.getElementById('stopsDetailScreen'),
    stopsTabs: document.getElementById('stopsTabs'),
    stopsMediaGallery: document.getElementById('stopsMediaGallery'),
    stopCardsHint: document.getElementById('stopCardsHint'),
    mainFeedHint: document.getElementById('mainFeedHint'),
    tripReviewHint: document.getElementById('tripReviewHint'),

    // Media Feed
    mediaFeed: document.getElementById('mediaFeed'),
    feedViewport: document.getElementById('feedViewport'),
    feedPrev: document.getElementById('feedPrev'),
    feedCurrent: document.getElementById('feedCurrent'),
    feedNext: document.getElementById('feedNext'),
    feedUsername: document.getElementById('feedUsername'),
    feedCaption: document.getElementById('feedCaption'),
    feedTripThumb: document.getElementById('feedTripThumb'),
    feedProgress: document.getElementById('feedProgress'),

    totalDays: document.getElementById('totalDays'),
    totalStops: document.getElementById('totalStops'),
    totalMedia: document.getElementById('totalMedia'),

    toastContainer: document.getElementById('toastContainer'),
    successModal: document.getElementById('successModal'),

    // Opt-in checkboxes
    notifyLaunch: document.getElementById('notifyLaunch'),
    travelArchitect: document.getElementById('travelArchitect'),

    // Consent checkboxes
    consentOwnership: document.getElementById('consentOwnership'),
    consentLicense: document.getElementById('consentLicense'),
    consentAge: document.getElementById('consentAge'),
    consentPeople: document.getElementById('consentPeople'),

    // Inline stats (inside left panel)
    totalDaysInline: document.getElementById('totalDaysInline'),
    totalStopsInline: document.getElementById('totalStopsInline'),
    totalMediaInline: document.getElementById('totalMediaInline')
};

// ===== Initialize =====
function init() {
    // Detect if loaded in an iframe for defensive UI adjustments
    if (window.self !== window.top) {
        document.body.classList.add('is-iframe');
    }

    setupEventListeners();
    updateStats();
    updateSubmitButton();
    renderMobilePreview();

    // Warn before page refresh/close if there's unsaved data
    // Warn before page refresh/close if there's unsaved data
    window.addEventListener('beforeunload', (e) => {
        // Skip check if successfully submitted
        if (state.isSubmitted) return;

        const hasData = state.days.length > 0 ||
            state.trip.coverImages.length > 0 ||
            elements.userName?.value ||
            elements.tripTitle?.value;

        if (hasData) {
            e.preventDefault();
            e.returnValue = ''; // Required for Chrome
            return 'You have unsaved changes. Are you sure you want to leave?';
        }
    });
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

    // Consent checkboxes
    document.querySelectorAll('.consent-cb').forEach(cb => {
        cb.addEventListener('change', updateSubmitButton);
    });

    elements.coverUploadZone?.addEventListener('click', () => elements.coverImageInput.click());
    elements.coverImageInput?.addEventListener('change', handleCoverImageSelect);

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
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Limit to 10 images total
    const remainingSlots = 10 - state.trip.coverImages.length;
    const filesToProcess = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
        showToast(`You can only upload up to 10 cover images. Only the first ${remainingSlots} were added.`, 'warning');
    }

    filesToProcess.forEach(async (file) => {
        if (!CONFIG.allowedImageTypes.includes(file.type)) {
            showToast(`Skipping invalid file: ${file.name}`, 'error');
            return;
        }

        try {
            // Optimize: Create thumbnail first, then use its source for preview
            const thumbnail = await createThumbnailDataUrl(file);

            // For the full image in the preview, we can use the same data URL if it's an image
            // Or use URL.createObjectURL for better performance with large files
            const fullImageUrl = URL.createObjectURL(file);
            const mediaId = generateId();

            state.trip.coverImages.push({
                id: mediaId,
                file: file,
                url: fullImageUrl,
                thumbnail: thumbnail || fullImageUrl,
                status: 'pending'
            });

            state.uploadQueue.push({ stopId: 'cover', mediaId: mediaId });
            renderCoverPreviews();
            updateMobilePreview();
            updateStats();
            updateSubmitButton();
            processUploadQueue();
        } catch (err) {
            console.error('Error processing file:', file.name, err);
            showToast(`Failed to process ${file.name}`, 'error');
        }
    });

    elements.coverImageInput.value = '';

    // Track analytics
    if (filesToProcess.length > 0) {
        trackEvent('upload_cover_image', '', `${filesToProcess.length} images`);
    }
}

function renderCoverPreviews() {
    if (!elements.coverPreviewsContainer) return;

    if (state.trip.coverImages.length === 0) {
        elements.coverPreviewsContainer.hidden = true;
        elements.coverPreviewsContainer.innerHTML = ''; // Clear any existing previews
        if (elements.coverPlaceholder) {
            elements.coverPlaceholder.style.display = 'flex';
        }
        return;
    }

    elements.coverPreviewsContainer.hidden = false;
    if (elements.coverPlaceholder) {
        elements.coverPlaceholder.style.display = 'none';
    }

    elements.coverPreviewsContainer.innerHTML = state.trip.coverImages.map((img, index) => `
        <div class="cover-preview-item ${img.status || ''}">
            <img src="${img.thumbnail}" alt="Cover ${index + 1}">
            ${img.status === 'uploading' ? '<div class="loading-spinner"></div>' : ''}
            <button type="button" class="cover-remove-btn" onclick="removeCoverImage(${index}, event)">&times;</button>
        </div>
    `).join('');
}

function removeCoverImage(index, event) {
    if (event) event.stopPropagation();

    // Revoke object URL to prevent memory leaks
    const removedImage = state.trip.coverImages[index];
    if (removedImage && removedImage.url && removedImage.url.startsWith('blob:')) {
        URL.revokeObjectURL(removedImage.url);
    }

    state.trip.coverImages.splice(index, 1);

    // Adjust currentCoverIndex if needed
    if (state.currentCoverIndex >= state.trip.coverImages.length) {
        state.currentCoverIndex = Math.max(0, state.trip.coverImages.length - 1);
    }

    renderCoverPreviews();
    updateMobilePreview();
    updateStats();
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
    // Remove: state.currentDayIndex = state.days.length - 1; 
    // We stay on the current day unless the user scrolls or we explicitly scroll there.
    renderDays();
    renderMobilePreview();
    updateStats();
    updateSubmitButton();

    // Track analytics
    trackEvent('add_day', `Day ${state.dayCounter}`);
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

    // Check if day already has an accommodation - it must be the last stop
    const hasAccommodation = day.stops.some(s => s.type === 'accommodation');
    if (hasAccommodation && type !== 'accommodation') {
        showToast('Accommodation should be the last stop of the day. Remove it first to add more activities.', 'error');
        return;
    }

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

    // Track analytics
    trackEvent('add_stop', type, `Day ${day.number}`);
}

function removeStop(stopId) {
    for (const day of state.days) {
        const stopIndex = day.stops.findIndex(s => s.id === stopId);
        if (stopIndex !== -1) {
            // Revoke object URLs for media in the removed stop
            day.stops[stopIndex].media.forEach(m => {
                if (m.url && m.url.startsWith('blob:')) URL.revokeObjectURL(m.url);
                if (m.thumbnail && m.thumbnail.startsWith('blob:')) URL.revokeObjectURL(m.thumbnail);
            });

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

    // Touch support for stops carousel
    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].pageX - carousel.offsetLeft;
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

    // Sync Day Title with Scroll Position
    carousel.addEventListener('scroll', () => {
        if (carousel._scrollLock) return;

        if (carousel._scrollTimeout) clearTimeout(carousel._scrollTimeout);
        carousel._scrollTimeout = setTimeout(updateCurrentDayFromScroll, 50);
    });
}

function updateCurrentDayFromScroll() {
    const carousel = elements.stopsCarousel;
    const track = elements.stopsTrack;
    if (!carousel || !track || state.days.length === 0) return;

    // Find the element at the center of the carousel
    const carouselRect = carousel.getBoundingClientRect();
    const centerX = carouselRect.left + carouselRect.width / 2;

    const cards = Array.from(track.children);
    let currentDayNum = 1;
    let detectedDayIndex = 0;

    for (const card of cards) {
        const rect = card.getBoundingClientRect();

        // If it's a divider, it updates our tracking of currentDayNum
        if (card.classList.contains('app-day-divider')) {
            const text = card.querySelector('.day-divider-text')?.textContent || '';
            const match = text.match(/Day\s+(\d+)/);
            if (match) currentDayNum = parseInt(match[1]);
        }

        // If this card is currently in the center
        if (rect.left <= centerX && rect.right >= centerX) {
            detectedDayIndex = currentDayNum - 1;
            break;
        }
    }

    if (state.currentDayIndex !== detectedDayIndex && detectedDayIndex < state.days.length) {
        state.currentDayIndex = detectedDayIndex;
        updateDayNavigation();
    }
}



// ===== Media Upload per Stop =====
function handleStopMediaUpload(stopId, files) {
    const stop = findStopById(stopId);
    if (!stop) return;

    let imageCount = 0;
    let videoCount = 0;

    for (const file of files) {
        const validation = validateFile(file);
        if (!validation.valid) {
            showToast(validation.error, 'error');
            continue;
        }

        const mediaItem = {
            id: generateId(),
            file: file,
            url: URL.createObjectURL(file), // Create blob URL immediately for preview
            thumbnail: null,
            status: 'pending'
        };

        stop.media.push(mediaItem);
        generateThumbnail(mediaItem, file);
        state.uploadQueue.push({ stopId, mediaId: mediaItem.id });

        // Count media types
        if (file.type.startsWith('image/')) imageCount++;
        else if (file.type.startsWith('video/')) videoCount++;
    }

    renderDays();
    renderMobilePreview();
    updateStats();
    processUploadQueue();

    // Track analytics
    const mediaType = videoCount > 0 ? (imageCount > 0 ? 'mixed' : 'video') : 'image';
    trackEvent('upload_stop_media', mediaType, `${files.length} files`);
}

function removeMediaFromStop(stopId, mediaId) {
    const stop = findStopById(stopId);
    if (!stop) return;

    const mediaIndex = stop.media.findIndex(m => m.id === mediaId);
    if (mediaIndex !== -1) {
        // Revoke object URLs for the removed media
        const removedMedia = stop.media[mediaIndex];
        if (removedMedia.url && removedMedia.url.startsWith('blob:')) URL.revokeObjectURL(removedMedia.url);
        if (removedMedia.thumbnail && removedMedia.thumbnail.startsWith('blob:')) URL.revokeObjectURL(removedMedia.thumbnail);

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

async function generateThumbnail(mediaItem, file) {
    try {
        const thumbnail = await createThumbnailDataUrl(file);
        if (thumbnail) {
            mediaItem.thumbnail = thumbnail;
            renderDays();
            renderMobilePreview();
        }
    } catch (err) {
        console.error('Thumbnail generation failed', err);
    }
}

function createThumbnailDataUrl(file) {
    return new Promise((resolve) => {
        const isVideo = file.type.startsWith('video/');

        if (isVideo) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = URL.createObjectURL(file);
            video.muted = true;
            video.playsInline = true;

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
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                URL.revokeObjectURL(video.src);
                resolve(dataUrl);
            };
            video.onerror = () => resolve(null);
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
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = () => resolve(null);
                img.src = e.target.result;
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        }
    });
}

// ===== Upload Queue Processing =====
function processUploadQueue() {
    if (state.activeUploads < CONFIG.maxConcurrentUploads && state.uploadQueue.length > 0) {
        const item = state.uploadQueue.shift();
        // Add a tiny delay to prevent race conditions with thumbnail generation and DOM updates
        setTimeout(() => {
            uploadMedia(item.stopId, item.mediaId);
        }, 100);
    }
}

async function uploadMedia(stopId, mediaId, retryCount = 0) {
    let mediaItem;
    if (stopId === 'cover') {
        mediaItem = state.trip.coverImages.find(m => m.id === mediaId);
    } else {
        const stop = findStopById(stopId);
        if (stop) {
            mediaItem = stop.media.find(m => m.id === mediaId);
        }
    }

    if (!mediaItem || mediaItem.status === 'uploaded') {
        processUploadQueue(); // Move to next item if already done
        return;
    }

    if (retryCount === 0) {
        state.activeUploads++;
    }

    mediaItem.status = 'uploading';
    renderDays();
    if (stopId === 'cover') renderCoverPreviews();

    try {
        console.log(`Uploading ${stopId === 'cover' ? 'Cover' : 'Stop'} Media: ${mediaItem.file.name} (Attempt ${retryCount + 1})...`);
        const formData = new FormData();
        // Some servers expect data fields before the file field
        formData.append('stopId', stopId);
        formData.append('mediaId', mediaId);
        formData.append('file', mediaItem.file);

        // Set a timeout for the fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout

        const response = await fetch(CONFIG.mediaUploadWebhook, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

        const responseText = await response.text();
        let remoteUrl = null;
        try {
            if (responseText.trim()) {
                const result = JSON.parse(responseText);
                // Handle array response: [{ fileUrl: "...", status: "success" }]
                if (Array.isArray(result) && result.length > 0) {
                    remoteUrl = result[0].fileUrl;
                } else {
                    remoteUrl = result.fileUrl || result.url;
                }
            }
        } catch (e) {
            console.warn('Webhook response was not valid JSON or array:', responseText);
        }

        // Store the remote URL. We keep the local blob URL in state.url if it exists 
        // to avoid flickering in the preview, but we'll use remoteUrl for final submission.
        mediaItem.remoteUrl = remoteUrl;

        // If we don't have a local URL (e.g. somehow lost), use the remote one
        if (!mediaItem.url) {
            mediaItem.url = remoteUrl || `uploaded_${mediaId}_${Date.now()}`;
        }

        mediaItem.status = 'uploaded';
        showToast(`${stopId === 'cover' ? 'Cover image' : 'File'} uploaded successfully`, 'success');

        // Success: Decrement and move to next
        state.activeUploads--;
        renderDays();
        if (stopId === 'cover') renderCoverPreviews();
        updateStats();
        updateStats();
        updateSubmitButton();
        if (window.auth && window.auth.saveCurrentTrip) window.auth.saveCurrentTrip(); // Instant save after upload
        processUploadQueue();

    } catch (error) {
        console.error(`Upload failed (Attempt ${retryCount + 1}):`, error);

        if (retryCount < 2) {
            console.log(`Retrying upload for ${mediaItem.file.name} in 1.5s...`);
            await new Promise(resolve => setTimeout(resolve, 1500));
            return uploadMedia(stopId, mediaId, retryCount + 1);
        }

        // Final failure after retries
        mediaItem.status = 'error';
        showToast(`Upload failed: ${mediaItem.file.name}`, 'error');

        state.activeUploads--;
        renderDays();
        if (stopId === 'cover') renderCoverPreviews();
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
        // No need to attach listeners here anymore, handled inline
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
                    <label class="stop-media-upload">
                        <svg viewBox="0 0 20 20" fill="none">
                            <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <span>Add Photos/Videos</span>
                        <input type="file" id="media-input-${stop.id}" multiple 
                            accept="image/jpeg,image/jpg,image/png,image/heic,video/mp4,video/quicktime,video/mov" 
                            onchange="handleStopMediaUpload('${stop.id}', this.files); this.value='';"
                            hidden>
                    </label>
                    <p class="stop-media-hint">Upload all photos and videos from this stop — the more, the better!</p>
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
    // Update cover slider
    const slider = elements.appCoverSlider;
    if (slider) {
        if (state.trip.coverImages.length > 0) {
            slider.innerHTML = state.trip.coverImages.map(img => `
                <div class="app-cover-item">
                    <div class="app-cover-image" style="background-image: url('${getSecureUrl(img.url)}')"></div>
                </div>
            `).join('');

            // Apply current scroll position
            const offset = state.currentCoverIndex * 100;
            slider.style.transform = `translateX(-${offset}%)`;
        } else {
            slider.innerHTML = `
                <div class="app-cover-item active">
                    <div class="app-cover-image">
                        <div class="cover-placeholder-app">
                            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <path d="M21 15l-5-5L5 21"/>
                            </svg>
                            <span>Add cover image</span>
                        </div>
                    </div>
                </div>
            `;
            slider.style.transform = 'translateX(0)';
        }
    }

    // Update location badge
    if (elements.appLocationBadge) {
        const span = elements.appLocationBadge.querySelector('span');
        if (span) span.textContent = state.trip.location || 'Iceland';
    }

    // Update images counter and nav arrows
    if (elements.appImageCounter) {
        const total = Math.max(1, state.trip.coverImages.length);
        const current = state.trip.coverImages.length > 0 ? state.currentCoverIndex + 1 : 1;
        elements.appImageCounter.textContent = `${current}/${total}`;

        // Show/hide nav buttons based on image count
        if (elements.coverPrevBtn) elements.coverPrevBtn.hidden = total <= 1;
        if (elements.coverNextBtn) elements.coverNextBtn.hidden = total <= 1;
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

function scrollCoverMedia(direction) {
    if (state.trip.coverImages.length <= 1) return;

    state.currentCoverIndex += direction;

    // Loop around
    if (state.currentCoverIndex >= state.trip.coverImages.length) {
        state.currentCoverIndex = 0;
    } else if (state.currentCoverIndex < 0) {
        state.currentCoverIndex = state.trip.coverImages.length - 1;
    }

    updateMobilePreview();
}

// ===== Blank Screen Management =====
function openBlankScreen() {
    if (elements.blankScreen) {
        elements.blankScreen.hidden = false;
    }
}

function closeBlankScreen() {
    if (elements.blankScreen) {
        elements.blankScreen.hidden = true;
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
    if (elements.dayNavTitle) elements.dayNavTitle.textContent = currentDay.title || 'Day Plan';

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
                    <div class="day-divider-circle">
                        <div class="day-divider-text">Day ${item.dayNumber}</div>
                    </div>
                </div>
            `;
        }

        const stop = item.stop;
        const coverImage = stop.media.length > 0 && stop.media[0].thumbnail
            ? stop.media[0].thumbnail
            : null;

        return `
            <div class="app-stop-card ${item.isTapped ? 'tapped' : ''}" onclick="openStopsDetailScreen(${item.stopNumber - 1})">
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
    let totalMedia = state.trip.coverImages.length;
    let hasStopMedia = false;

    state.days.forEach(day => {
        totalStops += day.stops.length;
        day.stops.forEach(stop => {
            totalMedia += stop.media.length;
            if (stop.media.length > 0) hasStopMedia = true;
        });
    });

    if (elements.totalDays) elements.totalDays.textContent = totalDays;
    if (elements.totalStops) elements.totalStops.textContent = totalStops;
    if (elements.totalMedia) elements.totalMedia.textContent = totalMedia;

    // Also update inline stats (left panel)
    if (elements.totalDaysInline) elements.totalDaysInline.textContent = totalDays;
    if (elements.totalStopsInline) elements.totalStopsInline.textContent = totalStops;
    if (elements.totalMediaInline) elements.totalMediaInline.textContent = totalMedia;

    // Show hints only on main trip page (not in stops detail or media feed)
    const isOnMainPage = elements.stopsDetailScreen?.hidden !== false &&
        elements.mediaFeed?.hidden !== false;

    // Show instruction hints after first stop media is added AND only on main page
    if (hasStopMedia && isOnMainPage) {
        if (elements.stopCardsHint) elements.stopCardsHint.classList.remove('hidden');
        if (elements.mainFeedHint) elements.mainFeedHint.classList.remove('hidden');
    } else {
        // Hide hints if not on main page or no media
        if (elements.stopCardsHint) elements.stopCardsHint.classList.add('hidden');
        if (elements.mainFeedHint) elements.mainFeedHint.classList.add('hidden');
    }

    // Always hide trip review hint when on main trip page
    if (elements.tripReviewHint) elements.tripReviewHint.classList.add('hidden');
}

function updateSubmitButton() {
    // Reset submitted flag on any change
    state.isSubmitted = false;

    // We no longer disable the button so users can click and see validation errors
    // const isValid = validateForm(false);
    // if (elements.submitBtn) elements.submitBtn.disabled = !isValid;
    if (elements.submitBtn) elements.submitBtn.disabled = false;
}

function validateForm(verbose = false) {
    // Check if user is authenticated
    if (!authState.user) {
        if (verbose) showToast('Please sign in first', 'error');
        return false;
    }

    if (state.trip.coverImages.length === 0) {
        if (verbose) showToast('Please add at least one cover image', 'error');
        return false;
    }
    if (!state.trip.title.trim()) {
        if (verbose) showToast('Please enter a trip title', 'error');
        return false;
    }
    if (!state.trip.description.trim()) {
        if (verbose) showToast('Please enter a trip description', 'error');
        return false;
    }
    if (state.days.length === 0) {
        if (verbose) showToast('Please add at least one day', 'error');
        return false;
    }

    for (const day of state.days) {
        if (!day.title.trim()) {
            if (verbose) showToast(`Please enter a title for Day ${day.number}`, 'error');
            return false;
        }
        for (const stop of day.stops) {
            if (!stop.title.trim()) {
                if (verbose) showToast(`Please enter a title for stop in Day ${day.number}`, 'error');
                return false;
            }
            if (!stop.description.trim()) {
                if (verbose) showToast(`Please enter a description for "${stop.title || 'stop'}" in Day ${day.number}`, 'error');
                return false;
            }
        }
    }

    if (state.activeUploads > 0) {
        if (verbose) showToast('Please wait for media uploads to finish', 'warning');
        return false;
    }

    // Require all 4 consent checkboxes
    if (!elements.consentOwnership?.checked) {
        if (verbose) showToast('Please confirm content ownership', 'error');
        return false;
    }
    if (!elements.consentLicense?.checked) {
        if (verbose) showToast('Please agree to the license terms', 'error');
        return false;
    }
    if (!elements.consentAge?.checked) {
        if (verbose) showToast('Please confirm your age', 'error');
        return false;
    }
    if (!elements.consentPeople?.checked) {
        if (verbose) showToast('Please confirm consent for people in photos', 'error');
        return false;
    }

    return true;
}

// ===== Submit =====
async function handleSubmit() {
    if (!validateForm(true)) {
        return;
    }

    const submitBtn = elements.submitBtn;
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    submitBtn.disabled = true;
    if (btnText) btnText.hidden = true;
    if (btnLoader) btnLoader.hidden = false;

    // Track submission attempt
    trackEvent('form_submit_started', '', `${state.days.length} days, ${countTotalMedia()} media`);

    try {
        const payload = buildSubmissionPayload();

        // Log consent to Supabase (non-blocking)
        // Log consent to Supabase (non-blocking)
        if (typeof logConsent === 'function') {
            logConsent({
                ownership: elements.consentOwnership?.checked,
                license: elements.consentLicense?.checked,
                age: elements.consentAge?.checked,
                people: elements.consentPeople?.checked,
                notifyLaunch: elements.notifyLaunch?.checked
            }).catch(err => console.warn('[Submit] Consent log failed:', err));
        }

        const response = await fetch(CONFIG.finalSubmissionWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Submission failed');

        // Clear saved progress after successful submission
        if (typeof clearFormProgress === 'function') {
            clearFormProgress().catch(err => console.warn('[Submit] Clear progress failed:', err));
        }

        // Mark as submitted to bypass unload warning
        state.isSubmitted = true;

        if (elements.successModal) elements.successModal.hidden = false;

        // Track successful submission
        trackEvent('form_submit_success', state.trip.title, `${state.days.length} days`);
    } catch (error) {
        console.error('Submit error:', error);
        showToast('Submission failed. Please try again.', 'error');
        submitBtn.disabled = false;

        // Track failed submission
        trackEvent('form_submit_error', error.message);
    } finally {
        if (btnText) btnText.hidden = false;
        if (btnLoader) btnLoader.hidden = true;
    }
}

// Helper to count total media for analytics
function countTotalMedia() {
    let count = state.trip.coverImages.length;
    for (const day of state.days) {
        for (const stop of day.stops) {
            count += stop.media.length;
        }
    }
    return count;
}

function buildSubmissionPayload() {
    return {
        user: {
            name: authState.user.user_metadata?.full_name || 'Anonymous',
            email: authState.user.email,
            id: authState.user.id
        },
        trip: {
            title: state.trip.title,
            description: state.trip.description,
            location: state.trip.location,
            coverImages: state.trip.coverImages.map(img => img.remoteUrl || img.url) // Send remote URLs
        },
        submittedAt: new Date().toISOString(),
        days: state.days.map(day => ({
            id: day.id, // Include ID for reference if needed by backend
            number: day.number,
            title: day.title,
            stops: day.stops.map(stop => ({
                id: stop.id, // Include ID for reference if needed by backend
                type: stop.type,
                title: stop.title,
                description: stop.description,
                media: stop.media.filter(m => m.status === 'uploaded').map(m => ({
                    id: m.id, // Include ID for reference if needed by backend
                    url: m.remoteUrl || m.url,
                    fileName: m.file.name,
                    fileType: m.file.type,
                    fileSize: m.file.size
                }))
            }))
        })),
        preferences: {
            notifyOnLaunch: elements.notifyLaunch?.checked ?? false,
            interestedInTravelArchitect: elements.travelArchitect?.checked ?? false
        },
        consent: {
            ownershipConfirmed: elements.consentOwnership?.checked ?? false,
            licenseAgreed: elements.consentLicense?.checked ?? false,
            ageConfirmed: elements.consentAge?.checked ?? false,
            peopleConsentGiven: elements.consentPeople?.checked ?? false,
            consentTimestamp: new Date().toISOString()
        }
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
function getSecureUrl(url) {
    if (!url) return '';
    if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('https://')) return url;
    // Proxy insecure HTTP images
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=800&output=webp`;
}

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

// ===== Stops Detail Screen =====
function getAllStops() {
    const allStops = [];
    state.days.forEach(day => {
        day.stops.forEach(stop => {
            allStops.push(stop);
        });
    });
    return allStops;
}

function openStopsDetailScreen(stopIndex) {
    const allStops = getAllStops();
    if (allStops.length === 0) return;

    state.selectedStopIndex = stopIndex;

    if (elements.stopsDetailScreen) {
        elements.stopsDetailScreen.hidden = false;
        elements.stopsDetailScreen.classList.remove('closing');
    }

    // Hide both instruction hints when entering stops detail screen
    if (elements.stopCardsHint) {
        elements.stopCardsHint.classList.add('hidden');
    }
    if (elements.mainFeedHint) {
        elements.mainFeedHint.classList.add('hidden');
    }

    renderStopsTabs();
    renderStopsMedia();
}

function closeStopsDetailScreen() {
    if (elements.stopsDetailScreen) {
        elements.stopsDetailScreen.classList.add('closing');
        setTimeout(() => {
            elements.stopsDetailScreen.hidden = true;
            elements.stopsDetailScreen.classList.remove('closing');

            // Re-check if hint should be shown based on media
            updateStats();
        }, 250);
    }
}

function selectStopTab(stopIndex) {
    state.selectedStopIndex = stopIndex;
    renderStopsTabs();
    renderStopsMedia();

    // Scroll the active tab into view
    const activeTab = elements.stopsTabs?.querySelector('.stop-tab.active');
    if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
}

function renderStopsTabs() {
    if (!elements.stopsTabs) return;

    const allStops = getAllStops();

    if (allStops.length === 0) {
        elements.stopsTabs.innerHTML = '';
        return;
    }

    elements.stopsTabs.innerHTML = allStops.map((stop, index) => `
        <button class="stop-tab ${index === state.selectedStopIndex ? 'active' : ''}" 
                onclick="selectStopTab(${index})">
            Stop ${index + 1}
        </button>
    `).join('');
}

function renderStopsMedia() {
    if (!elements.stopsMediaGallery) return;

    const allStops = getAllStops();

    if (allStops.length === 0) {
        elements.stopsMediaGallery.innerHTML = `
            <div class="stops-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                </svg>
                <p>No stops available</p>
            </div>
        `;
        return;
    }

    const currentStop = allStops[state.selectedStopIndex];

    if (!currentStop || currentStop.media.length === 0) {
        elements.stopsMediaGallery.innerHTML = `
            <div class="stops-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                </svg>
                <p>No media for this stop</p>
            </div>
        `;
        return;
    }

    elements.stopsMediaGallery.innerHTML = `
        <div class="stops-media-grid">
            ${currentStop.media.map(media => {
        const isVideo = media.file?.type?.startsWith('video/');
        return `
                    <div class="stops-media-item ${isVideo ? 'video' : ''}">
                        <img src="${media.thumbnail || ''}" alt="Media">
                    </div>
                `;
    }).join('')}
        </div>
    `;
}
// ===== Media Feed Functions =====

// Generate random like count (Instagram-style range)
function generateRandomLikes() {
    const ranges = [
        { min: 50, max: 999, weight: 30 },           // 50-999
        { min: 1000, max: 9999, weight: 35 },        // 1K-9.9K
        { min: 10000, max: 99999, weight: 20 },      // 10K-99K
        { min: 100000, max: 999999, weight: 10 },    // 100K-999K
        { min: 1000000, max: 2500000, weight: 5 }    // 1M-2.5M
    ];

    // Weighted random selection
    const totalWeight = ranges.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;

    for (const range of ranges) {
        random -= range.weight;
        if (random <= 0) {
            return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
        }
    }
    return ranges[0].min;
}

// Format number with K/M suffix (Instagram-style)
function formatLikeCount(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
}

function collectFeaturedMedia() {
    const featured = [];

    // Collect all media from all stops
    state.days.forEach(day => {
        day.stops.forEach(stop => {
            stop.media.forEach((m, idx) => {
                // Ensure we have a valid URL (local or remote)
                if (m.url) {
                    featured.push({
                        ...m,
                        url: m.url,
                        stopTitle: stop.title,
                        stopDescription: stop.description || stop.title,
                        stopType: stop.type,
                        likes: m.likes || generateRandomLikes(),
                        liked: m.liked || false
                    });
                }
            });
        });
    });

    return featured;
}

function openMediaFeed() {
    const items = collectFeaturedMedia();

    console.log('Opening media feed with', items.length, 'items');
    console.log('Items:', items);

    // Always open the feed, show empty state if no items
    state.feed.items = items;
    state.feed.currentIndex = 0;
    state.feed.isOpen = true;

    if (elements.mediaFeed) {
        elements.mediaFeed.hidden = false;
    }

    // Hide both instruction hints when entering media feed
    if (elements.stopCardsHint) {
        elements.stopCardsHint.classList.add('hidden');
    }
    if (elements.mainFeedHint) {
        elements.mainFeedHint.classList.add('hidden');
    }
    if (elements.tripReviewHint) {
        elements.tripReviewHint.classList.remove('hidden');
    }

    // Set trip thumbnail
    if (elements.feedTripThumb && state.trip.coverImages.length > 0) {
        elements.feedTripThumb.style.backgroundImage = `url('${state.trip.coverImages[0].url}')`;
    }

    // Set username
    if (elements.feedUsername) {
        elements.feedUsername.textContent = elements.userName?.value || 'User';
    }

    if (items.length === 0) {
        // Show empty state message in the feed
        if (elements.feedCurrent) {
            elements.feedCurrent.innerHTML = `
                <div style="color: white; text-align: center; padding: 40px;">
                    <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 16px; opacity: 0.5;">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                    </svg>
                    <p style="font-size: 16px; margin: 0 0 8px 0;">No featured media yet</p>
                    <p style="font-size: 13px; opacity: 0.7; margin: 0;">Upload images or videos to your stops,<br>then they'll appear here!</p>
                </div>
            `;
        }
        if (elements.feedPrev) elements.feedPrev.innerHTML = '';
        if (elements.feedNext) elements.feedNext.innerHTML = '';
        return;
    }

    renderFeedItems();
    renderFeedProgress();
    setupFeedSwipe();
}

function closeMediaFeed() {
    state.feed.isOpen = false;

    if (elements.mediaFeed) {
        elements.mediaFeed.hidden = true;
    }

    // Hide trip review hint when leaving media feed
    if (elements.tripReviewHint) {
        elements.tripReviewHint.classList.add('hidden');
    }

    // Cleanup: pause all videos
    cleanupOffscreenMedia();

    // Re-check if hints should be shown (returning to main page)
    updateStats();
}

function renderFeedItems() {
    const items = state.feed.items;
    const idx = state.feed.currentIndex;

    const prevItem = items[idx - 1] || null;
    const currentItem = items[idx] || null;
    const nextItem = items[idx + 1] || null;

    // Render prev
    renderFeedItem(elements.feedPrev, prevItem);
    // Render current
    renderFeedItem(elements.feedCurrent, currentItem);
    // Render next
    renderFeedItem(elements.feedNext, nextItem);

    // Update caption
    if (elements.feedCaption && currentItem) {
        elements.feedCaption.textContent = currentItem.stopDescription || currentItem.stopTitle || 'Featured media';
    }

    // Update like count and state
    updateFeedLikeButton();

    // Cleanup off-screen videos
    cleanupOffscreenMedia();
}

function updateFeedLikeButton() {
    const currentItem = state.feed.items[state.feed.currentIndex];
    if (!currentItem) return;

    const heartBtn = document.getElementById('feedHeart');
    if (heartBtn) {
        const countSpan = heartBtn.querySelector('.feed-action-count');
        if (countSpan) {
            countSpan.textContent = formatLikeCount(currentItem.likes);
        }

        // Update liked state
        if (currentItem.liked) {
            heartBtn.classList.add('liked');
        } else {
            heartBtn.classList.remove('liked');
        }
    }
}

function toggleFeedLike() {
    const currentItem = state.feed.items[state.feed.currentIndex];
    if (!currentItem) return;

    const heartBtn = document.getElementById('feedHeart');
    if (!heartBtn) return;

    // Toggle liked state
    currentItem.liked = !currentItem.liked;

    if (currentItem.liked) {
        currentItem.likes += 1;
        heartBtn.classList.add('liked', 'animate');

        // Remove animation class after animation completes
        setTimeout(() => {
            heartBtn.classList.remove('animate');
        }, 600);
    } else {
        currentItem.likes -= 1;
        heartBtn.classList.remove('liked');
    }

    // Update count display
    const countSpan = heartBtn.querySelector('.feed-action-count');
    if (countSpan) {
        countSpan.textContent = formatLikeCount(currentItem.likes);
    }
}

// Helper for High-Res Thumbnails (Vide Fallback)
function getHighResThumbnail(url) {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (url.startsWith('blob:')) return url;
    // Use 1200w for high clarity
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1200&output=webp&q=80`;
}

// Global handler for video errors (Mixed Content, etc.)
window.handleFeedVideoError = function (videoEl) {
    if (!videoEl) return;
    videoEl.style.display = 'none';

    // Hide the play button if it exists sibling
    const btn = videoEl.nextElementSibling;
    if (btn && btn.classList.contains('video-control-btn')) {
        btn.style.display = 'none';
    }

    const parent = videoEl.parentElement;
    if (!parent) return;

    // Try to show fallback image
    const fallbackSrc = videoEl.getAttribute('data-fallback-src');
    if (fallbackSrc) {
        // Hide play button completely
        const btn = parent.querySelector('.video-control-btn');
        if (btn) btn.style.display = 'none';

        // Insert Image
        if (!parent.querySelector('.video-fallback-img')) {
            const img = document.createElement('img');
            img.className = 'video-fallback-img';
            img.src = fallbackSrc;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.position = 'absolute';
            img.style.inset = '0';
            parent.insertBefore(img, parent.firstChild);

            // Add subtle error badge
            parent.insertAdjacentHTML('beforeend', `
                <div style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6); color:white; font-size:10px; padding:4px 8px; border-radius:12px; backdrop-filter:blur(4px);">
                    Video Unavailable
                </div>
            `);
        }
        return;
    }

    // Default error message (text)
    if (parent.querySelector('.video-error-msg')) return;
    parent.insertAdjacentHTML('beforeend', `
        <div class="video-error-msg" style="color: #ef4444; font-size: 12px; text-align: center; padding: 20px; background: rgba(0,0,0,0.8); height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; position: absolute; inset: 0;">
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" fill="none" class="mb-2" style="margin-bottom:8px">
                <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <span>Video Blocked</span>
            <span style="font-size: 10px; opacity: 0.8; margin-top: 4px;">Server needs HTTPS</span>
        </div>
    `);
};

function renderFeedItem(container, item) {
    if (!container) {
        console.warn('Feed container is null');
        return;
    }

    if (!item) {
        container.innerHTML = '';
        return;
    }

    console.log('Rendering feed item:', { url: item.url, file: item.file?.name });

    // Ensure we have a valid URL
    let mediaUrl = item.url;
    if (!mediaUrl && item.file) {
        mediaUrl = URL.createObjectURL(item.file);
    }

    if (!mediaUrl) {
        console.warn('No valid URL for media item:', item);
        container.innerHTML = '<div style="color:white;text-align:center;padding:20px;">No media URL available</div>';
        return;
    }

    const isVideo = item.file?.type?.startsWith('video/');

    if (isVideo) {
        container.innerHTML = `
            <video src="${mediaUrl}" 
                data-fallback-src="${getHighResThumbnail(item.thumbnail)}" 
                autoplay muted playsinline loop preload="auto" class="feed-video" 
                onerror="window.handleFeedVideoError(this)"></video>
            <button class="video-control-btn playing" onclick="toggleFeedVideo(this)">
                <svg class="play-icon" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
                <svg class="pause-icon" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            </button>
        `;
    } else {
        container.innerHTML = `<img src="${getSecureUrl(mediaUrl)}" alt="Media" onerror="console.error('Image failed to load:', '${mediaUrl}')">`;
    }
}

function renderFeedProgress() {
    if (!elements.feedProgress) return;

    const total = state.feed.items.length;
    const current = state.feed.currentIndex;

    // Limit dots to max 10 for visual clarity
    const maxDots = Math.min(total, 10);

    elements.feedProgress.innerHTML = Array.from({ length: maxDots }, (_, i) =>
        `<div class="feed-progress-dot ${i === current ? 'active' : ''}"></div>`
    ).join('');
}

function navigateFeed(direction) {
    const total = state.feed.items.length;
    if (total === 0) return;

    let newIndex = state.feed.currentIndex + direction;

    // Loop around at boundaries
    if (newIndex < 0) {
        newIndex = total - 1; // Loop to last
    } else if (newIndex >= total) {
        newIndex = 0; // Loop to first
    }

    state.feed.currentIndex = newIndex;
    renderFeedItems();
    renderFeedProgress();
}

function cleanupOffscreenMedia() {
    // Pause videos that are not current
    [elements.feedPrev, elements.feedNext].forEach(container => {
        if (container) {
            const video = container.querySelector('video');
            if (video) {
                video.pause();
                video.currentTime = 0;
            }
        }
    });

    // Auto-play current video
    if (elements.feedCurrent) {
        const video = elements.feedCurrent.querySelector('video');
        const btn = elements.feedCurrent.querySelector('.video-control-btn');
        if (video) {
            video.play().then(() => {
                if (btn) btn.classList.remove('paused');
            }).catch(() => { }); // Ignore autoplay errors
        }
    }
}

function toggleFeedVideo(btn) {
    const video = btn.parentElement.querySelector('video');
    if (!video) return;

    if (video.paused) {
        video.play();
        btn.classList.remove('paused');
    } else {
        video.pause();
        btn.classList.add('paused');
    }
}

function setupFeedSwipe() {
    const viewport = elements.feedViewport;
    if (!viewport) return;

    // Prevent adding multiple listeners
    if (viewport.dataset.swipeSetup === 'true') return;
    viewport.dataset.swipeSetup = 'true';

    let startY = 0;
    let startTime = 0;
    let isSwiping = false;

    const handleStart = (y) => {
        startY = y;
        startTime = Date.now();
        isSwiping = true;
    };

    const handleEnd = (y) => {
        if (!isSwiping) return;
        isSwiping = false;

        const diffY = startY - y;
        const timeDiff = Date.now() - startTime;
        const velocity = Math.abs(diffY) / timeDiff;

        // Swipe threshold: 50px or high velocity
        if (Math.abs(diffY) > 50 || velocity > 0.5) {
            if (diffY > 0) {
                navigateFeed(1); // Swipe up = next
            } else {
                navigateFeed(-1); // Swipe down = prev
            }
        }
    };

    // Touch events
    viewport.addEventListener('touchstart', (e) => {
        handleStart(e.touches[0].clientY);
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
        handleEnd(e.changedTouches[0].clientY);
    }, { passive: true });

    // Mouse events for testing
    viewport.addEventListener('mousedown', (e) => {
        handleStart(e.clientY);
    });

    viewport.addEventListener('mouseup', (e) => {
        handleEnd(e.clientY);
    });

    // Scroll wheel for desktop navigation
    let wheelDebounce = false;
    viewport.addEventListener('wheel', (e) => {
        if (wheelDebounce) return;
        wheelDebounce = true;

        if (e.deltaY > 0) {
            navigateFeed(1); // Scroll down = next
        } else if (e.deltaY < 0) {
            navigateFeed(-1); // Scroll up = prev
        }

        setTimeout(() => {
            wheelDebounce = false;
        }, 400); // Debounce to prevent rapid scrolling
    }, { passive: true });
}

// Update openBlankScreen to open media feed instead
function openBlankScreen() {
    openMediaFeed();
}

function closeBlankScreen() {
    closeMediaFeed();
}

// ===== Expose functions globally =====
window.removeDay = removeDay;
window.addStop = addStop;
window.removeStop = removeStop;
window.updateDayTitle = updateDayTitle;
window.updateStopTitle = updateStopTitle;
window.updateStopDescription = updateStopDescription;
window.removeMediaFromStop = removeMediaFromStop;
window.openStopsDetailScreen = openStopsDetailScreen;
window.closeStopsDetailScreen = closeStopsDetailScreen;
window.selectStopTab = selectStopTab;
window.removeCoverImage = removeCoverImage;
window.openMediaFeed = openMediaFeed;
window.closeMediaFeed = closeMediaFeed;
window.openBlankScreen = openBlankScreen;
window.closeBlankScreen = closeBlankScreen;
window.scrollCoverMedia = scrollCoverMedia;
window.toggleFeedVideo = toggleFeedVideo;
window.toggleFeedLike = toggleFeedLike;

// ===== Preview Modal (Tablet/Mobile) =====
function openPreviewModal() {
    const modal = document.getElementById('previewModal');
    const modalContent = document.getElementById('previewModalContent');
    const originalFrame = document.querySelector('.phone-frame');

    if (!modal || !modalContent || !originalFrame) return;

    // Create a placeholder if it doesn't exist to keep the frame's place
    let placeholder = document.getElementById('phoneFramePlaceholder');
    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.id = 'phoneFramePlaceholder';
        placeholder.style.display = 'none';
        originalFrame.parentNode.insertBefore(placeholder, originalFrame);
    }

    // Move the actual phone frame into the modal (preserves event listeners like swipe)
    modalContent.appendChild(originalFrame);

    // Show modal
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closePreviewModal() {
    const modal = document.getElementById('previewModal');
    const placeholder = document.getElementById('phoneFramePlaceholder');
    const phoneFrame = document.querySelector('.preview-modal-content .phone-frame');

    if (!modal || !placeholder || !phoneFrame) return;

    // Move frame back to its original location
    placeholder.parentNode.insertBefore(phoneFrame, placeholder);

    modal.hidden = true;
    document.body.style.overflow = '';
}

window.openPreviewModal = openPreviewModal;
window.closePreviewModal = closePreviewModal;

// ===== Why Modal (Removed) =====
// Why modal and why.html have been removed.

// Close modals on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const previewModal = document.getElementById('previewModal');
        if (previewModal && !previewModal.hidden) closePreviewModal();
    }
});

// ===== Initialize on DOM load =====
document.addEventListener('DOMContentLoaded', init);

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

        const userName = (window.auth && window.auth.user && (window.auth.user.user_metadata?.full_name || window.auth.user.email?.split('@')[0])) || 'Traveler';
        if (elements.appAuthorName) elements.appAuthorName.textContent = userName;
        if (elements.feedUsername) elements.feedUsername.textContent = userName;

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
                        url: getSecureUrl(img.url),
                        remoteUrl: getSecureUrl(img.url),
                        thumbnail: getSecureUrl(img.url),
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
                        .map(m => {
                            // Detect if video
                            const isVideo = (m.fileType && m.fileType.startsWith('video')) || (m.fileName && m.fileName.match(/\.(mp4|mov|webm)$/i));
                            const secureUrl = isVideo ? m.url : getSecureUrl(m.url);

                            // Fallback thumbnail for videos if not saved
                            // Fallback thumbnail for videos if not saved
                            // Use a clean SVG data URI with a play icon
                            const placeholderThumb = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NDAiIGhlaWdodD0iMzYwIiB2aWV3Qm94PSIwIDAgNjQwIDM2MCI+PHJlY3Qgd2lkdGg9IjY0MCIgaGVpZ2h0PSIzNjAiIGZpbGw9IiMxMTE4MjciLz48Y2lyY2xlIGN4PSIzMjAiIGN5PSIxODAiIHI9IjQ4IiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC45Ii8+PHBvbHlnb24gcG9pbnRzPSIzMTAsMTU1IDM0NSwxODAgMzEwLDIwNSIgZmlsbD0iIzExMTgyNyIvPjwvc3ZnPg==';
                            const thumb = m.thumbnail || (isVideo ? placeholderThumb : getSecureUrl(m.url));

                            return {
                                id: m.id || generateId(),
                                url: secureUrl,
                                remoteUrl: secureUrl,
                                thumbnail: thumb,
                                status: 'uploaded',
                                fileName: m.fileName || 'media',
                                file: { name: m.fileName || 'media', type: m.fileType || (isVideo ? 'video/mp4' : '') }
                            };
                        })
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
                coverImages: state.trip.coverImages.map(img => {
                    const safeUrl = img.remoteUrl || (img.url && !img.url.startsWith('blob:') ? img.url : null);
                    return {
                        url: safeUrl,
                        remoteUrl: safeUrl,
                        id: img.id
                    };
                })
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
                    media: stop.media.map(m => {
                        const safeUrl = m.remoteUrl || (m.url && !m.url.startsWith('blob:') ? m.url : null);
                        return {
                            id: m.id,
                            url: safeUrl,
                            remoteUrl: safeUrl,
                            fileName: m.file?.name,
                            fileType: m.fileType,
                            thumbnail: m.thumbnail, // Save thumbnail (crucial for videos)
                            status: safeUrl ? 'uploaded' : 'pending'
                        };
                    })
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
