/**
 * Airmango Trip Media Upload Form
 * Handles file uploads, drag-and-drop organization, and submission
 */

// ===== Configuration =====
const CONFIG = {
    uploadWebhook: 'https://n8n.restaurantreykjavik.com/webhook/media-upload',
    submitWebhook: 'https://n8n.restaurantreykjavik.com/webhook/trip-submission',
    minioBaseUrl: 'http://37.60.237.177:9000/airmango-media/',
    maxVideoSize: 1024 * 1024 * 1024, // 1GB
    minImageSize: 200 * 1024, // 200KB
    minVideoSize: 1024 * 1024, // 1MB
    concurrentUploads: 3,
    maxRetries: 3,
    retryDelay: 2000
};

// ===== State =====
const state = {
    files: new Map(), // fileId -> { file, status, url, filename, thumbnail }
    days: [], // Array of day objects
    dayCounter: 0,
    activeUploads: 0,
    uploadQueue: [],
    draggedFileId: null
};

// ===== DOM Elements =====
const elements = {
    uploadZone: document.getElementById('uploadZone'),
    fileInput: document.getElementById('fileInput'),
    uploadProgress: document.getElementById('uploadProgress'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    uploadedFiles: document.getElementById('uploadedFiles'),
    filesList: document.getElementById('filesList'),
    filesCount: document.getElementById('filesCount'),
    daysContainer: document.getElementById('daysContainer'),
    addDayBtn: document.getElementById('addDayBtn'),
    submitBtn: document.getElementById('submitBtn'),
    legalConsent: document.getElementById('legalConsent'),
    userName: document.getElementById('userName'),
    userEmail: document.getElementById('userEmail'),
    totalFiles: document.getElementById('totalFiles'),
    assignedFiles: document.getElementById('assignedFiles'),
    toastContainer: document.getElementById('toastContainer'),
    successModal: document.getElementById('successModal')
};

// ===== Initialize =====
function init() {
    setupEventListeners();
    addDay(); // Start with one day
    updateStats();
}

function setupEventListeners() {
    // Upload zone events
    elements.uploadZone.addEventListener('click', () => elements.fileInput.click());
    elements.uploadZone.addEventListener('dragover', handleDragOver);
    elements.uploadZone.addEventListener('dragleave', handleDragLeave);
    elements.uploadZone.addEventListener('drop', handleDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);

    // Add day button
    elements.addDayBtn.addEventListener('click', addDay);

    // Submit button
    elements.submitBtn.addEventListener('click', handleSubmit);

    // Form validation
    elements.legalConsent.addEventListener('change', updateSubmitButton);
    elements.userName.addEventListener('input', updateSubmitButton);
    elements.userEmail.addEventListener('input', updateSubmitButton);
}

// ===== File Upload Handling =====
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadZone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    processFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    processFiles(files);
    e.target.value = ''; // Reset input
}

function processFiles(files) {
    for (const file of files) {
        const validation = validateFile(file);
        if (!validation.valid) {
            showToast(validation.error, 'error');
            continue;
        }

        const fileId = generateId();
        const isVideo = file.type.startsWith('video/');

        state.files.set(fileId, {
            id: fileId,
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            isVideo: isVideo,
            status: 'queued',
            url: null,
            filename: null,
            thumbnail: null,
            assignedTo: null
        });

        // Generate thumbnail
        generateThumbnail(fileId, file);

        // Add to upload queue
        state.uploadQueue.push(fileId);
    }

    renderFilesList();
    processUploadQueue();
    updateStats();
}

function validateFile(file) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
        return { valid: false, error: `Invalid file type: ${file.name}` };
    }

    if (isImage && file.size < CONFIG.minImageSize) {
        return { valid: false, error: `Image too small (min 200KB): ${file.name}` };
    }

    if (isVideo) {
        if (file.size < CONFIG.minVideoSize) {
            return { valid: false, error: `Video too small (min 1MB): ${file.name}` };
        }
        if (file.size > CONFIG.maxVideoSize) {
            return { valid: false, error: `Video too large (max 1GB): ${file.name}` };
        }
    }

    return { valid: true };
}

function generateThumbnail(fileId, file) {
    const fileData = state.files.get(fileId);

    // For videos, use a simple placeholder to avoid memory issues
    // Loading full videos into memory causes browser crashes
    if (file.type.startsWith('video/')) {
        fileData.thumbnail = null; // Will use "VID" text placeholder
        renderFilesList();
        renderAllDropZones();
        return;
    }

    // For images, create a small compressed thumbnail
    if (file.type.startsWith('image/')) {
        // Use createImageBitmap for memory efficiency (modern browsers)
        if (typeof createImageBitmap !== 'undefined') {
            createImageBitmap(file, {
                resizeWidth: 80,
                resizeHeight: 80,
                resizeQuality: 'low'
            }).then(bitmap => {
                const canvas = document.createElement('canvas');
                canvas.width = 80;
                canvas.height = 80;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(bitmap, 0, 0);
                fileData.thumbnail = canvas.toDataURL('image/jpeg', 0.5);
                bitmap.close(); // Release memory
                renderFilesList();
                renderAllDropZones();
            }).catch(() => {
                // Fallback: no thumbnail
                fileData.thumbnail = null;
                renderFilesList();
                renderAllDropZones();
            });
        } else {
            // Fallback for older browsers - use placeholder
            fileData.thumbnail = null;
            renderFilesList();
            renderAllDropZones();
        }
    }
}

async function processUploadQueue() {
    while (state.uploadQueue.length > 0 && state.activeUploads < CONFIG.concurrentUploads) {
        const fileId = state.uploadQueue.shift();
        state.activeUploads++;

        const fileData = state.files.get(fileId);
        fileData.status = 'uploading';
        renderFilesList();
        updateProgress();

        try {
            const result = await uploadFile(fileId);
            fileData.status = 'done';
            fileData.url = result.url;
            fileData.filename = result.filename;
            showToast(`Uploaded: ${fileData.name}`, 'success');
        } catch (error) {
            fileData.status = 'error';
            showToast(`Failed: ${fileData.name}`, 'error');
        }

        state.activeUploads--;
        renderFilesList();
        updateProgress();
        updateStats();
        updateSubmitButton();
    }
}

async function uploadFile(fileId, retryCount = 0) {
    const fileData = state.files.get(fileId);
    const file = fileData.file;

    const formData = new FormData();
    const uniqueName = `${Date.now()}_${generateId()}_${file.name.replace(/\s+/g, '_')}`;

    formData.append('filename', uniqueName);
    formData.append('data', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

    try {
        const response = await fetch(CONFIG.uploadWebhook, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
        }

        const data = await response.json();

        return {
            url: data.fileUrl || `${CONFIG.minioBaseUrl}${uniqueName}`,
            filename: uniqueName
        };
    } catch (error) {
        clearTimeout(timeoutId);

        if (retryCount < CONFIG.maxRetries) {
            await sleep(CONFIG.retryDelay * (retryCount + 1));
            return uploadFile(fileId, retryCount + 1);
        }

        throw error;
    }
}

function updateProgress() {
    const total = state.files.size;
    const uploading = Array.from(state.files.values()).filter(f => f.status === 'uploading').length;
    const done = Array.from(state.files.values()).filter(f => f.status === 'done').length;

    if (uploading > 0) {
        elements.uploadProgress.hidden = false;
        const percent = (done / total) * 100;
        elements.progressFill.style.width = `${percent}%`;
        elements.progressText.textContent = `Uploading ${uploading} file(s)... (${done}/${total} complete)`;
    } else {
        elements.uploadProgress.hidden = true;
    }
}

// ===== Render Files List =====
function renderFilesList() {
    elements.filesList.innerHTML = '';

    // Show only unassigned files
    const unassignedFiles = Array.from(state.files.values()).filter(f => !f.assignedTo);

    elements.filesCount.textContent = unassignedFiles.length;

    if (unassignedFiles.length === 0) {
        elements.filesList.innerHTML = `
            <p style="text-align: center; color: var(--text-muted); font-size: 0.8125rem; padding: 20px;">
                ${state.files.size > 0 ? 'All files assigned to stops' : 'No files uploaded yet'}
            </p>
        `;
        return;
    }

    for (const fileData of unassignedFiles) {
        const item = document.createElement('div');
        item.className = `file-item ${fileData.status}`;
        item.draggable = fileData.status === 'done';
        item.dataset.fileId = fileData.id;

        // Drag events
        item.addEventListener('dragstart', handleFileDragStart);
        item.addEventListener('dragend', handleFileDragEnd);

        const thumbnail = fileData.thumbnail
            ? `<img src="${fileData.thumbnail}" alt="" class="file-thumbnail ${fileData.isVideo ? 'video' : ''}">`
            : `<div class="file-thumbnail" style="display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--text-muted);">${fileData.isVideo ? 'VID' : 'IMG'}</div>`;

        let statusHtml = '';
        if (fileData.status === 'uploading') {
            statusHtml = '<span class="loader-dot"></span>';
        } else if (fileData.status === 'queued') {
            statusHtml = '<span class="file-status">Queued</span>';
        } else if (fileData.status === 'error') {
            statusHtml = '<span class="file-status" style="color: var(--error);">Failed</span>';
        }

        item.innerHTML = `
            ${thumbnail}
            <div class="file-info">
                <div class="file-name">${fileData.name}</div>
                <div class="file-size">${formatFileSize(fileData.size)}</div>
            </div>
            ${statusHtml}
            <button class="file-remove" onclick="removeFile('${fileData.id}')" title="Remove">×</button>
        `;

        elements.filesList.appendChild(item);
    }
}

function handleFileDragStart(e) {
    const fileId = e.target.dataset.fileId;
    state.draggedFileId = fileId;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', fileId);
}

function handleFileDragEnd(e) {
    e.target.classList.remove('dragging');
    state.draggedFileId = null;
}

function removeFile(fileId) {
    const fileData = state.files.get(fileId);
    if (fileData.assignedTo) {
        // Unassign from stop
        const stop = findStopById(fileData.assignedTo);
        if (stop) {
            stop.media = stop.media.filter(id => id !== fileId);
        }
    }
    state.files.delete(fileId);
    renderFilesList();
    renderAllDropZones();
    updateStats();
    updateSubmitButton();
}

// ===== Days & Stops Management =====
function addDay() {
    state.dayCounter++;
    const dayId = `day-${state.dayCounter}`;

    const day = {
        id: dayId,
        number: state.dayCounter,
        title: '',
        stops: []
    };

    state.days.push(day);
    renderDays();
    updateStats();
}

function removeDay(dayId) {
    const day = state.days.find(d => d.id === dayId);
    if (day) {
        // Unassign all files from this day's stops
        for (const stop of day.stops) {
            for (const fileId of stop.media) {
                const fileData = state.files.get(fileId);
                if (fileData) {
                    fileData.assignedTo = null;
                }
            }
        }
    }

    state.days = state.days.filter(d => d.id !== dayId);

    // Renumber days AND reset day counter to match
    state.days.forEach((d, i) => {
        d.number = i + 1;
        d.id = `day-${i + 1}`; // Also update the ID to match
    });

    // Reset dayCounter to the current count so next day is numbered correctly
    state.dayCounter = state.days.length;

    renderDays();
    renderFilesList();
    updateStats();
    updateSubmitButton();
}

function addStop(dayId, type) {
    const day = state.days.find(d => d.id === dayId);
    if (!day) return;

    const stopId = `${dayId}-stop-${generateId()}`;

    const stop = {
        id: stopId,
        dayId: dayId,
        type: type, // 'activity', 'attraction', 'accommodation'
        title: '',
        media: []
    };

    day.stops.push(stop);
    renderDays();
    updateStats();
}

function removeStop(stopId) {
    for (const day of state.days) {
        const stop = day.stops.find(s => s.id === stopId);
        if (stop) {
            // Unassign files
            for (const fileId of stop.media) {
                const fileData = state.files.get(fileId);
                if (fileData) {
                    fileData.assignedTo = null;
                }
            }
            day.stops = day.stops.filter(s => s.id !== stopId);
            break;
        }
    }

    renderDays();
    renderFilesList();
    updateStats();
    updateSubmitButton();
}

function updateDayTitle(dayId, title) {
    const day = state.days.find(d => d.id === dayId);
    if (day) {
        day.title = title;
    }
}

function updateStopTitle(stopId, title) {
    const stop = findStopById(stopId);
    if (stop) {
        stop.title = title;
    }
}

function findStopById(stopId) {
    for (const day of state.days) {
        const stop = day.stops.find(s => s.id === stopId);
        if (stop) return stop;
    }
    return null;
}

// ===== Render Days =====
function renderDays() {
    elements.daysContainer.innerHTML = '';

    if (state.days.length === 0) {
        elements.daysContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <p style="font-size: 1rem; margin-bottom: 8px;">No days added yet</p>
                <p style="font-size: 0.875rem;">Click "Add Day" to start organizing your trip</p>
            </div>
        `;
        return;
    }

    for (const day of state.days) {
        const dayElement = createDayElement(day);
        elements.daysContainer.appendChild(dayElement);
    }
}

function createDayElement(day) {
    const el = document.createElement('div');
    el.className = 'day-card';
    el.id = day.id;

    el.innerHTML = `
        <div class="day-header">
            <div class="day-title">
                <span class="day-number">Day ${day.number}</span>
                <input type="text" class="day-title-input" 
                       placeholder="e.g., Golden Circle Tour" 
                       value="${day.title}"
                       onchange="updateDayTitle('${day.id}', this.value)">
            </div>
            <div class="day-actions">
                <button class="btn btn-sm btn-danger btn-icon" onclick="removeDay('${day.id}')" title="Remove Day">×</button>
            </div>
        </div>
        <div class="day-content">
            <div class="stops-container" id="stops-${day.id}">
                ${day.stops.map(stop => createStopHtml(stop)).join('')}
            </div>
            <div class="add-stop-buttons">
                <button class="btn btn-sm btn-secondary" onclick="addStop('${day.id}', 'activity')">
                    + Activity
                </button>
                <button class="btn btn-sm btn-secondary" onclick="addStop('${day.id}', 'attraction')">
                    + Attraction
                </button>
                <button class="btn btn-sm btn-secondary" onclick="addStop('${day.id}', 'accommodation')">
                    + Accommodation
                </button>
            </div>
        </div>
    `;

    // Setup drop zones
    setTimeout(() => {
        for (const stop of day.stops) {
            setupDropZone(stop.id);
        }
    }, 0);

    return el;
}

function createStopHtml(stop) {
    const typeLabels = {
        activity: 'Activity',
        attraction: 'Attraction',
        accommodation: 'Accommodation'
    };

    const mediaHtml = stop.media.length > 0
        ? stop.media.map(fileId => {
            const fileData = state.files.get(fileId);
            if (!fileData) return '';
            return `
                <div class="media-thumb ${fileData.isVideo ? 'video' : ''}" data-file-id="${fileId}" draggable="true">
                    <img src="${fileData.thumbnail || ''}" alt="">
                    <button class="media-thumb-remove" onclick="removeMediaFromStop('${stop.id}', '${fileId}')">×</button>
                </div>
            `;
        }).join('')
        : '<span class="drop-zone-text">Drag & drop media here</span>';

    return `
        <div class="stop-card ${stop.type}" id="${stop.id}">
            <div class="stop-header">
                <div class="stop-type">
                    <span class="stop-badge ${stop.type}">${typeLabels[stop.type]}</span>
                    <input type="text" class="stop-title-input" 
                           placeholder="Enter title..."
                           value="${stop.title}"
                           onchange="updateStopTitle('${stop.id}', this.value)">
                </div>
                <button class="btn btn-sm btn-danger btn-icon" onclick="removeStop('${stop.id}')" title="Remove">×</button>
            </div>
            <div class="stop-content">
                <div class="drop-zone ${stop.media.length === 0 ? 'empty' : ''}" 
                     id="dropzone-${stop.id}">
                    ${mediaHtml}
                </div>
            </div>
        </div>
    `;
}

function setupDropZone(stopId) {
    const dropZone = document.getElementById(`dropzone-${stopId}`);
    if (!dropZone) return;

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');

        const fileId = e.dataTransfer.getData('text/plain') || state.draggedFileId;
        if (fileId) {
            assignFileToStop(fileId, stopId);
        }
    });
}

function assignFileToStop(fileId, stopId) {
    const fileData = state.files.get(fileId);
    const stop = findStopById(stopId);

    if (!fileData || !stop) return;
    if (fileData.status !== 'done') {
        showToast('Wait for upload to complete', 'warning');
        return;
    }

    // Remove from previous assignment
    if (fileData.assignedTo) {
        const prevStop = findStopById(fileData.assignedTo);
        if (prevStop) {
            prevStop.media = prevStop.media.filter(id => id !== fileId);
        }
    }

    // Assign to new stop
    fileData.assignedTo = stopId;
    if (!stop.media.includes(fileId)) {
        stop.media.push(fileId);
    }

    renderDays();
    renderFilesList();
    updateStats();
    updateSubmitButton();
}

function removeMediaFromStop(stopId, fileId) {
    const stop = findStopById(stopId);
    const fileData = state.files.get(fileId);

    if (stop) {
        stop.media = stop.media.filter(id => id !== fileId);
    }
    if (fileData) {
        fileData.assignedTo = null;
    }

    renderDays();
    renderFilesList();
    updateStats();
    updateSubmitButton();
}

function renderAllDropZones() {
    for (const day of state.days) {
        for (const stop of day.stops) {
            const dropZone = document.getElementById(`dropzone-${stop.id}`);
            if (dropZone) {
                const mediaHtml = stop.media.length > 0
                    ? stop.media.map(fileId => {
                        const fileData = state.files.get(fileId);
                        if (!fileData) return '';
                        return `
                            <div class="media-thumb ${fileData.isVideo ? 'video' : ''}" data-file-id="${fileId}">
                                <img src="${fileData.thumbnail || ''}" alt="">
                                <button class="media-thumb-remove" onclick="removeMediaFromStop('${stop.id}', '${fileId}')">×</button>
                            </div>
                        `;
                    }).join('')
                    : '<span class="drop-zone-text">Drag & drop media here</span>';

                dropZone.innerHTML = mediaHtml;
                dropZone.classList.toggle('empty', stop.media.length === 0);
            }
        }
    }
}

// ===== Stats & Validation =====
function updateStats() {
    const totalFiles = Array.from(state.files.values()).filter(f => f.status === 'done').length;
    const assignedFiles = Array.from(state.files.values()).filter(f => f.assignedTo).length;

    elements.totalFiles.textContent = totalFiles;
    elements.assignedFiles.textContent = assignedFiles;
}

function updateSubmitButton() {
    const isValid = validateForm();
    elements.submitBtn.disabled = !isValid;
}

function validateForm() {
    // Check user info
    if (!elements.userName.value.trim()) return false;
    if (!elements.userEmail.value.trim()) return false;
    if (!isValidEmail(elements.userEmail.value)) return false;

    // Check consent
    if (!elements.legalConsent.checked) return false;

    // Check at least one day with content
    if (state.days.length === 0) return false;

    // Check at least one file uploaded and assigned
    const uploadedFiles = Array.from(state.files.values()).filter(f => f.status === 'done');
    if (uploadedFiles.length === 0) return false;

    const assignedFiles = uploadedFiles.filter(f => f.assignedTo);
    if (assignedFiles.length === 0) return false;

    return true;
}

// ===== Submit =====
async function handleSubmit() {
    if (!validateForm()) {
        showToast('Please complete all required fields', 'error');
        return;
    }

    elements.submitBtn.disabled = true;
    elements.submitBtn.querySelector('.btn-text').hidden = true;
    elements.submitBtn.querySelector('.btn-loader').hidden = false;

    try {
        const payload = buildSubmissionPayload();

        const response = await fetch(CONFIG.submitWebhook, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Submission failed');
        }

        // Show success modal
        elements.successModal.hidden = false;

    } catch (error) {
        showToast('Submission failed. Please try again.', 'error');
        elements.submitBtn.disabled = false;
        elements.submitBtn.querySelector('.btn-text').hidden = false;
        elements.submitBtn.querySelector('.btn-loader').hidden = true;
    }
}

function buildSubmissionPayload() {
    const days = state.days.map(day => {
        const stops = day.stops.map((stop, index) => {
            const media = stop.media.map(fileId => {
                const fileData = state.files.get(fileId);
                return {
                    url: fileData.url,
                    filename: fileData.filename,
                    type: fileData.type,
                    size: fileData.size,
                    original_name: fileData.name
                };
            });

            return {
                order: index + 1,
                type: stop.type,
                title: stop.title || `${stop.type.charAt(0).toUpperCase() + stop.type.slice(1)} ${index + 1}`,
                media: media
            };
        });

        // Separate accommodation from regular stops
        const regularStops = stops.filter(s => s.type !== 'accommodation');
        const accommodation = stops.find(s => s.type === 'accommodation');

        return {
            day_number: day.number,
            title: day.title || `Day ${day.number}`,
            stops: regularStops,
            accommodation: accommodation || null
        };
    });

    // Count all media
    const allMedia = [];
    for (const fileData of state.files.values()) {
        if (fileData.status === 'done' && fileData.assignedTo) {
            allMedia.push({
                url: fileData.url,
                filename: fileData.filename,
                type: fileData.type,
                size: fileData.size,
                original_name: fileData.name
            });
        }
    }

    return {
        user_name: elements.userName.value.trim(),
        user_email: elements.userEmail.value.trim(),
        legal_consent: true,
        consent_timestamp: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        media_count: allMedia.length,
        media: allMedia,
        days: days
    };
}

// ===== Toast Notifications =====
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M8 12L11 15L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 9V13M12 17H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.29 3.86L1.82 18C1.64 18.3 1.64 18.69 1.82 19 2 19.31 2.32 19.5 2.67 19.5H21.33C21.68 19.5 22 19.31 22.18 19 22.36 18.69 22.36 18.3 22.18 18L13.71 3.86C13.53 3.56 13.21 3.37 12.86 3.37 12.51 3.37 12.19 3.56 12.01 3.86H10.29Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-message">${message}</div>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ===== Utilities =====
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function formatFileSize(bytes) {
    if (bytes >= 1024 * 1024 * 1024) {
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    if (bytes >= 1024 * 1024) {
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
    return (bytes / 1024).toFixed(1) + ' KB';
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Expose functions globally =====
window.removeFile = removeFile;
window.removeDay = removeDay;
window.addStop = addStop;
window.removeStop = removeStop;
window.updateDayTitle = updateDayTitle;
window.updateStopTitle = updateStopTitle;
window.removeMediaFromStop = removeMediaFromStop;

// ===== Initialize on DOM load =====
document.addEventListener('DOMContentLoaded', init);
