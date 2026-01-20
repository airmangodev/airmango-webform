/**
 * Airmango Trip Content Upload Form
 * Editor + Preview Layout - No Drag & Drop
 */

// ===== Configuration =====
const CONFIG = {
    uploadWebhook: 'https://n8n.restaurantreykjavik.com/webhook/media-upload',
    maxVideoSize: 1024 * 1024 * 1024, // 1GB
    maxImageSize: 50 * 1024 * 1024, // 50MB
    maxConcurrentUploads: 2,
    allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'],
    allowedVideoTypes: ['video/mp4', 'video/quicktime', 'video/mov']
};

// ===== State =====
const state = {
    days: [], // Array of day objects
    dayCounter: 0,
    activeUploads: 0,
    uploadQueue: []
};

// ===== DOM Elements =====
const elements = {
    daysContainer: document.getElementById('daysContainer'),
    previewContainer: document.getElementById('previewContainer'),
    previewContent: document.getElementById('previewContent'),
    previewEmpty: document.getElementById('previewEmpty'),
    addDayBtn: document.getElementById('addDayBtn'),
    submitBtn: document.getElementById('submitBtn'),
    userName: document.getElementById('userName'),
    userEmail: document.getElementById('userEmail'),
    legalConsent: document.getElementById('legalConsent'),
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
}

function setupEventListeners() {
    elements.addDayBtn.addEventListener('click', addDay);
    elements.submitBtn.addEventListener('click', handleSubmit);
    elements.userName.addEventListener('input', updateSubmitButton);
    elements.userEmail.addEventListener('input', updateSubmitButton);
    elements.legalConsent.addEventListener('change', updateSubmitButton);
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
    renderDays();
    renderPreview();
    updateStats();
    updateSubmitButton();
}

function removeDay(dayId) {
    const dayIndex = state.days.findIndex(d => d.id === dayId);
    if (dayIndex === -1) return;

    state.days.splice(dayIndex, 1);

    // Renumber remaining days
    state.days.forEach((day, index) => {
        day.number = index + 1;
    });
    state.dayCounter = state.days.length;

    renderDays();
    renderPreview();
    updateStats();
    updateSubmitButton();
}

function updateDayTitle(dayId, title) {
    const day = state.days.find(d => d.id === dayId);
    if (day) {
        day.title = title;
        renderPreview();
        updateSubmitButton();
    }
}

function addStop(dayId, type) {
    const day = state.days.find(d => d.id === dayId);
    if (!day) return;

    const stop = {
        id: generateId(),
        type: type, // 'activity', 'attraction', 'accommodation'
        title: '',
        description: '',
        media: [] // Array of { id, file, url, thumbnail, status }
    };

    day.stops.push(stop);
    renderDays();
    renderPreview();
    updateStats();
    updateSubmitButton();
}

function removeStop(stopId) {
    for (const day of state.days) {
        const stopIndex = day.stops.findIndex(s => s.id === stopId);
        if (stopIndex !== -1) {
            day.stops.splice(stopIndex, 1);
            renderDays();
            renderPreview();
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
        renderPreview();
        updateSubmitButton();
    }
}

function updateStopDescription(stopId, description) {
    const stop = findStopById(stopId);
    if (stop) {
        stop.description = description;
        renderPreview();
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
            status: 'pending' // pending, uploading, uploaded, error
        };

        stop.media.push(mediaItem);

        // Generate thumbnail
        generateThumbnail(mediaItem, file);

        // Queue for upload
        state.uploadQueue.push({ stopId, mediaId: mediaItem.id });
    }

    renderDays();
    renderPreview();
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
        renderPreview();
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
        video.onloadeddata = () => {
            video.currentTime = 1;
        };
        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 120;
            canvas.height = 120;
            const ctx = canvas.getContext('2d');
            const scale = Math.max(120 / video.videoWidth, 120 / video.videoHeight);
            const x = (120 - video.videoWidth * scale) / 2;
            const y = (120 - video.videoHeight * scale) / 2;
            ctx.drawImage(video, x, y, video.videoWidth * scale, video.videoHeight * scale);
            mediaItem.thumbnail = canvas.toDataURL('image/jpeg', 0.7);
            URL.revokeObjectURL(video.src);
            renderDays();
            renderPreview();
        };
    } else {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 120;
                canvas.height = 120;
                const ctx = canvas.getContext('2d');
                const scale = Math.max(120 / img.width, 120 / img.height);
                const x = (120 - img.width * scale) / 2;
                const y = (120 - img.height * scale) / 2;
                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                mediaItem.thumbnail = canvas.toDataURL('image/jpeg', 0.7);
                renderDays();
                renderPreview();
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

    // Setup file inputs for each stop
    state.days.forEach(day => {
        day.stops.forEach(stop => {
            const fileInput = document.getElementById(`media-input-${stop.id}`);
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    handleStopMediaUpload(stop.id, e.target.files);
                    e.target.value = ''; // Reset input
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
                        placeholder="Enter day title (e.g., Arrival in Reykjavik)" 
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
                    <button type="button" class="btn btn-outline btn-sm" onclick="addStop('${day.id}', 'activity')">
                        + Activity
                    </button>
                    <button type="button" class="btn btn-outline btn-sm" onclick="addStop('${day.id}', 'attraction')">
                        + Attraction
                    </button>
                    <button type="button" class="btn btn-outline btn-sm" onclick="addStop('${day.id}', 'accommodation')">
                        + Accommodation
                    </button>
                </div>
            </div>
        </div>
    `;
}

function createStopHtml(stop) {
    const typeLabels = {
        activity: 'Activity',
        attraction: 'Attraction',
        accommodation: 'Accommodation'
    };

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
                    <input type="text" 
                        placeholder="Enter ${typeLabels[stop.type].toLowerCase()} name"
                        value="${escapeHtml(stop.title)}"
                        onchange="updateStopTitle('${stop.id}', this.value)"
                        required>
                </div>
                <div class="stop-form-group">
                    <label>Description <span class="required">*</span></label>
                    <textarea 
                        placeholder="Describe this ${typeLabels[stop.type].toLowerCase()}..."
                        onchange="updateStopDescription('${stop.id}', this.value)"
                        required>${escapeHtml(stop.description)}</textarea>
                </div>
                <div class="stop-media-section">
                    <label class="stop-media-upload" onclick="document.getElementById('media-input-${stop.id}').click()">
                        <svg viewBox="0 0 20 20" fill="none">
                            <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <span>Add Photos/Videos</span>
                        <input type="file" id="media-input-${stop.id}" multiple 
                            accept="image/jpeg,image/jpg,image/png,image/heic,video/mp4,video/quicktime,video/mov" 
                            hidden>
                    </label>
                    ${stop.media.length > 0 ? `
                        <div class="stop-media-grid">
                            ${stop.media.map(m => `
                                <div class="stop-media-item ${m.status}">
                                    ${m.thumbnail ? `<img src="${m.thumbnail}" alt="Media">` : '<div class="loading"></div>'}
                                    <button type="button" class="remove-media" onclick="removeMediaFromStop('${stop.id}', '${m.id}')">&times;</button>
                                    ${m.status === 'uploading' ? '<div class="upload-overlay">Uploading...</div>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// ===== Render Preview =====
function renderPreview() {
    if (!elements.previewContent || !elements.previewEmpty) return;

    if (state.days.length === 0) {
        elements.previewEmpty.style.display = 'flex';
        elements.previewContent.classList.remove('has-content');
        return;
    }

    elements.previewEmpty.style.display = 'none';
    elements.previewContent.classList.add('has-content');

    elements.previewContent.innerHTML = state.days.map(day => `
        <div class="preview-day">
            <div class="preview-day-header">
                <span class="preview-day-number">Day ${day.number}</span>
                <span class="preview-day-title ${day.title ? '' : 'empty'}">
                    ${day.title || 'No title entered'}
                </span>
            </div>
            <div class="preview-stops">
                ${day.stops.length > 0 ? day.stops.map(stop => `
                    <div class="preview-stop ${stop.type}">
                        <div class="preview-stop-type">${stop.type}</div>
                        <div class="preview-stop-title ${stop.title ? '' : 'empty'}">
                            ${stop.title || 'No title entered'}
                        </div>
                        <div class="preview-stop-description ${stop.description ? '' : 'empty'}">
                            ${stop.description || 'No description entered'}
                        </div>
                        ${stop.media.length > 0 ? `
                            <div class="preview-media-grid">
                                ${stop.media.map(m => `
                                    <div class="preview-media-item">
                                        ${m.thumbnail ? `<img src="${m.thumbnail}" alt="Media">` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `).join('') : '<p class="preview-no-stops">No stops added yet</p>'}
            </div>
        </div>
    `).join('');
}

// ===== Stats & Validation =====
function updateStats() {
    const totalDays = state.days.length;
    let totalStops = 0;
    let totalMedia = 0;

    state.days.forEach(day => {
        totalStops += day.stops.length;
        day.stops.forEach(stop => {
            totalMedia += stop.media.length;
        });
    });

    if (elements.totalDays) elements.totalDays.textContent = totalDays;
    if (elements.totalStops) elements.totalStops.textContent = totalStops;
    if (elements.totalMedia) elements.totalMedia.textContent = totalMedia;
}

function updateSubmitButton() {
    const isValid = validateForm();
    if (elements.submitBtn) {
        elements.submitBtn.disabled = !isValid;
    }
}

function validateForm() {
    // Check user info
    const userName = elements.userName?.value.trim();
    const userEmail = elements.userEmail?.value.trim();
    const legalConsent = elements.legalConsent?.checked;

    if (!userName || !userEmail || !legalConsent) return false;
    if (!isValidEmail(userEmail)) return false;

    // Must have at least one day
    if (state.days.length === 0) return false;

    // Check all days have titles
    for (const day of state.days) {
        if (!day.title.trim()) return false;

        // Check all stops have title and description
        for (const stop of day.stops) {
            if (!stop.title.trim() || !stop.description.trim()) return false;
        }
    }

    // Check no uploads in progress
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
    btnText.hidden = true;
    btnLoader.hidden = false;

    try {
        const payload = buildSubmissionPayload();

        const response = await fetch(CONFIG.uploadWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Submission failed');

        elements.successModal.hidden = false;
    } catch (error) {
        console.error('Submit error:', error);
        showToast('Submission failed. Please try again.', 'error');
        submitBtn.disabled = false;
    } finally {
        btnText.hidden = false;
        btnLoader.hidden = true;
    }
}

function buildSubmissionPayload() {
    return {
        user: {
            name: elements.userName.value.trim(),
            email: elements.userEmail.value.trim()
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

    elements.toastContainer.appendChild(toast);

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
