/**
 * PREMIMUM ACTIVITY CORE ENGINE
 * Refactored & Optimized
 */

const CONFIG = {
    CANVAS_WIDTH: 1280,
    CANVAS_HEIGHT: 1024,
    IDLE_TIMEOUT: 2000,
    ANIMATION_DURATION: 800,
    HINT_DURATION: 1800,
    COLORS: {
        text: '#1E293B',
        secondary: '#64748B',
        border: '#E2E8F0',
        targetFill: 'rgba(99, 102, 241, 0.02)',
        targetStroke: '#E2E8F0',
        hint: '#94A3B8',
        activeZone: 'rgba(99, 102, 241, 0.05)',
        activeStroke: '#6366F1',
        accent: '#6366F1',
        success: '#10B981',
        error: '#EF4444'
    },
    FONTS: {
        main: 'Inter, "Noto Sans KR", sans-serif',
        chinese: '"Noto Sans SC", "Noto Sans KR", serif'
    }
};

// STAGES data is now loaded from stages.js

const WRITING_PAD_CONFIG = { x: 240, y: 640, width: 800, height: 280 };

// Global State
let canvas;
let currentStageIndex = 0;
let currentStrokes = [];
let activeSlotIndex = 0;
let lastTimer = null, hintTimers = [];
let isMoving = false;
let audioPlayCount = 0;
let activeZoneRect = null;
let expansionFactor = 1.2;
let dropTargets = [];
let targetRects = [];
let blinkInterval = null;
let recognition = null;
let isRecording = false;
let hasListened = false;

const ui = {
    prev: null, next: null, indicator: null,
    done: null, reset: null,
    scalePanel: null, scaleSelect: null,
    dragPanel: null, pinyinSlider: null, pinyinVal: null,
    hanjaSlider: null, hanjaVal: null,
    // Cheat System
    cheatBtn: null, cheatPanel: null, cheatTableBody: null, cursorCoords: null, cheatSaveBtn: null,
    // Level Nav
    levelNav: null
};

let isCheatMode = false;
let cheatBoxes = [];


// --- Initialization ---

window.onload = () => {
    initUI();
    initCanvas();
    loadStage(0);
};

function initUI() {
    ui.prev = document.getElementById('btn-prev');
    ui.next = document.getElementById('btn-next');
    ui.indicator = document.getElementById('stage-indicator');
    ui.done = document.getElementById('done-btn');
    ui.reset = document.getElementById('reset-btn');
    ui.scalePanel = document.getElementById('scale-control');
    ui.scaleSelect = document.getElementById('zone-scale');
    ui.dragPanel = document.getElementById('drag-controls');
    ui.pinyinSlider = document.getElementById('pinyin-slider');
    ui.pinyinVal = document.getElementById('pinyin-val');
    ui.hanjaSlider = document.getElementById('hanja-slider');
    ui.hanjaVal = document.getElementById('hanja-val');
    ui.levelNav = document.getElementById('level-nav-sidebar');

    ui.prev.addEventListener('click', () => loadStage(currentStageIndex - 1));
    ui.next.addEventListener('click', () => loadStage(currentStageIndex + 1));
    ui.reset.addEventListener('click', () => loadStage(currentStageIndex));

    ui.scaleSelect.addEventListener('change', (e) => {
        expansionFactor = parseFloat(e.target.value);
        updateActiveZoneVisual();
    });

    if (ui.pinyinSlider) {
        ui.pinyinSlider.addEventListener('input', (e) => {
            ui.pinyinVal.textContent = e.target.value;
            refreshDragDisplay();
        });
    }
    if (ui.hanjaSlider) {
        ui.hanjaSlider.addEventListener('input', (e) => {
            ui.hanjaVal.textContent = e.target.value;
            refreshDragDisplay();
        });
    }

    initCheatSystem();
    initLevelNav();
}

function initLevelNav() {
    if (!ui.levelNav) return;
    ui.levelNav.innerHTML = '';
    STAGES.forEach((stage, index) => {
        const btn = document.createElement('div');
        btn.className = 'level-nav-item';
        btn.textContent = index + 1;
        btn.dataset.index = index;
        btn.addEventListener('click', () => loadStage(index));
        ui.levelNav.appendChild(btn);
    });
}

function updateLevelNavVisual() {
    if (!ui.levelNav) return;
    const items = ui.levelNav.querySelectorAll('.level-nav-item');
    items.forEach((item, idx) => {
        item.classList.toggle('active', idx === currentStageIndex);
    });
}


function initCanvas() {
    canvas = new fabric.Canvas('c', {
        width: CONFIG.CANVAS_WIDTH,
        height: CONFIG.CANVAS_HEIGHT,
        selection: false,
        isDrawingMode: true,
        retinaScaling: true,
        preserveObjectStacking: true
    });

    const brush = new fabric.PencilBrush(canvas);
    brush.color = CONFIG.COLORS.text;
    brush.width = 8;
    canvas.freeDrawingBrush = brush;

    // Events
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('path:created', handlePathCreated);
}

// --- Core Logic ---

function loadStage(index) {
    if (index < 0 || index >= STAGES.length) return;
    currentStageIndex = index;

    // Cleanup
    cleanupTimers();
    canvas.clear();
    canvas.isDrawingMode = false;
    isMoving = false;
    currentStrokes = [];
    activeSlotIndex = 0;
    dropTargets = [];
    audioPlayCount = 0;
    activeZoneRect = null;

    const stage = STAGES[index];
    ui.indicator.textContent = stage.title;
    ui.prev.disabled = index === 0;
    ui.next.disabled = index === STAGES.length - 1;

    // Panels
    ui.scalePanel.classList.toggle('hidden', stage.inputType !== 'direct');
    ui.dragPanel.classList.toggle('hidden', stage.inputType !== 'drag' || stage.type === 'alphabet_drag');

    // Rendering Background
    renderBackground(stage, () => {
        if (stage.type === 'speech_recognition') {
            renderSpeechStage(stage);
        } else if (stage.type === 'alphabet_drag') {
            renderAlphabetStage(stage);
        } else if (stage.inputType === 'drag') {
            renderDragStage(stage);
        } else {
            canvas.isDrawingMode = true;
            renderWritingStage(stage);
            if (stage.hintText) showHints(stage);
            if (stage.inputType === 'direct') updateActiveZoneVisual();
            if (stage.type === 'blink_pad') updateBlinkingHighlight();
        }

        // Cheat System Refresh
        if (typeof isCheatMode !== 'undefined' && isCheatMode) {
            refreshCheatTable();
            createCheatStageVisuals();
        }

        updateLevelNavVisual();
    });
}



function renderBackground(stage, callback) {
    if (!stage || !stage.bgImage) {
        canvas.setBackgroundImage(null, () => {
            canvas.renderAll();
            if (callback) callback();
        });
        return;
    }

    const cleanPath = stage.bgImage.trim();
    // Add cache buster to the image URL as well
    const imgUrl = cleanPath + (cleanPath.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
    const scale = stage.bgScale || 1.0;

    console.log("Attempting to load background:", imgUrl);

    fabric.Image.fromURL(imgUrl, (img, isError) => {
        if (isError || !img) {
            console.error("Critical: Failed to load background image:", imgUrl);
            // Fallback: try without cache buster if that failed
            if (imgUrl.includes('?t=')) {
                fabric.Image.fromURL(cleanPath, (img2) => {
                    if (img2) setBg(img2);
                    else if (callback) callback();
                });
            } else if (callback) callback();
            return;
        }

        setBg(img);
    });

    function setBg(img) {
        img.set({
            originX: 'center',
            originY: 'center',
            left: CONFIG.CANVAS_WIDTH / 2,
            top: CONFIG.CANVAS_HEIGHT / 2,
            selectable: false,
            evented: false
        });
        img.scale(scale);

        canvas.setBackgroundImage(img, () => {
            canvas.renderAll();
            console.log("Background applied successfully");
            if (callback) callback();
        });
    }
}


function cleanupTimers() {
    if (lastTimer) clearTimeout(lastTimer);
    if (blinkInterval) {
        clearInterval(blinkInterval);
        blinkInterval = null;
    }
    hintTimers.forEach(t => clearTimeout(t));
    hintTimers = [];
}

function renderWritingStage(stage) {
    if (!stage.targets) return;
    const centerY = stage.targets[0].y + stage.targets[0].height / 2;

    if (stage.inputType === 'pad') {
        const padBase = new fabric.Rect({
            left: WRITING_PAD_CONFIG.x, top: WRITING_PAD_CONFIG.y,
            width: WRITING_PAD_CONFIG.width, height: WRITING_PAD_CONFIG.height,
            fill: stage.padColor || '#F8FAFC',
            opacity: stage.padOpacity !== undefined ? parseFloat(stage.padOpacity) : 1.0,
            stroke: CONFIG.COLORS.border, strokeWidth: 2, rx: 24, ry: 24,
            selectable: false, name: 'writing-pad'
        });

        const closeBtn = new fabric.Group([
            new fabric.Circle({ radius: 18, fill: '#94A3B8', originX: 'center', originY: 'center' }),
            new fabric.Text('×', { fontSize: 24, fill: 'white', fontWeight: 900, originX: 'center', originY: 'center', top: -2 })
        ], {
            left: WRITING_PAD_CONFIG.x + WRITING_PAD_CONFIG.width - 30,
            top: WRITING_PAD_CONFIG.y + 30,
            originX: 'center',
            originY: 'center',
            hoverCursor: 'pointer',
            name: 'close-pad-btn',
            selectable: false,
            evented: true
        });

        canvas.add(padBase);
        canvas.add(closeBtn);

        closeBtn.on('mousedown', (o) => {
            padBase.set('visible', false);
            closeBtn.set('visible', false);
            canvas.isDrawingMode = false;
            canvas.renderAll();
            if (o.e) o.e.stopPropagation();
        });
    }

    targetRects = [];
    stage.targets.forEach((t, i) => {
        const rect = new fabric.Rect({
            left: t.x, top: t.y, width: t.width, height: t.height,
            fill: CONFIG.COLORS.targetFill, stroke: CONFIG.COLORS.targetStroke, strokeWidth: 2, rx: 20, ry: 20,
            selectable: false, evented: true, name: `target-rect-${i}`
        });

        // Target Index Number
        const indexText = new fabric.Text((i + 1).toString(), {
            left: t.x + 10, top: t.y + 10,
            fontSize: 18, fontWeight: 800, fill: '#CBD5E1',
            selectable: false, evented: false
        });

        canvas.add(rect);
        canvas.add(indexText);
        targetRects.push(rect);
    });

    const fontSize = 64;
    canvas.add(new fabric.Text(stage.sentence.pre, {
        left: stage.targets[0].x - 60, top: centerY, fontSize: fontSize, fontFamily: CONFIG.FONTS.main, fontWeight: 800, fill: CONFIG.COLORS.text, originX: 'right', originY: 'center', selectable: false
    }));
    const lastT = stage.targets[stage.targets.length - 1];
    canvas.add(new fabric.Text(stage.sentence.post, {
        left: lastT.x + lastT.width + 60, top: centerY, fontSize: fontSize, fontFamily: CONFIG.FONTS.main, fontWeight: 800, fill: CONFIG.COLORS.text, originX: 'left', originY: 'center', selectable: false
    }));
}

function addSpeakerButton(stage) {
    const x = stage.targets[0].x - 120;
    const y = stage.sentence.y - 70; // Move it above the text

    // Standard simplicity speaker icon
    const icon = new fabric.Path('M5 13V11C5 10.4477 5.44772 10 6 10H10L14 6V18L10 14H6C5.44772 14 5 13.5523 5 13ZM18 12C18 10.3431 16.6569 9 15 9V15C16.6569 15 18 13.6569 18 12Z', {
        fill: CONFIG.COLORS.accent,
        scaleX: 1.8,
        scaleY: 1.8,
        originX: 'center',
        originY: 'center'
    });

    const speaker = new fabric.Group([icon], {
        left: x, top: y,
        selectable: false,
        hoverCursor: 'pointer',
        name: 'speaker-btn'
    });
    canvas.add(speaker);

    speaker.on('mousedown', () => {
        if (audioPlayCount < stage.maxAudioPlays) {
            audioPlayCount++;
            playTTS(stage.audioWord);

            // Animation
            speaker.animate('scaleX', 0.8, { duration: 100, onComplete: () => speaker.animate('scaleX', 1, { duration: 100 }) });
            speaker.animate('scaleY', 0.8, { duration: 100, onComplete: () => speaker.animate('scaleY', 1, { duration: 100 }) });

            if (audioPlayCount >= stage.maxAudioPlays && stage.maxAudioPlays) {
                icon.set('fill', '#94A3B8');
                speaker.set('opacity', 0.5);
                speaker.set('hoverCursor', 'default');
            }

            if (stage.type === 'speech_recognition') {
                hasListened = true;
                const micBtn = canvas.getObjects().find(o => o.name === 'mic-btn');
                if (micBtn) {
                    micBtn.set({
                        opacity: 1,
                        hoverCursor: 'pointer',
                        evented: true
                    });
                    // Highlight effect
                    micBtn.item(0).set('stroke', CONFIG.COLORS.accent);
                    micBtn.item(0).set('strokeWidth', 4);
                    canvas.renderAll();
                }
            }
            canvas.renderAll();
        }
    });
}

function playTTS(text, lang = 'zh-CN') {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = lang;
    msg.rate = 0.85;
    window.speechSynthesis.speak(msg);
}

function renderDragStage(stage) {
    const centerX = 640;
    const tokenWidth = 180;
    const startX = centerX - ((stage.tokens.length - 1) * tokenWidth) / 2;
    const pSize = parseInt(ui.pinyinSlider.value);
    const hSize = parseInt(ui.hanjaSlider.value);

    if (stage.subText) {
        canvas.add(new fabric.Text(stage.subText, {
            left: centerX, top: 750, fontSize: 36, fill: CONFIG.COLORS.secondary, fontFamily: CONFIG.FONTS.main, fontWeight: 500, originX: 'center', selectable: false
        }));
    }

    stage.tokens.forEach((token, i) => {
        const x = startX + i * tokenWidth;
        const yBase = 520;

        // Hanja
        canvas.add(new fabric.Text(token.char, {
            left: x, top: yBase, fontSize: hSize, fontFamily: CONFIG.FONTS.chinese, originX: 'center', originY: 'center', selectable: false
        }));

        // Pinyin Slot or Text
        if (!token.fixed) {
            const slot = new fabric.Rect({
                left: x, top: yBase - 120, width: 140, height: 80,
                fill: 'rgba(99, 102, 241, 0.05)', stroke: CONFIG.COLORS.accent,
                strokeWidth: 2, strokeDashArray: [8, 4], rx: 12, ry: 12, originX: 'center', originY: 'center', selectable: false
            });

            // Slot Index Number
            const slotIndex = dropTargets.length + 1;
            const indexText = new fabric.Text(slotIndex.toString(), {
                left: x - 60, top: yBase - 150,
                fontSize: 16, fontWeight: 800, fill: CONFIG.COLORS.accent,
                selectable: false, evented: false
            });

            canvas.add(slot);
            canvas.add(indexText);
            dropTargets.push({ x: x, y: yBase - 120, char: token.pinyin, visualSlot: slot });
        } else {
            canvas.add(new fabric.Text(token.pinyin, {
                left: x, top: yBase - 120, fontSize: pSize, fill: CONFIG.COLORS.accent, fontWeight: 700, originX: 'center', originY: 'center', selectable: false
            }));
        }
    });

    stage.sourceItems.forEach((item, i) => {
        const sx = centerX - ((stage.sourceItems.length - 1) * 200) / 2 + i * 200;
        const g = createDraggableTile(item, sx, 250);
        canvas.add(g);
    });
}

function createDraggableTile(text, x, y) {
    const rect = new fabric.Rect({
        width: 160, height: 80, fill: '#FFF', stroke: CONFIG.COLORS.border,
        strokeWidth: 2, rx: 16, ry: 16, originX: 'center', originY: 'center',
        shadow: '0 4px 12px rgba(0,0,0,0.08)'
    });
    const label = new fabric.Text(text, {
        fontSize: 32, fontWeight: 700, fontFamily: CONFIG.FONTS.main, originX: 'center', originY: 'center'
    });
    const g = new fabric.Group([rect, label], {
        left: x, top: y, originX: 'center', originY: 'center',
        hasControls: false, hasBorders: false, data: text
    });
    g.originalPos = { x: x, y: y };

    g.on('mouseover', () => { rect.set('stroke', CONFIG.COLORS.accent); canvas.renderAll(); });
    g.on('mouseout', () => { rect.set('stroke', CONFIG.COLORS.border); canvas.renderAll(); });

    return g;
}

function renderAlphabetStage(stage) {
    // Feedback Sprites
    if (stage.feedback) {
        fabric.Image.fromURL(stage.feedback.boy, (img) => {
            img.set({ left: 150, top: 820, opacity: 0, name: 'feedback-boy', originX: 'center', originY: 'center' });
            img.scale(1.4); canvas.add(img);
        });
        fabric.Image.fromURL(stage.feedback.girl, (img) => {
            img.set({ left: 1130, top: 820, opacity: 0, name: 'feedback-girl', originX: 'center', originY: 'center' });
            img.scale(1.4); canvas.add(img);
        });
    }

    stage.targets.forEach(t => {
        if (t.fixed) {
            const g = createStaticAlphabetTile(t.char, t.x, t.y);
            canvas.add(g);
        } else {
            const rs = new fabric.Rect({
                left: t.x, top: t.y, width: 90, height: 90, fill: 'rgba(255,255,255,0.2)',
                stroke: '#FFF', strokeWidth: 3, strokeDashArray: [10, 5], rx: 15, ry: 15, originX: 'center', originY: 'center', selectable: false
            });

            // Slot Index Number
            const slotIndex = dropTargets.length + 1;
            const indexText = new fabric.Text(slotIndex.toString(), {
                left: t.x - 35, top: t.y - 35,
                fontSize: 16, fontWeight: 800, fill: '#FFF',
                selectable: false, evented: false
            });

            canvas.add(rs);
            canvas.add(indexText);
            dropTargets.push({ x: t.x, y: t.y, char: t.char, visualSlot: rs });
        }
    });

    stage.sourceItems.forEach(item => {
        const g = createDraggableAlphabetTile(item.char, item.x, item.y);
        canvas.add(g);
    });
    canvas.renderAll();
}

function createStaticAlphabetTile(char, x, y) {
    const rect = new fabric.Rect({ width: 90, height: 90, fill: 'rgba(255,255,255,0.8)', rx: 15, ry: 15, originX: 'center', originY: 'center' });
    const text = new fabric.Text(char, { fontSize: 54, fontWeight: 900, fill: '#1E293B', originX: 'center', originY: 'center' });
    return new fabric.Group([rect, text], { left: x, top: y, originX: 'center', originY: 'center', selectable: false });
}

function createDraggableAlphabetTile(char, x, y) {
    const rect = new fabric.Rect({
        width: 100, height: 100, fill: '#FFF', stroke: '#3B82F6',
        strokeWidth: 3, rx: 20, ry: 20, originX: 'center', originY: 'center',
        shadow: '0 8px 16px rgba(0,0,0,0.1)'
    });
    const text = new fabric.Text(char, { fontSize: 60, fontWeight: 900, fill: '#3B82F6', originX: 'center', originY: 'center' });
    const g = new fabric.Group([rect, text], {
        left: x, top: y, originX: 'center', originY: 'center',
        hasControls: false, hasBorders: false, data: char
    });
    g.originalPos = { x: x, y: y };
    return g;
}

// --- Interaction Handlers ---

function handleMouseDown(o) {
    if (isCheatMode) return;
    if (currentStageIndex >= STAGES.length || STAGES[currentStageIndex].inputType === 'drag' || isMoving) return;

    // Check if clicked on speaker or close button
    if (o.target && (o.target.name === 'speaker-btn' || o.target.name === 'close-pad-btn')) return;

    const p = canvas.getPointer(o.e);
    const stage = STAGES[currentStageIndex];
    let canDraw = false;

    if (stage.inputType === 'pad') {
        const padBase = canvas.getObjects().find(obj => obj.name === 'writing-pad');
        const closeBtn = canvas.getObjects().find(obj => obj.name === 'close-pad-btn');

        // Reopen pad if a target box is clicked
        const clickedTarget = targetRects.some(rect => rect.containsPoint(p));
        if (clickedTarget && padBase && !padBase.visible) {
            padBase.set('visible', true);
            if (closeBtn) closeBtn.set('visible', true);
            canvas.renderAll();
        }

        canDraw = padBase && padBase.visible &&
            p.x >= WRITING_PAD_CONFIG.x && p.x <= WRITING_PAD_CONFIG.x + WRITING_PAD_CONFIG.width &&
            p.y >= WRITING_PAD_CONFIG.y && p.y <= WRITING_PAD_CONFIG.y + WRITING_PAD_CONFIG.height;
    } else if (stage.inputType === 'direct' && activeSlotIndex < stage.targets.length) {
        const t = stage.targets[activeSlotIndex], w = t.width * expansionFactor, h = t.height * expansionFactor;
        canDraw = p.x >= t.x - (w - t.width) / 2 && p.x <= t.x + t.width + (w - t.width) / 2 &&
            p.y >= t.y - (h - t.height) / 2 && p.y <= t.y + t.height + (h - t.height) / 2;
    }

    if (canDraw) {
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = CONFIG.COLORS.text;
    } else {
        canvas.freeDrawingBrush.color = 'transparent';
        // Invalidate current drawing gesture completely
        canvas.isDrawingMode = false;
        setTimeout(() => { if (!isMoving) canvas.isDrawingMode = true; }, 10);
    }
}

function handleMouseUp() {
    const obj = canvas.getActiveObject();
    if (!obj || STAGES[currentStageIndex].inputType !== 'drag') return;

    let snapped = false;
    for (let t of dropTargets) {
        if (Math.abs(obj.left - t.x) < 70 && Math.abs(obj.top - t.y) < 70) {
            if (STAGES[currentStageIndex].type === 'alphabet_drag' && obj.data !== t.char) {
                showFeedback('wrong');
            } else {
                obj.animate({ left: t.x, top: t.y }, {
                    duration: 300, easing: fabric.util.ease.easeOutQuint,
                    onChange: canvas.renderAll.bind(canvas),
                    onComplete: () => {
                        if (STAGES[currentStageIndex].type === 'alphabet_drag') {
                            showFeedback('correct');
                            obj.set('selectable', false);
                        } else {
                            t.visualSlot.set('opacity', 0);
                        }
                        canvas.renderAll();
                    }
                });
                snapped = true;
            }
            break;
        }
    }
    if (!snapped) {
        obj.animate({ left: obj.originalPos.x, top: obj.originalPos.y }, {
            duration: 500, easing: fabric.util.ease.easeOutBack,
            onChange: canvas.renderAll.bind(canvas)
        });
    }
}

function handlePathCreated(e) {
    if (isMoving || canvas.freeDrawingBrush.color === 'transparent') {
        canvas.remove(e.path);
        return;
    }
    currentStrokes.push(e.path);
    if (lastTimer) clearTimeout(lastTimer);
    lastTimer = setTimeout(performAutoPlacement, CONFIG.IDLE_TIMEOUT);
}

function performAutoPlacement() {
    if (currentStrokes.length === 0 || isMoving) return;
    isMoving = true;
    canvas.isDrawingMode = false;

    const stage = STAGES[currentStageIndex];
    if (activeSlotIndex >= stage.targets.length) return;

    const target = stage.targets[activeSlotIndex];
    const group = new fabric.Group(currentStrokes, { originX: 'center', originY: 'center', selectable: false });

    // Calculate dynamic scale to fit snugly in the box
    const scale = Math.min(
        (target.width * 0.8) / group.width,
        (target.height * 0.8) / group.height
    );

    currentStrokes.forEach(s => canvas.remove(s));
    canvas.add(group);

    activeSlotIndex++;

    group.animate({
        left: target.x + target.width / 2,
        top: target.y + target.height / 2,
        scaleX: scale, scaleY: scale
    }, {
        duration: CONFIG.ANIMATION_DURATION,
        easing: fabric.util.ease.easeInOutQuart,
        onChange: canvas.renderAll.bind(canvas),
        onComplete: () => {
            isMoving = false;
            canvas.isDrawingMode = true;
            currentStrokes = [];
            if (stage.inputType === 'direct') updateActiveZoneVisual();
            if (stage.type === 'blink_pad') updateBlinkingHighlight();
        }
    });
}

function updateBlinkingHighlight() {
    const stage = STAGES[currentStageIndex];
    if (blinkInterval) {
        clearInterval(blinkInterval);
        blinkInterval = null;
    }

    targetRects.forEach(rect => {
        rect.set({ stroke: CONFIG.COLORS.targetStroke, strokeWidth: 2 });
    });

    if (stage.type !== 'blink_pad' || activeSlotIndex >= targetRects.length) {
        canvas.renderAll();
        return;
    }

    const targetRect = targetRects[activeSlotIndex];
    let isHighlighted = false;

    blinkInterval = setInterval(() => {
        isHighlighted = !isHighlighted;
        targetRect.set({
            stroke: isHighlighted ? CONFIG.COLORS.accent : CONFIG.COLORS.targetStroke,
            strokeWidth: isHighlighted ? 4 : 2
        });
        canvas.renderAll();
    }, 500);
}

function updateActiveZoneVisual() {
    const stage = STAGES[currentStageIndex];
    if (stage.inputType !== 'direct' || activeSlotIndex >= stage.targets.length) {
        if (activeZoneRect) canvas.remove(activeZoneRect);
        return;
    }
    if (activeZoneRect) canvas.remove(activeZoneRect);

    const t = stage.targets[activeSlotIndex];
    const w = t.width * expansionFactor, h = t.height * expansionFactor;

    activeZoneRect = new fabric.Rect({
        left: t.x - (w - t.width) / 2, top: t.y - (h - t.height) / 2, width: w, height: h,
        fill: CONFIG.COLORS.activeZone, stroke: CONFIG.COLORS.activeStroke, strokeWidth: 2.5,
        strokeDashArray: [10, 5], rx: 24, ry: 24, selectable: false
    });
    canvas.add(activeZoneRect);
    activeZoneRect.sendToBack();
}

function showHints(stage) {
    stage.targets.forEach((t, i) => {
        const txt = new fabric.Text(stage.hintText[i], {
            left: t.x + t.width / 2, top: t.y + t.height / 2,
            fontSize: 72, fill: CONFIG.COLORS.hint, opacity: 0.3,
            fontFamily: CONFIG.FONTS.chinese, originX: 'center', originY: 'center', selectable: false
        });
        canvas.add(txt);
        const timer = setTimeout(() => {
            txt.animate('opacity', 0, {
                duration: 800,
                onComplete: () => canvas.remove(txt),
                onChange: canvas.renderAll.bind(canvas)
            });
        }, CONFIG.HINT_DURATION);
        hintTimers.push(timer);
    });
}

// --- Effects & Feedback ---

function showFeedback(type) {
    const boy = canvas.getObjects().find(o => o.name === 'feedback-boy');
    const girl = canvas.getObjects().find(o => o.name === 'feedback-girl');

    if (type === 'correct') {
        createFireworks(640, 400);
        playEffectSound(600);
        if (boy) {
            boy.set('opacity', 1);
            boy.animate({ top: 700, angle: 360 }, {
                duration: 700, easing: fabric.util.ease.easeOutBack,
                onComplete: () => {
                    setTimeout(() => {
                        boy.animate({ top: 820, opacity: 0, angle: 0 }, { duration: 600 });
                    }, 1200);
                }
            });
        }
    } else if (type === 'wrong') {
        playEffectSound(200);
        if (girl) {
            girl.set('opacity', 1);
            const originalX = girl.left;
            girl.animate('left', originalX - 40, {
                duration: 80, onComplete: () => {
                    girl.animate('left', originalX + 40, {
                        duration: 80, onComplete: () => {
                            girl.animate('left', originalX, { duration: 80 });
                        }
                    });
                }
            });
            setTimeout(() => girl.animate('opacity', 0, { duration: 600 }), 1500);
        }
    }
    canvas.renderAll();
}

function createFireworks(x, y) {
    const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
    for (let i = 0; i < 40; i++) {
        const p = new fabric.Circle({
            left: x, top: y, radius: Math.random() * 5 + 3,
            fill: colors[Math.floor(Math.random() * colors.length)],
            selectable: false, evented: false, opacity: 1
        });
        canvas.add(p);
        const angle = Math.random() * Math.PI * 2, dist = 150 + Math.random() * 350;
        p.animate({
            left: x + Math.cos(angle) * dist,
            top: y + Math.sin(angle) * dist,
            opacity: 0, scaleX: 0.1, scaleY: 0.1
        }, {
            duration: 1200 + Math.random() * 800,
            easing: fabric.util.ease.easeOutExpo,
            onComplete: () => canvas.remove(p)
        });
    }
}

function playEffectSound(freq) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
}

function renderSpeechStage(stage) {
    const centerX = 640;
    const centerY = 450;

    hasListened = false;

    // 1. Speaker Button (Top)
    fabric.Image.fromURL('images/구몬 버튼(png)/듣기1.png', (img) => {
        img.set({
            left: centerX, top: centerY - 250,
            originX: 'center', originY: 'center',
            selectable: false, hoverCursor: 'pointer',
            name: 'speaker-btn'
        });
        img.scale(1.5);
        canvas.add(img);

        img.on('mousedown', () => {
            playTTS(stage.text, stage.lang);
            img.animate('scaleX', 1.3, { duration: 100, onComplete: () => img.animate('scaleX', 1.5, { duration: 100 }) });

            hasListened = true;
            const micBtn = canvas.getObjects().find(o => o.name === 'mic-btn');
            if (micBtn) {
                micBtn.set({ opacity: 1, evented: true, hoverCursor: 'pointer' });
                const ring = micBtn.item(0);
                ring.set('stroke', CONFIG.COLORS.accent);
                ring.set('strokeWidth', 3);
                canvas.renderAll();
            }
        });
    });

    // 2. Display Sentence (Middle)
    const mainText = new fabric.Text(stage.text, {
        left: centerX, top: centerY, fontSize: 130, fontFamily: CONFIG.FONTS.chinese, fontWeight: 900, fill: CONFIG.COLORS.text, originX: 'center', originY: 'center', selectable: false, name: 'target-text'
    });
    canvas.add(mainText);

    const subText = new fabric.Text(stage.subText, {
        left: centerX, top: centerY + 100, fontSize: 44, fontFamily: CONFIG.FONTS.main, fontWeight: 700, fill: CONFIG.COLORS.accent, originX: 'center', originY: 'center', selectable: false
    });
    canvas.add(subText);

    const meaningText = new fabric.Text(`"${stage.meaning}"`, {
        left: centerX, top: centerY + 170, fontSize: 34, fontFamily: CONFIG.FONTS.main, fontWeight: 500, fill: CONFIG.COLORS.secondary, originX: 'center', originY: 'center', selectable: false
    });
    canvas.add(meaningText);

    // 3. Mic Button (Bottom)
    const micRing = new fabric.Circle({
        radius: 70, fill: 'white', stroke: '#CBD5E1', strokeWidth: 2, originX: 'center', originY: 'center'
    });

    // Pulse ring for animation
    const pulseRing = new fabric.Circle({
        radius: 70, fill: 'rgba(99, 102, 241, 0.15)', originX: 'center', originY: 'center', opacity: 0, selectable: false, evented: false
    });

    fabric.Image.fromURL('images/구몬 버튼(png)/Btn_Recording1_Default1.png', (micImg) => {
        micImg.set({ originX: 'center', originY: 'center', selectable: false });
        micImg.scale(1.2);

        const micBtn = new fabric.Group([micRing, micImg, pulseRing], {
            left: centerX, top: centerY + 340, originX: 'center', originY: 'center', selectable: false, opacity: 0.4, evented: false, name: 'mic-btn'
        });
        canvas.add(micBtn);

        micBtn.on('mousedown', () => {
            if (!hasListened) {
                alert("먼저 위의 '듣기' 버튼을 눌러 정답을 들어보세요!");
                // Highlight speaker
                const speaker = canvas.getObjects().find(o => o.name === 'speaker-btn');
                if (speaker) {
                    speaker.animate('scaleX', 1.2, { duration: 200, onComplete: () => speaker.animate('scaleX', 1, { duration: 100 }) });
                }
                return;
            }
            if (!isRecording) {
                startRecording(micBtn, pulseRing, stage);
            } else {
                stopRecording();
            }
        });
    });

    // Pre-load boy animation sprite
    fabric.Image.fromURL('images/boy-1.png', (img) => {
        img.set({ left: 1100, top: 800, opacity: 0, name: 'feedback-boy-speech', originX: 'center', originY: 'center' });
        img.scale(1.5);
        canvas.add(img);
    });
}

function startRecording(micBtn, pulseRing, stage) {
    isRecording = true;
    micBtn.item(0).set('stroke', CONFIG.COLORS.error); // Red ring when recording
    micBtn.item(0).set('strokeWidth', 3);

    // Animation
    pulseRing.set('opacity', 1);
    const animatePulse = () => {
        if (!isRecording) return;
        pulseRing.set({ scaleX: 1, scaleY: 1, opacity: 0.6 });
        pulseRing.animate({ scaleX: 1.8, scaleY: 1.8, opacity: 0 }, {
            duration: 1000,
            onChange: canvas.renderAll.bind(canvas),
            onComplete: animatePulse
        });
    };
    animatePulse();

    // Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Speech Recognition not supported in this browser.");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = stage.lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
        const result = event.results[0][0].transcript;
        console.log("Recognized:", result);
        evaluateSpeech(result, stage.text);
    };

    recognition.onend = () => {
        if (isRecording) stopRecording();
    };

    recognition.onerror = (event) => {
        console.error("Recognition Error:", event.error, event);

        let msg = "음성 인식 중 오류가 발생했습니다.";
        if (event.error === 'not-allowed') {
            msg = "마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해 주세요.";
        } else if (event.error === 'network') {
            msg = "네트워크 연결 확인이 필요하거나, 현재 환경에서 음성 인식을 지원하지 않습니다.";
        } else if (window.location.protocol === 'file:') {
            msg = "로컬 파일(file://) 환경에서는 보안상 음성 인식이 제한될 수 있습니다. 서버 환경에서 실행해 주세요.";
        }

        alert(msg);
        stopRecording();
    };

    recognition.start();
}

function stopRecording() {
    isRecording = false;
    const micBtn = canvas.getObjects().find(o => o.name === 'mic-btn');
    if (micBtn) {
        micBtn.item(0).set('stroke', CONFIG.COLORS.accent); // Back to blue/accent
        micBtn.item(0).set('strokeWidth', 2);
        micBtn.set('opacity', 1); // Keep it visible for retry
        micBtn.set('evented', true); // Keep it enabled for retry
        const pulse = micBtn.item(2);
        pulse.set('opacity', 0);
    }
    if (recognition) recognition.stop();
    canvas.renderAll();
}

function evaluateSpeech(recognized, target) {
    console.log("Evaluating - Recognized:", recognized, "Target:", target);

    // Basic cleanup of recognized text (remove punctuation and spaces)
    const cleanR = recognized.replace(/\s|[.,\/#!$%\^&\*;:{}=\-_`~()？?！!]/g, "").toLowerCase();
    const cleanT = target.replace(/\s|[.,\/#!$%\^&\*;:{}=\-_`~()？?！!]/g, "").toLowerCase();

    console.log("Cleaned - Recognized:", cleanR, "Target:", cleanT);

    const targetChars = cleanT.split("");
    const recognizedChars = cleanR.split("");

    const centerX = 640;
    const centerY = 450;

    // Remove original text and ANY previous re-rendered chars
    canvas.getObjects().forEach(o => {
        if (o.name === 'target-text' || o.name === 'eval-char') {
            canvas.remove(o);
        }
    });

    const charWidth = 130;
    const totalW = targetChars.length * charWidth;
    const startX = centerX - totalW / 2 + charWidth / 2;

    targetChars.forEach((char, i) => {
        // Find if this character exists in the recognized string
        const isCorrect = recognizedChars.includes(char);
        const color = isCorrect ? CONFIG.COLORS.success : CONFIG.COLORS.error;

        const t = new fabric.Text(char, {
            left: startX + i * charWidth,
            top: centerY,
            fontSize: 130,
            fontFamily: CONFIG.FONTS.chinese,
            fontWeight: 900,
            fill: color,
            originX: 'center',
            originY: 'center',
            selectable: false,
            name: 'eval-char'
        });
        canvas.add(t);

        t.animate('scaleX', 1.1, {
            duration: 200,
            onComplete: () => t.animate('scaleX', 1, { duration: 200 })
        });
    });

    if (cleanR === cleanT) {
        createFireworks(640, 450);
        playEffectSound(600);
        showSpeechFeedback('correct');
    } else {
        playEffectSound(300);
        // Add a small visual hint or console message to help debugging
        console.log("Speech mismatch. If it sounds correct, check for subtle encoding or character differences.");
    }

    canvas.renderAll();
}

function showSpeechFeedback(type) {
    if (type === 'correct') {
        const boy = canvas.getObjects().find(o => o.name === 'feedback-boy-speech');
        if (boy) {
            boy.set('opacity', 1);
            boy.animate({ top: 680 }, {
                duration: 600, easing: fabric.util.ease.easeOutBack,
                onComplete: () => {
                    setTimeout(() => boy.animate({ top: 800, opacity: 0 }, { duration: 600 }), 2000);
                }
            });
        }
    }
}

function refreshDragDisplay() {
    const stage = STAGES[currentStageIndex];
    if (stage.inputType === 'drag' && stage.type !== 'alphabet_drag') {
        canvas.clear();
        renderDragStage(stage);
    }
}
// --- Cheat System Logic ---

function initCheatSystem() {
    ui.cheatBtn = document.getElementById('cheat-btn');
    ui.cheatPanel = document.getElementById('cheat-panel');
    ui.cheatTableBody = document.getElementById('cheat-table-body');
    ui.cursorCoords = document.getElementById('cursor-coords');
    ui.cheatSaveBtn = document.getElementById('cheat-save-btn');

    if (!ui.cheatBtn) return;

    ui.cheatBtn.addEventListener('click', toggleCheatMode);
    ui.cheatSaveBtn.addEventListener('click', saveCheatData);

    // Track mouse for coordinates
    window.addEventListener('mousemove', (e) => {
        if (!isCheatMode) return;
        const p = canvas.getPointer(e);
        ui.cursorCoords.textContent = `(${Math.round(p.x)}, ${Math.round(p.y)})`;
    });
}

function toggleCheatMode() {
    isCheatMode = !isCheatMode;
    ui.cheatPanel.classList.toggle('hidden', !isCheatMode);
    ui.cheatBtn.style.background = isCheatMode ? '#CBD5E1' : '#E2E8F0';

    // Canvas settings for Cheat Mode
    canvas.selection = isCheatMode;
    canvas.isDrawingMode = !isCheatMode;
    canvas.defaultCursor = isCheatMode ? 'default' : 'crosshair';

    // Decouple objects from drawing mode interaction
    canvas.forEachObject(obj => {
        if (obj.name && obj.name.startsWith('cheat-box-')) {
            obj.set({ selectable: isCheatMode, evented: isCheatMode });
        }
    });

    if (isCheatMode) {
        refreshCheatTable();
        createCheatStageVisuals();
    } else {
        clearCheatVisuals();
    }
    canvas.renderAll();
}

function refreshCheatTable() {
    const stage = STAGES[currentStageIndex];
    if (!stage.targets) {
        ui.cheatTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; opacity:0.5;">No targets for this stage</td></tr>';
        return;
    }

    ui.cheatTableBody.innerHTML = '';
    stage.targets.forEach((t, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="text-align:center; font-weight:800; color:var(--primary);">${i + 1}</td>
            <td><input type="number" value="${Math.round(t.x)}" oninput="updateCheatTarget(${i}, 'x', this.value)"></td>
            <td><input type="number" value="${Math.round(t.y)}" oninput="updateCheatTarget(${i}, 'y', this.value)"></td>
            <td><input type="number" value="${Math.round(t.width || 0)}" oninput="updateCheatTarget(${i}, 'width', this.value)"></td>
            <td><input type="number" value="${Math.round(t.height || 0)}" oninput="updateCheatTarget(${i}, 'height', this.value)"></td>
        `;
        ui.cheatTableBody.appendChild(row);
    });
}

window.updateCheatTarget = (targetIdx, key, val) => {
    const stage = STAGES[currentStageIndex];
    if (!stage.targets || !stage.targets[targetIdx]) return;

    stage.targets[targetIdx][key] = parseInt(val) || 0;

    // Update visual box
    if (cheatBoxes[targetIdx]) {
        const t = stage.targets[targetIdx];
        cheatBoxes[targetIdx].set({
            left: t.x,
            top: t.y,
            width: t.width,
            height: t.height,
            scaleX: 1,
            scaleY: 1
        });
        canvas.renderAll();
    }
};

function createCheatStageVisuals() {
    clearCheatVisuals();
    const stage = STAGES[currentStageIndex];
    if (!stage.targets) return;

    stage.targets.forEach((t, i) => {
        const rect = new fabric.Rect({
            left: t.x,
            top: t.y,
            width: t.width || 100,
            height: t.height || 100,
            fill: 'rgba(22, 163, 74, 0.15)',
            stroke: '#16A34A',
            strokeWidth: 2,
            strokeDashArray: [10, 5],
            selectable: true,
            evented: true,
            name: `cheat-box-${i}`,
            hasRotatingPoint: false,
            transparentCorners: false,
            cornerColor: '#16A34A',
            cornerSize: 10
        });

        // Cheat Box Index Number
        const text = new fabric.Text((i + 1).toString(), {
            left: t.x + 10,
            top: t.y + 10,
            fontSize: 24,
            fontWeight: 900,
            fill: '#16A34A',
            selectable: false,
            evented: false,
            name: `cheat-text-${i}`
        });

        // Update STAGES data when moving or scaling
        const updateData = () => {
            const scaledWidth = rect.width * rect.scaleX;
            const scaledHeight = rect.height * rect.scaleY;
            t.x = Math.round(rect.left);
            t.y = Math.round(rect.top);
            t.width = Math.round(scaledWidth);
            t.height = Math.round(scaledHeight);

            // Sync text position
            text.set({
                left: rect.left + 10,
                top: rect.top + 10
            });

            // Sync to table if visible
            refreshCheatTable();
            canvas.renderAll();
        };

        rect.on('moving', updateData);
        rect.on('scaling', updateData);

        canvas.add(rect);
        canvas.add(text);
        cheatBoxes.push(rect);
        cheatBoxes.push(text);
    });
    canvas.renderAll();
}

function clearCheatVisuals() {
    cheatBoxes.forEach(box => canvas.remove(box));
    cheatBoxes = [];
    canvas.renderAll();
}

async function saveCheatData() {
    const btn = ui.cheatSaveBtn;
    const originalText = btn.textContent;
    btn.textContent = 'SAVING...';
    btn.disabled = true;

    try {
        const response = await fetch('http://localhost:3000/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(STAGES)
        });

        if (response.ok) {
            btn.style.background = '#059669';
            btn.textContent = 'SAVED ✓';
            setTimeout(() => {
                btn.style.background = '#16A34A';
                btn.textContent = originalText;
                btn.disabled = false;
                toggleCheatMode(); // Close panel after save
            }, 1500);
        } else {
            throw new Error('Save failed');
        }
    } catch (err) {
        alert('서버 저장 실패! run_server.bat가 실행 중인지 확인하세요.');
        btn.textContent = 'ERROR';
        btn.style.background = '#DC2626';
        setTimeout(() => {
            btn.style.background = '#16A34A';
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);
    }
}
