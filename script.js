const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const spinner = document.getElementById('wheel-spinner');
const bgMedia = document.getElementById('wheel-bg-media');
const optionsInput = document.getElementById('options-input');
const spinBtn = document.getElementById('spin-btn');
const winnerDisplay = document.getElementById('winner-display');

const folderUpload = document.getElementById('folder-upload');
const singleOptionSelect = document.getElementById('single-option-select');
const singleImageUpload = document.getElementById('single-image-upload');
const bgUpload = document.getElementById('bg-upload');
const jsonUpload = document.getElementById('json-upload');
const displayModeRadios = document.querySelectorAll('input[name="display-mode"]');

let options = [];
let currentRotation = 0;
let isSpinning = false;
let animationFrameId = null;

// Stores { "option name in lowercase": { src: dataURL, img: HTMLImageElement } }
const optionImages = {};
let staticBgSrc = '';
let displayMode = 'segments'; // 'segments' or 'flash'
let lastFlashedIndex = -1;

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#82E0AA'];

// 1. Initialize
window.addEventListener('DOMContentLoaded', () => {
    loadLocalFiles();
    updateOptionsFromText();
});

async function loadLocalFiles() {
    try {
        const response = await fetch('options.json');
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && optionsInput.value.trim() === '') {
                optionsInput.value = data.join('\n');
                updateOptionsFromText();
            }
        }
    } catch (err) {
        // Ignored if running without a local server or no options.json exists
    }
}

// 2. Options & Dropdown Sync
optionsInput.addEventListener('input', updateOptionsFromText);

function updateOptionsFromText() {
    options = optionsInput.value
        .split('\n')
        .map(opt => opt.trim())
        .filter(opt => opt.length > 0);

    updateSingleOptionDropdown();
    refreshWheelVisuals();
}

function updateSingleOptionDropdown() {
    const previousSelection = singleOptionSelect.value;
    singleOptionSelect.innerHTML = '';
    options.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt;
        el.textContent = opt;
        singleOptionSelect.appendChild(el);
    });
    if (options.includes(previousSelection)) {
        singleOptionSelect.value = previousSelection;
    }
}

// 3. Mode Switching ('segments' vs 'flash')
displayModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        displayMode = e.target.value;
        lastFlashedIndex = -1;
        refreshWheelVisuals();
    });
});

function refreshWheelVisuals() {
    if (displayMode === 'flash') {
        const currentIdx = getIndexAtPointer(getCurrentVisualRotation());
        updateFlashBackground(currentIdx);
    } else {
        if (staticBgSrc) {
            bgMedia.src = staticBgSrc;
            bgMedia.style.display = 'block';
        } else {
            bgMedia.style.display = 'none';
        }
    }
    drawWheel();
}

// 4. Helper to store image data for an option
function registerOptionImage(optionName, dataUrl) {
    const key = optionName.toLowerCase();
    const img = new Image();
    img.onload = () => {
        optionImages[key] = { src: dataUrl, img: img };
        refreshWheelVisuals();
    };
    img.src = dataUrl;
}

// 5. Connect Folder of Pictures
folderUpload.addEventListener('change', (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const isTextEmpty = optionsInput.value.trim() === '';
    const discoveredNames = [];

    files.forEach(file => {
        // Strip file extension (e.g., "Pizza.png" -> "Pizza")
        const baseName = file.name.replace(/\.[^/.]+$/, '').trim();
        discoveredNames.push(baseName);

        const reader = new FileReader();
        reader.onload = (event) => {
            registerOptionImage(baseName, event.target.result);
        };
        reader.readAsDataURL(file);
    });

    // Populate options only if none are set yet
    if (isTextEmpty && discoveredNames.length > 0) {
        optionsInput.value = discoveredNames.join('\n');
        updateOptionsFromText();
    }
});

// 6. Single Option Image Upload
singleImageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const selectedOption = singleOptionSelect.value;
    if (!file || !selectedOption) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        registerOptionImage(selectedOption, event.target.result);
    };
    reader.readAsDataURL(file);
});

// 7. Static Full-Wheel Background Upload
bgUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        staticBgSrc = event.target.result;
        refreshWheelVisuals();
    };
    reader.readAsDataURL(file);
});

// 8. Manual JSON Upload
jsonUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (Array.isArray(data)) {
                optionsInput.value = data.join('\n');
                updateOptionsFromText();
            } else {
                alert('JSON file must be an array of strings, e.g. ["Option 1", "Option 2"]');
            }
        } catch (err) {
            alert('Invalid JSON file.');
        }
    };
    reader.readAsText(file);
});

// 9. Draw Wheel & Segment Images
function drawWheel() {
    const numOptions = options.length;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (numOptions === 0) return;

    const arcSize = (2 * Math.PI) / numOptions;

    for (let i = 0; i < numOptions; i++) {
        const angle = i * arcSize;
        const optText = options[i];
        const optKey = optText.toLowerCase();
        const mediaEntry = optionImages[optKey];

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
        ctx.closePath();

        // Fill slice base color (semi-transparent if a full-wheel background is active)
        const hasFullBg = bgMedia.style.display === 'block';
        if (hasFullBg) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        } else {
            ctx.fillStyle = colors[i % colors.length];
        }
        ctx.fill();

        // Draw clipped image onto the segment if in 'segments' mode
        if (displayMode === 'segments' && mediaEntry && mediaEntry.img) {
            ctx.clip(); // Restrict drawing to this pie slice
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle + arcSize / 2);
            // Draw image oriented outward along the slice
            ctx.drawImage(mediaEntry.img, 20, -radius * 0.65, radius - 20, radius * 1.3);
            ctx.restore();
        }
        ctx.restore();

        // Draw slice border
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
        ctx.closePath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Draw option text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle + arcSize / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 17px sans-serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 5;
        ctx.fillText(optText, radius - 18, 6);
        ctx.restore();
    }
}

// 10. Real-time Pointer Tracking & Flash Logic
function getCurrentVisualRotation() {
    const style = window.getComputedStyle(spinner);
    const matrix = new DOMMatrix(style.transform);
    const angle = Math.round(Math.atan2(matrix.b, matrix.a) * (180 / Math.PI));
    return (angle + 360) % 360;
}

function getIndexAtPointer(rotationDeg) {
    if (options.length === 0) return -1;
    const sliceDegrees = 360 / options.length;
    const pointerAngle = (270 - (rotationDeg % 360) + 360) % 360;
    return Math.floor(pointerAngle / sliceDegrees);
}

function updateFlashBackground(index) {
    if (index < 0 || index >= options.length) return;
    if (index === lastFlashedIndex) return;
    lastFlashedIndex = index;

    const optKey = options[index].toLowerCase();
    const mediaEntry = optionImages[optKey];

    if (mediaEntry && mediaEntry.src) {
        bgMedia.src = mediaEntry.src;
        bgMedia.style.display = 'block';
    } else if (staticBgSrc) {
        bgMedia.src = staticBgSrc;
        bgMedia.style.display = 'block';
    } else {
        bgMedia.style.display = 'none';
    }
    drawWheel();
}

function trackSpinFrame() {
    if (!isSpinning) return;
    if (displayMode === 'flash') {
        const currentAngle = getCurrentVisualRotation();
        const activeIndex = getIndexAtPointer(currentAngle);
        updateFlashBackground(activeIndex);
    }
    animationFrameId = requestAnimationFrame(trackSpinFrame);
}

// 11. Spin Trigger
spinBtn.addEventListener('click', () => {
    if (isSpinning || options.length === 0) return;

    isSpinning = true;
    spinBtn.disabled = true;
    winnerDisplay.textContent = '';
    lastFlashedIndex = -1;

    const extraDegrees = Math.floor(Math.random() * 360);
    const totalSpin = 1800 + extraDegrees;
    currentRotation += totalSpin;

    spinner.style.transform = `rotate(${currentRotation}deg)`;
    if (displayMode === 'flash') {
        animationFrameId = requestAnimationFrame(trackSpinFrame);
    }
    setTimeout(() => {
        isSpinning = false;
        spinBtn.disabled = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        const winningIndex = getIndexAtPointer(currentRotation);
        if (displayMode === 'flash') {
            updateFlashBackground(winningIndex);
        }
        winnerDisplay.textContent = `Winner: ${options[winningIndex]}`;
    }, 4000);
});
