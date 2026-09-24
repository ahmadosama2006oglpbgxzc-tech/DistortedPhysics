function playWinSound() {
    playSound(300, 'triangle', 0.1);
    setTimeout(() => playSound(400, 'triangle', 0.1), 100);
    setTimeout(() => playSound(500, 'triangle', 0.15), 200);
    setTimeout(() => playSound(600, 'sine', 0.3), 300);
}

function changeInk(type) {
    currentInkType = type;
    playSound(600, 'sine', 0.08);
    document.querySelectorAll('.ink-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(type + "Btn").classList.add('active');
}

function selectLevel(lvl) {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    currentLevel = lvl;
    loadLevelData(lvl);
    gameState = "playing";
    document.getElementById("menu-layer").style.display = "none";
    document.getElementById("ui-layer").style.display = "flex";
    document.getElementById("ink-selector").style.display = "flex";
    document.getElementById("levelDisplay").innerText = "المرحلة: " + currentLevel;
    playSound(440, 'triangle', 0.15);
}

function backToMenu() {
    gameState = "menu";
    document.getElementById("menu-layer").style.display = "grid";
    document.getElementById("ui-layer").style.display = "none";
    document.getElementById("ink-selector").style.display = "none";
    playSound(250, 'sine', 0.1);
}

function triggerResetButton() {
    loadLevelData(currentLevel);
    playSound(150, 'sawtooth', 0.1);
}

function checkLineCollision(p, linePoints) {
    for (let i = 0; i < linePoints.length - 1; i++) {
        let p1 = linePoints[i]; let p2 = linePoints[i+1];
        let A = p.x - p1.x; let B = p.y - p1.y;
        let C = p2.x - p1.x; let D = p2.y - p1.y;
        let dot = A * C + B * D; let len_sq = C * C + D * D;
        let param = len_sq !== 0 ? dot / len_sq : -1;
        let xx, yy;
        if (param < 0) { xx = p1.x; yy = p1.y; }
        else if (param > 1) { xx = p2.x; yy = p2.y; }
        else { xx = p1.x + param * C; yy = p1.y + param * D; }
        let distance = Math.sqrt(Math.pow(p.x - xx, 2) + Math.pow(p.y - yy, 2));
        if (distance < p.radius) return true;
    }
    return false;
}

function checkRectCollision(circle, rect) {
    let distX = Math.abs(circle.x - rect.x - rect.width/2);
    let distY = Math.abs(circle.y - rect.y - rect.height/2);
    if (distX > (rect.width/2 + circle.radius)) return false;
    if (distY > (rect.height/2 + circle.radius)) return false;
    if (distX <= (rect.width/2)) return true;
    if (distY <= (rect.height/2)) return true;
    return (Math.pow(distX - rect.width/2, 2) + Math.pow(distY - rect.height/2, 2) <= Math.pow(circle.radius, 2));
}

function update() {
    if (gameState === "menu") {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(255,255,255,0.01)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(update);
        return;
    }

    obstacles.forEach(obs => {
        if (obs.type === "moving_vertical") {
            obs.y += obs.speedY;
            if (obs.y < obs.minY || obs.y + obs.height > obs.maxY) obs.speedY *= -1;
        } else if (obs.type === "moving_horizontal") {
            obs.x += obs.speedX;
            if (obs.x < obs.minX || obs.x + obs.width > obs.maxX) obs.speedX *= -1;
        } else if (obs.type === "rotating_blade") {
            obs.angle += obs.speedRot;
        } else if (obs.type === "black_hole") {
            let dx = obs.x - player.x; let dy = obs.y - player.y; let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 220 && dist > 10) { player.vx += (dx / dist) * obs.pullStrength; player.vy += (dy / dist) * obs.pullStrength; }
        }
    });

    player.vy += gravity; player.x += player.vx; player.y += player.vy;
    player.vx *= 0.98; player.vy = Math.max(-10, Math.min(10, player.vy));

    if (player.x - player.radius < 0 || player.x + player.radius > canvas.width) {
        player.vx *= -1; playSound(200, 'triangle', 0.05);
    }

    lines.forEach(line => {
        if (checkLineCollision(player, line.points)) {
            if (line.type === "anti_gravity") {
                if (gravity > 0) playSound(523, 'sine', 0.12);
                gravity = -0.4; player.color = "#00d2d3"; player.vy = -3.5;
            } else if (line.type === "speed_booster") {
                playSound(880, 'sine', 0.1); player.vx = player.vx > 0 ? 7 : -7; player.color = "#ffffea"; shakeTime = 6; shakeIntensity = 4;
            } else if (line.type === "scale_shifter") {
                if (player.radius === 14) { playSound(350, 'triangle', 0.15); player.radius = 7; player.color = "#9c27b0"; }
            }
        }
    });

    obstacles.forEach(obs => {
        let isHit = false;
        if (obs.type === "moving_vertical" || obs.type === "moving_horizontal" || obs.type === "static") isHit = checkRectCollision(player, obs);
        else if (obs.type === "rotating_blade" || obs.type === "black_hole") isHit = Math.sqrt(Math.pow(player.x - obs.x, 2) + Math.pow(player.y - obs.y, 2)) < (player.radius + obs.radius - 2);

        if (isHit) { playSound(90, 'sawtooth', 0.35); shakeTime = 20; shakeIntensity = 12; loadLevelData(currentLevel); }
    });

    let distToTarget = Math.sqrt(Math.pow(player.x - target.x, 2) + Math.pow(player.y - target.y, 2));
    if (distToTarget < player.radius + target.radius) {
        for(let i=0; i<35; i++) particles.push({ x: target.x, y: target.y, vx: (Math.random()-0.5)*7, vy: (Math.random()-0.5)*7, radius: Math.random()*3+2, color: '#2ed573', alpha: 1 });
        playWinSound();
        if (currentLevel < maxLevels) { currentLevel++; document.getElementById("levelDisplay").innerText = "المرحلة: " + currentLevel; loadLevelData(currentLevel); }
        else { alert("👑 أسطوووووري! لقد ختمت كل تحديات تشويه الفيزياء بنجاح!"); backToMenu(); }
    }

    if (player.y > canvas.height || player.y < 0) { playSound(120, 'sawtooth', 0.2); loadLevelData(currentLevel); }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (shakeTime > 0) { ctx.translate((Math.random()-0.5)*shakeIntensity, (Math.random()-0.5)*shakeIntensity); shakeTime--; }

    obstacles.forEach(obs => {
        ctx.fillStyle = obs.color;
        if (obs.type === "moving_vertical" || obs.type === "moving_horizontal" || obs.type === "static") {
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        } else if (obs.type === "rotating_blade") {
            ctx.save(); ctx.translate(obs.x, obs.y); ctx.rotate(obs.angle); ctx.beginPath(); ctx.arc(0, 0, obs.radius, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-obs.radius, 0); ctx.lineTo(obs.radius, 0); ctx.stroke(); ctx.restore();
        } else if (obs.type === "black_hole") {
            let gradient = ctx.createRadialGradient(obs.x, obs.y, 5, obs.x, obs.y, obs.radius); gradient.addColorStop(0, '#000000'); gradient.addColorStop(0.5, '#4a148c'); gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2); ctx.fill();
        }
    });

    ctx.beginPath(); ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2); ctx.fillStyle = target.color; ctx.fill();

    lines.forEach(line => {
        if (line.points.length < 2) return;
        ctx.strokeStyle = line.type === "anti_gravity" ? "#00d2d3" : line.type === "speed_booster" ? "#ff9f43" : "#9c27b0";
        ctx.lineWidth = line.type === "speed_booster" ? 7 : 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(line.points[0].x, line.points[0].y);
        for(let i=1; i<line.points.length; i++) ctx.lineTo(line.points[i].x, line.points[i].y); ctx.stroke();
    });

    if (isDrawing && currentLine.length > 1) {
        ctx.strokeStyle = currentInkType === "anti_gravity" ? "#00d2d3" : currentInkType === "speed_booster" ? "#ff9f43" : "#9c27b0";
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(currentLine[0].x, currentLine[0].y);
        for(let i=1; i<currentLine.length; i++) ctx.lineTo(currentLine[i].x, currentLine[i].y);
        ctx.stroke();
    }

    particles.forEach((p, index) => {
        p.x += p.vx; p.y += p.vy; p.alpha -= 0.025; ctx.save(); ctx.globalAlpha = p.alpha;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); ctx.restore();
        if(p.alpha <= 0) particles.splice(index, 1);
    });

    ctx.beginPath(); ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2); ctx.fillStyle = player.color; ctx.fill();
    ctx.restore();
    requestAnimationFrame(update);
}

// تشغيل اللعبة ذاتياً فور اكتمال تحميل البنية في المتصفح لمنع التجميد المحلي
window.addEventListener("load", () => {
    requestAnimationFrame(update);
});
