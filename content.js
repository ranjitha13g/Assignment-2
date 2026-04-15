/* ─── State ─────────────────────────────────────────── */
let isDrawing   = false;
let ctx         = null;
let currentTool = 'pencil';
let overlay     = null;

let isSnipping  = false;
let snipStartX  = 0;
let snipStartY  = 0;

/* ─── Entry point ───────────────────────────────────── */
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'start_annotate') {
        setupOverlay(request.image);
    }
});

/* ─── Build the overlay ─────────────────────────────── */
function setupOverlay(screenshotData) {
    if (document.getElementById('qa-overlay')) return;

    overlay = document.createElement('div');
    overlay.id = 'qa-overlay';

    /* Toolbar */
    const toolbar = document.createElement('div');
    toolbar.id = 'qa-toolbar';
    toolbar.innerHTML = `
        <span class="qa-logo">✏️ QuickAnnotate</span>
        <div class="qa-tools">
            <button id="qa-pencil"       class="active" title="Pencil (draw)">
                <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                Pencil
            </button>
            <button id="qa-highlighter"  title="Highlighter">
                <svg viewBox="0 0 24 24"><path d="M18.5 1.15c-.53 0-1.04.19-1.43.58L8.36 10.44l-.46 3.37 3.37-.46 8.71-8.71c.79-.79.79-2.07 0-2.86-.39-.39-.9-.63-1.48-.63zM4 21h16v-2H4v2z"/></svg>
                Highlight
            </button>
            <button id="qa-eraser"       title="Eraser">
                <svg viewBox="0 0 24 24"><path d="M15.14 3c-.51 0-1.02.2-1.41.59L2.59 14.73c-.78.78-.78 2.05 0 2.83L5.03 20H20v-2h-8.36l7.77-7.77c.39-.39.59-.9.59-1.42s-.2-1.02-.59-1.41L16.56 3.59c-.4-.39-.91-.59-1.42-.59z"/></svg>
                Eraser
            </button>
            <button id="qa-snip"         title="Snip area">
                <svg viewBox="0 0 24 24"><path d="M14 1l-1 1v9H4l-1 1v2h2v2H3l-1 1v2l1 1h2v2l1 1h2l1-1v-2h8v2l1 1h2l1-1v-2h2l1-1v-2l-1-1h-2v-2h2l1-1v-2l-1-1H15V2l-1-1h-2zm1 4.83L18.17 9H15V5.83zm-6 0V9H5.83L9 5.83zM5 11h14v2H5v-2zm2 4h10v2H7v-2z"/></svg>
                Snip
            </button>
        </div>
        <div class="qa-actions">
            <button id="qa-notepad-btn"  title="Toggle Notepad">🗒️ Notepad</button>
            <button id="qa-save"         title="Save full screenshot as PNG">💾 Save PNG</button>
            <button id="qa-exit"         title="Close annotator">✖ Exit</button>
        </div>
    `;
    overlay.appendChild(toolbar);

    /* Background image (live screenshot) */
    const bgImg = document.createElement('img');
    bgImg.id  = 'qa-bg';
    bgImg.src = screenshotData;
    overlay.appendChild(bgImg);

    /* Drawing canvas (transparent layer on top) */
    const canvas = document.createElement('canvas');
    canvas.id = 'qa-canvas';
    overlay.appendChild(canvas);

    /* Snip selection box */
    const snipBox = document.createElement('div');
    snipBox.id = 'qa-snip-box';
    overlay.appendChild(snipBox);

    /* Snip size label */
    const snipLabel = document.createElement('div');
    snipLabel.id = 'qa-snip-label';
    overlay.appendChild(snipLabel);

    /* Eraser cursor ring */
    const eraserRing = document.createElement('div');
    eraserRing.id = 'qa-eraser-ring';
    overlay.appendChild(eraserRing);

    /* Notepad */
    const notepad = document.createElement('div');
    notepad.id = 'qa-notepad';
    notepad.innerHTML = `
        <div id="qa-notepad-header">
            <span>🗒️ Notepad</span>
            <button id="qa-notepad-close" title="Close">✖</button>
        </div>
        <textarea id="qa-notepad-text" placeholder="Type your notes here…" spellcheck="true"></textarea>
        <div id="qa-notepad-footer">
            <button id="qa-notepad-copy" title="Copy all text">📋 Copy</button>
            <button id="qa-notepad-clear" title="Clear">🗑 Clear</button>
        </div>
    `;
    overlay.appendChild(notepad);

    /* Toast notification */
    const toast = document.createElement('div');
    toast.id = 'qa-toast';
    overlay.appendChild(toast);

    document.body.appendChild(overlay);

    /* ── Canvas init ── */
    ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    /* ── Canvas events ── */
    canvas.addEventListener('mousedown', (e) => {
        if (currentTool === 'snip') startSnipping(e);
        else startDrawing(e);
    });
    canvas.addEventListener('mousemove', (e) => {
        if (currentTool === 'snip')        updateSnipping(e);
        else if (currentTool === 'eraser') { moveEraserRing(e); draw(e); }
        else draw(e);
    });
    canvas.addEventListener('mouseup', (e) => {
        if (currentTool === 'snip') finishSnipping(e);
        else stopDrawing();
    });
    canvas.addEventListener('mouseleave', () => {
        if (currentTool !== 'snip') stopDrawing();
        hideEraserRing();
    });
    canvas.addEventListener('mouseenter', (e) => {
        if (currentTool === 'eraser') moveEraserRing(e);
    });

    /* ── Toolbar events ── */
    document.getElementById('qa-pencil')     .onclick = (e) => setTool('pencil', e.currentTarget);
    document.getElementById('qa-highlighter').onclick = (e) => setTool('highlighter', e.currentTarget);
    document.getElementById('qa-eraser')     .onclick = (e) => setTool('eraser', e.currentTarget);
    document.getElementById('qa-snip')       .onclick = (e) => setTool('snip', e.currentTarget);

    document.getElementById('qa-notepad-btn').onclick = () => toggleNotepad();
    document.getElementById('qa-notepad-close').onclick = () => toggleNotepad(false);

    document.getElementById('qa-notepad-copy').onclick = () => {
        const ta = document.getElementById('qa-notepad-text');
        navigator.clipboard.writeText(ta.value).then(() => showToast('Copied to clipboard!'));
    };
    document.getElementById('qa-notepad-clear').onclick = () => {
        document.getElementById('qa-notepad-text').value = '';
        showToast('Notepad cleared.');
    };

    document.getElementById('qa-save').onclick = saveCanvas;
    document.getElementById('qa-exit').onclick = () => overlay.remove();

    makeDraggable(notepad, document.getElementById('qa-notepad-header'));

    /* Prevent notepad textarea drag from bleeding into canvas */
    document.getElementById('qa-notepad-text').addEventListener('mousedown', (e) => e.stopPropagation());
}

/* ─── Tool selection ────────────────────────────────── */
function setTool(tool, btn) {
    currentTool = tool;
    document.querySelectorAll('#qa-toolbar button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const canvas = document.getElementById('qa-canvas');
    if (tool === 'snip') {
        canvas.style.cursor = 'crosshair';
        hideEraserRing();
    } else if (tool === 'eraser') {
        canvas.style.cursor = 'none';
    } else {
        canvas.style.cursor = 'crosshair';
        hideEraserRing();
    }
}

/* ─── Drawing ───────────────────────────────────────── */
function startDrawing(e) {
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
}

function draw(e) {
    if (!isDrawing) return;

    if (currentTool === 'pencil') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#ff3c3c';
        ctx.lineWidth   = 3;
        ctx.globalAlpha = 1.0;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
    } else if (currentTool === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255, 230, 0, 0.45)';
        ctx.lineWidth   = 22;
        ctx.globalAlpha = 1.0;
        ctx.lineCap     = 'square';
        ctx.lineJoin    = 'round';
    } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth   = ERASER_SIZE;
        ctx.globalAlpha = 1.0;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
    }

    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
}

function stopDrawing() {
    isDrawing = false;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
}

/* ─── Eraser cursor ring ────────────────────────────── */
const ERASER_SIZE = 28;

function moveEraserRing(e) {
    const ring = document.getElementById('qa-eraser-ring');
    if (!ring) return;
    ring.style.display = 'block';
    ring.style.left    = (e.clientX - ERASER_SIZE / 2) + 'px';
    ring.style.top     = (e.clientY - ERASER_SIZE / 2) + 'px';
    ring.style.width   = ERASER_SIZE + 'px';
    ring.style.height  = ERASER_SIZE + 'px';
}

function hideEraserRing() {
    const ring = document.getElementById('qa-eraser-ring');
    if (ring) ring.style.display = 'none';
}

/* ─── Composite helpers ─────────────────────────────── */
function getCompositeCanvas() {
    const canvas = document.getElementById('qa-canvas');
    const bgImg  = document.getElementById('qa-bg');
    const tmp    = document.createElement('canvas');
    tmp.width    = canvas.width;
    tmp.height   = canvas.height;
    const tCtx   = tmp.getContext('2d');
    if (bgImg) tCtx.drawImage(bgImg, 0, 0, tmp.width, tmp.height);
    tCtx.drawImage(canvas, 0, 0);
    return tmp;
}

function saveCanvas() {
    const tmp  = getCompositeCanvas();
    const link = document.createElement('a');
    link.download = 'annotation.png';
    link.href     = tmp.toDataURL('image/png');
    link.click();
    showToast('Screenshot saved!');
}

function saveCroppedCanvas(x, y, w, h) {
    const composite = getCompositeCanvas();
    const crop      = document.createElement('canvas');
    crop.width      = w;
    crop.height     = h;
    const cCtx      = crop.getContext('2d');
    cCtx.drawImage(composite, x, y, w, h, 0, 0, w, h);
    const link = document.createElement('a');
    link.download = 'snip.png';
    link.href     = crop.toDataURL('image/png');
    link.click();
    showToast(`Snip saved! (${w}×${h}px)`);
}

/* ─── Snipping tool ─────────────────────────────────── */
function startSnipping(e) {
    isSnipping = true;
    snipStartX = e.clientX;
    snipStartY = e.clientY;
    const box = document.getElementById('qa-snip-box');
    box.style.display = 'block';
    box.style.left   = snipStartX + 'px';
    box.style.top    = snipStartY + 'px';
    box.style.width  = '0';
    box.style.height = '0';
}

function updateSnipping(e) {
    if (!isSnipping) return;
    const x = Math.min(snipStartX, e.clientX);
    const y = Math.min(snipStartY, e.clientY);
    const w = Math.abs(e.clientX - snipStartX);
    const h = Math.abs(e.clientY - snipStartY);
    const box = document.getElementById('qa-snip-box');
    box.style.left   = x + 'px';
    box.style.top    = y + 'px';
    box.style.width  = w + 'px';
    box.style.height = h + 'px';

    const label = document.getElementById('qa-snip-label');
    label.style.display = 'block';
    label.style.left    = x + 'px';
    label.style.top     = (y - 24) + 'px';
    label.textContent   = `${w} × ${h}`;
}

function finishSnipping(e) {
    if (!isSnipping) return;
    isSnipping = false;
    const box = document.getElementById('qa-snip-box');
    box.style.display = 'none';
    document.getElementById('qa-snip-label').style.display = 'none';

    const x = Math.min(snipStartX, e.clientX);
    const y = Math.min(snipStartY, e.clientY);
    const w = Math.abs(e.clientX - snipStartX);
    const h = Math.abs(e.clientY - snipStartY);

    if (w > 5 && h > 5) saveCroppedCanvas(x, y, w, h);
}

/* ─── Notepad ───────────────────────────────────────── */
function toggleNotepad(force) {
    const np = document.getElementById('qa-notepad');
    const open = force !== undefined ? force : np.style.display !== 'flex';
    np.style.display = open ? 'flex' : 'none';
}

/* ─── Toast ─────────────────────────────────────────── */
function showToast(msg) {
    const toast = document.getElementById('qa-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2200);
}

/* ─── Draggable helper ──────────────────────────────── */
function makeDraggable(element, handle) {
    let ox = 0, oy = 0, sx = 0, sy = 0;

    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        sx = e.clientX;
        sy = e.clientY;
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup',   endDrag);
    });

    function drag(e) {
        ox = sx - e.clientX;
        oy = sy - e.clientY;
        sx = e.clientX;
        sy = e.clientY;
        element.style.top  = (element.offsetTop  - oy) + 'px';
        element.style.left = (element.offsetLeft - ox) + 'px';
    }

    function endDrag() {
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup',   endDrag);
    }
}
