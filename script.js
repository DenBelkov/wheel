const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const spinner = document.getElementById('wheel-spinner');
const bgMedia = document.getElementById('wheel-bg-media');
const optionsInput = document.getElementById('options-input');
const spinBtn = document.getElementById('spin-btn');
const winnerDisplay = document.getElementById('winner-display');
const imageUpload = document.getElementById('image-upload');
const jsonUpload = document.getElementById('json-upload');

let options = [];
let currentRotation = 0;
let isSpinning = false;
let hasBackgroundImage = false;

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#82E0AA'];

// 1. Initialize: Try loading options.json and background.gif/png from the same folder
window.addEventListener('DOMContentLoaded', () => {
    loadLocalFiles();
    updateOptionsFromText();
});

async function loadLocalFiles() {
    // Try fetching options.json
    try {
        const response = await fetch('options.json');
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                optionsInput.value = data.join('\n');
                updateOptionsFromText();
            }
        }
    } catch (err) {
        console.log('No local options.json found or blocked by browser CORS policy. Using textarea defaults.');
    }

    // Try loading a default image/gif from the folder (e.g., background.gif or background.png)
    const defaultImages = ['background.gif', 'background.png', 'background.jpg'];
    for (let imgName of defaultImages) {
        const img = new Image();
        img.onload = () => {
            setWheelBackground(imgName);
        };
        img.src = imgName;
    }
}

function setWheelBackground(src) {
    bgMedia.src = src;
    bgMedia.style.display = 'block';
    hasBackgroundImage = true;
    drawWheel();
}

// 2. Update wheel whenever text changes
optionsInput.addEventListener('input', updateOptionsFromText);

function updateOptionsFromText() {
    options = optionsInput.value
        .split('\n')
        .map(opt => opt.trim())
        .filter(opt => opt.length > 0);
    drawWheel();
}

// 3. Handle manual Image/GIF upload
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            setWheelBackground(event.target.result);
        };
        reader.readAsDataURL(file);
    }
});

// 4. Handle manual JSON upload
jsonUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (Array.isArray(data)) {
                    optionsInput.value = data.join('\n');
                    updateOptionsFromText();
                } else {
                    alert('JSON file must contain an array of strings, e.g. ["Option 1", "Option 2"]');
                }
            } catch (err) {
                alert('Invalid JSON file.');
            }
        };
        reader.readAsDataURL(file);
    }
});

// 5. Draw the wheel slices and text
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

        // Draw slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle, angle + arcSize);
        ctx.closePath();

        // If a background image/GIF is active, make slices semi-transparent so the image shows through
        if (hasBackgroundImage) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; 
        } else {
            ctx.fillStyle = colors[i % colors.length];
        }
        ctx.fill();

        // Draw slice border
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle + arcSize / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(options[i], radius - 20, 6);
        ctx.restore();
    }
}

// 6. Spin logic and winner calculation
spinBtn.addEventListener('click', () => {
    if (isSpinning || options.length === 0) return;

    isSpinning = true;
    spinBtn.disabled = true;
    winnerDisplay.textContent = '';

    // Spin at least 5 full rotations (1800 deg) + random angle
    const extraDegrees = Math.floor(Math.random() * 360);
    const totalSpin = 1800 + extraDegrees;
    currentRotation += totalSpin;

    spinner.style.transform = `rotate(${currentRotation}deg)`;

    // Wait for the 4-second CSS transition to finish
    setTimeout(() => {
        isSpinning = false;
        spinBtn.disabled = false;
        calculateWinner();
    }, 4000);
});

function calculateWinner() {
    const numOptions = options.length;
    const sliceDegrees = 360 / numOptions;
    
    // Normalize current rotation to 0-359
    const actualRotation = currentRotation % 360;
    
    // The pointer is at the top (270 degrees in standard canvas coordinates)
    const pointerAngle = (270 - actualRotation + 360) % 360;
    const winningIndex = Math.floor(pointerAngle / sliceDegrees);

    winnerDisplay.textContent = `Winner: ${options[winningIndex]}`;
}
