const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = Math.min(window.innerWidth, 450);
canvas.height = Math.min(window.innerHeight, 800);

let currentLevel = 1;
const maxLevels = 6;
let player = { x: 60, y: 120, radius: 14, vx: 0, vy: 0, color: "#ff4757", baseColor: "#ff4757" };
let target = { x: canvas.width - 60, y: canvas.height - 120, radius: 24, color: "#2ed573" };

let currentInkType = "anti_gravity"; 
let lines = []; 
let currentLine = [];
let obstacles = [];
let particles = [];
let gameState = "menu"; 

let gravity = 0.4;
let isDrawing = false;
let shakeTime = 0;
let shakeIntensity = 0;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(frequency, type, duration) {
    initAudio();
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

function loadLevelData(lvl) {
    obstacles = [];
    lines = [];
    gravity = 0.4;
    player.x = 60; player.y = 120; player.vx = 0; player.vy = 0;
    player.radius = 14;
    player.color = player.baseColor;

    switch(lvl) {
        case 1:
            target.x = canvas.width - 60; target.y = canvas.height - 120;
            obstacles.push({ type: "moving_vertical", x: canvas.width/2 - 20, y: 250, width: 40, height: 120, speedY: 2.5, minY: 180, maxY: 500, color: "#ff9f43" });
            break;
        case 2:
            target.x = canvas.width - 60; target.y = canvas.height - 150;
            obstacles.push({ type: "moving_vertical", x: 40, y: 300, width: canvas.width - 80, height: 20, speedY: 6, minY: 200, maxY: 550, color: "#ff3333" });
            break;
        case 3:
            target.x = canvas.width/2; target.y = canvas.height - 100;
            obstacles.push({ type: "rotating_blade", x: 120, y: 320, radius: 40, angle: 0, speedRot: 0.06, color: "#ea2027" });
            obstacles.push({ type: "rotating_blade", x: canvas.width - 120, y: 480, radius: 40, angle: 1.5, speedRot: -0.06, color: "#ea2027" });
            break;
        case 4:
            target.x = 70; target.y = canvas.height - 120;
            obstacles.push({ type: "black_hole", x: canvas.width/2, y: canvas.height/2 - 50, radius: 45, pullStrength: 0.25, color: "#9c27b0" });
            obstacles.push({ type: "moving_horizontal", x: 40, y: 220, width: 100, height: 25, speedX: 3, minX: 20, maxX: canvas.width - 120, color: "#ff9f43" });
            break;
        case 5:
            target.x = canvas.width - 60; target.y = 150;
            obstacles.push({ type: "static", x: 0, y: 250, width: canvas.width - 100, height: 20, color: "#718093" });
            obstacles.push({ type: "static", x: 100, y: 450, width: canvas.width - 100, height: 20, color: "#718093" });
            obstacles.push({ type: "rotating_blade", x: canvas.width/2, y: 350, radius: 30, angle: 0, speedRot: 0.08, color: "#ea2027" });
            break;
        case 6:
            target.x = canvas.width/2; target.y = canvas.height/2;
            obstacles.push({ type: "moving_vertical", x: 20, y: 200, width: canvas.width - 40, height: 15, speedY: 7, minY: 150, maxY: 650, color: "#ff3333" });
            obstacles.push({ type: "rotating_blade", x: 70, y: 150, radius: 35, angle: 0, speedRot: 0.1, color: "#ea2027" });
            obstacles.push({ type: "rotating_blade", x: canvas.width - 70, y: canvas.height - 150, radius: 35, angle: 0, speedRot: -0.1, color: "#ea2027" });
            break;
    }
}

canvas.addEventListener("touchstart", (e) => {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (gameState !== "playing") return;
    isDrawing = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    currentLine = [{ x: touch.clientX - rect.left, y: touch.clientY - rect.top }];
    playSound(500, 'sine', 0.03);
});

canvas.addEventListener("touchmove", (e) => {
    if (!isDrawing || gameState !== "playing") return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    currentLine.push({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
});

canvas.addEventListener("touchend", () => {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentLine.length > 1) {
        lines.push({ points: [...currentLine], type: currentInkType });
    }
});
// =======================================================
//  إضافة دالات التحكم بالأزرار وربطها بمحرك اللعبة الحالي
// =======================================================

// 1. دالة اختيار المراحل (تُستدعى من أزرار المستويات)
function selectLevel(levelNumber) {
    console.log("🚀 تم اختيار المرحلة رقم: " + levelNumber);
    
    // إخفاء شاشة القائمة الرئيسية واختيار المستويات
    let menuLayer = document.getElementById("menu-layer");
    if (menuLayer) menuLayer.style.display = "none";
    
    // إظهار شاشة الواجهة العلوية أثناء اللعب
    let uiLayer = document.getElementById("ui-layer");
    if (uiLayer) uiLayer.style.display = "block";
    
    // تحديث رقم المرحلة في الواجهة
    let levelDisplay = document.getElementById("levelDisplay");
    if (levelDisplay) levelDisplay.innerHTML = "المرحلة: " + levelNumber;
    
    // إظهار شاشة اختيار الفرشاة السحرية (التي كانت مخفية)
    let inkSelector = document.getElementById("ink-selector");
    if (inkSelector) inkSelector.style.display = "block";

    // تشغيل المرحلة بناءً على نظام الـ (switch/case) الموجود في كودك فوق
    currentLevel = levelNumber; 
    gameState = "playing"; // لتفعيل شروط اللعب والرسم
    
    // إذا كان لديك دالة لإعادة تشغيل أو بناء المرحلة في الكود فوق استدعها هنا، مثل:
    // initLevel(levelNumber); 
}

// 2. دالة العودة للقائمة الرئيسية
function backToMenu() {
    console.log("↩️ العودة إلى القائمة الرئيسية");
    gameState = "menu"; // إيقاف حالة اللعب
    
    let menuLayer = document.getElementById("menu-layer");
    if (menuLayer) menuLayer.style.display = "block";
    
    let uiLayer = document.getElementById("ui-layer");
    if (uiLayer) uiLayer.style.display = "none";
    
    let inkSelector = document.getElementById("ink-selector");
    if (inkSelector) inkSelector.style.display = "none";
}

// 3. دالة زر إعادة التشغيل (Reset)
function triggerResetButton() {
    console.log("🔄 إعادة ضبط المرحلة الحالية...");
    // هنا نقوم بطلب تشغيل المرحلة الحالية من جديد لتصفير الشاشة
    if (typeof currentLevel !== 'undefined') {
        selectLevel(currentLevel);
    }
}

// 4. دالة اختيار نوع الفرشاة السحرية
function changeInk(inkType) {
    console.log("🖌️ تم تغيير نوع الفرشاة السحرية إلى: " + inkType);
    
    // تعيين نوع الحبر الحالي للمتغير المستخدم في كود الرسم الخاص بك فوق (currentInkType)
    currentInkType = inkType; 
    
    // إزالة كلاس النشاط (active) من أزرار الفرشاة لتغيير مظهر الزر المضغوط
    let inkButtons = document.querySelectorAll(".ink-btn");
    inkButtons.forEach(btn => btn.classList.remove("active"));
    
    if (inkType === 'anti_gravity') {
        let btn = document.getElementById("anti_gravityBtn");
        if (btn) btn.classList.add("active");
    } else if (inkType === 'speed_booster') {
        let btn = document.getElementById("speed_boosterBtn");
        if (btn) btn.classList.add("active");
    } else if (inkType === 'scale_shifter') {
        let btn = document.getElementById("scale_shifterBtn");
        if (btn) btn.classList.add("active");
    }
}
// ==========================================
// نظام النقاط، الفوز، الخسارة والمساعدة
// ==========================================
let score = 0;
let helpAttempts = 3; // عدد مرات المساعدة المتاحة
let allowedInksPerLevel = {
    1: ['anti_gravity'], // المرحلة 1 مسموح فيها جاذبية فقط
    2: ['anti_gravity', 'speed_booster'], // المرحلة 2 جاذبية ونفاث
    3: ['speed_booster', 'scale_shifter'], // المرحلة 3 نفاث وتقليص وهكذا..
    4: ['anti_gravity', 'scale_shifter'],
    5: ['anti_gravity', 'speed_booster', 'scale_shifter'],
    6: ['anti_gravity', 'speed_booster', 'scale_shifter']
};

// دالة تحديث الفرش المتاحة بناءً على المرحلة
function updateAvailableInks(level) {
    let allowed = allowedInksPerLevel[level] || [];
    
    // إخفاء أو إظهار الأزرار بناء على المسموح
    document.getElementById("anti_gravityBtn").style.opacity = allowed.includes('anti_gravity') ? "1" : "0.3";
    document.getElementById("speed_boosterBtn").style.opacity = allowed.includes('speed_booster') ? "1" : "0.3";
    document.getElementById("scale_shifterBtn").style.opacity = allowed.includes('scale_shifter') ? "1" : "0.3";
}

// دالة الخسارة (استدعيها في كود الاصطدام بالشفرات الدوارة أو الثقوب السوداء)
function gameOver(reason) {
    gameState = "gameover";
    document.getElementById("game-overlay").style.display = "block";
    document.getElementById("overlay-title").innerHTML = "جيم أوفر! ❌";
    document.getElementById("overlay-message").innerHTML = reason || "لقد خسرت في التحدي!";
    document.getElementById("next-level-btn").style.display = "none";
    if(score > 0) score -= 10; // خصم نقاط عند الخسارة
    document.getElementById("score-display").innerHTML = score;
}

// دالة الفوز (استدعيها عندما تصل الكرة أو اللاعب إلى الهدف target.x و target.y)
function levelComplete() {
    gameState = "win";
    document.getElementById("game-overlay").style.display = "block";
    document.getElementById("overlay-title").innerHTML = "مبروك الفوز! 🎉";
    document.getElementById("overlay-message").innerHTML = "لقد تخطيت أطوار الفيزياء بنجاح!";
    document.getElementById("next-level-btn").style.display = "inline-block";
    score += 50; // إضافة نقاط عند الفوز
    document.getElementById("score-display").innerHTML = score;
}

// دالة الانتقال للمرحلة التالية تلقائياً
function goToNextLevel() {
    document.getElementById("game-overlay").style.display = "none";
    if (currentLevel < 6) {
        selectLevel(currentLevel + 1);
    } else {
        alert("تهانينا! لقد أنهيت جميع المراحل الأسطورية بنجاح! 🏆");
        backToMenu();
    }
}

function restartCurrentLevel() {
    document.getElementById("game-overlay").style.display = "none";
    selectLevel(currentLevel);
}

// دالة خيار المساعدة المحدود
function showHelp() {
    if (helpAttempts > 0) {
        helpAttempts--;
        document.getElementById("help-count").innerHTML = helpAttempts;
        
        // تلميح ذكي بناءً على المرحلة الحالية
        if (currentLevel === 1) alert("تلميح: استخدم فرشاة الجاذبية المشوهة لرفع الكرة فوق العائق الأول!");
        if (currentLevel === 4) alert("تلميح: الثقب الأسود يسحبك! استخدم التقلص لتفادي نطاق جاذبيته.");
        // يمكنك إضافة بقية التلميحات هنا..
    } else {
        alert("عذراً! لقد نفدت محاولات المساعدة المتاحة لك.");
    }
}

// تعديل بسيط على دالة اختيار المرحلة لتفعيل الأزرار الجديدة
let originalSelectLevel = selectLevel;
selectLevel = function(levelNumber) {
    originalSelectLevel(levelNumber);
    updateAvailableInks(levelNumber);
    document.getElementById("help-btn").style.display = "block"; // إظهار زر المساعدة أثناء اللعب
};

