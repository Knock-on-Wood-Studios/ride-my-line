/* Ride My Line — Knock on Wood Studios
   Vanilla Matter.js proto. Vehicle cart, not liquid. */
(function () {
  "use strict";

  var DESIGN_W = 720;
  var DESIGN_H = 1280;
  var INK_MAX = 540;
  var TRACK_THICK = 17;
  var KILL_Y = 1210;
  var FLIP_FAIL_MS = 800;
  var STALL_MS = 2800;
  var RUN_MAX_MS = 12000;
  var STEP = 1000 / 60;

  var CAT_WORLD = 0x0001;
  var CAT_CART = 0x0002;

  var START = { x: 0, y: 798, w: 198, h: 300 };
  var BACKSTOP = { x: 6, y: 712, w: 18, h: 88 };
  var LAND = { x: 508, y: 858, w: 212, h: 280 };
  var STAR_POS = { x: 348, y: 628 };
  var FLAG_POS = { x: 648, y: 858 };
  var SPAWN = { x: 114, y: 798 };

  var STATE_DRAW = "DRAW";
  var STATE_RUN = "RUNNING";
  var STATE_WIN = "WIN";
  var STATE_FAIL = "FAIL";

  var state = STATE_DRAW;
  var attempts = 0;
  var strokes = [];
  var drawing = false;
  var engine = null;
  var cart = null;
  var trackBodies = [];
  var starBody = null;
  var flagBody = null;
  var starGot = false;
  var didFlip = false;
  var flipMs = 0;
  var stallMs = 0;
  var crashReason = "";
  var runStart = 0;
  var timeMs = 0;
  var pops = [];
  var shake = 0;
  var camX = DESIGN_W * 0.5;
  var camY = DESIGN_H * 0.5;
  var camZ = 1;
  var lastTs = 0;
  var acc = 0;
  var ended = false;
  var paperDots = [];

  var view = { scale: 1, ox: 0, oy: 0, dpr: 1, cssW: 1, cssH: 1 };

  var canvas, ctx;
  var el = {};


  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function hypot(ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function showBootError() {
    if (el.bootError) el.bootError.classList.remove("hidden");
  }

  function distToSeg(p, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var len2 = dx * dx + dy * dy;
    if (len2 < 0.0001) return hypot(p.x, p.y, a.x, a.y);
    var t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
    return hypot(p.x, p.y, a.x + dx * t, a.y + dy * t);
  }

  function rdp(points, epsilon) {
    if (points.length < 3) return points.slice();
    var dmax = 0, idx = 0;
    var a = points[0], b = points[points.length - 1];
    for (var i = 1; i < points.length - 1; i++) {
      var d = distToSeg(points[i], a, b);
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > epsilon) {
      var left = rdp(points.slice(0, idx + 1), epsilon);
      var right = rdp(points.slice(idx), epsilon);
      return left.slice(0, -1).concat(right);
    }
    return [a, b];
  }

  function strokeLen(pts) {
    var n = 0;
    for (var i = 1; i < pts.length; i++) n += hypot(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
    return n;
  }

  function totalInk() {
    var n = 0;
    for (var i = 0; i < strokes.length; i++) n += strokeLen(strokes[i]);
    return n;
  }

  function pinStage(node) {
    if (!node) return;
    node.style.left = view.ox + "px";
    node.style.top = view.oy + "px";
    node.style.width = (DESIGN_W * view.scale) + "px";
    node.style.height = (DESIGN_H * view.scale) + "px";
    node.style.right = "auto";
    node.style.bottom = "auto";
  }

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    var scale = Math.min(w / DESIGN_W, h / DESIGN_H);
    view.scale = scale;
    view.ox = (w - DESIGN_W * scale) * 0.5;
    view.oy = (h - DESIGN_H * scale) * 0.5;
    view.dpr = dpr;
    view.cssW = w;
    view.cssH = h;
    pinStage(el.hud);
    pinStage(el.result);
    pinStage(el.bootError);
  }

  function screenToDesign(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var sx = clientX - rect.left;
    var sy = clientY - rect.top;
    var dx = (sx - view.ox) / view.scale;
    var dy = (sy - view.oy) / view.scale;
    return {
      x: (dx - DESIGN_W * 0.5) / camZ + camX,
      y: (dy - DESIGN_H * 0.5) / camZ + camY
    };
  }

  function eventPoint(e) {
    if (e.touches && e.touches.length) return screenToDesign(e.touches[0].clientX, e.touches[0].clientY);
    if (e.changedTouches && e.changedTouches.length) {
      return screenToDesign(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
    return screenToDesign(e.clientX, e.clientY);
  }


  function updateInkHud() {
    var used = totalInk();
    var left = clamp(1 - used / INK_MAX, 0, 1);
    if (el.inkFill) {
      el.inkFill.style.width = (left * 100).toFixed(1) + "%";
      if (left < 0.22) el.inkFill.classList.add("low");
      else el.inkFill.classList.remove("low");
    }
    if (el.inkPct) el.inkPct.textContent = Math.round(left * 100) + "%";
  }

  function canDraw() {
    return state === STATE_DRAW && totalInk() < INK_MAX - 0.5;
  }

  function onPointerDown(e) {
    if (!canDraw()) return;
    e.preventDefault();
    var p = eventPoint(e);
    drawing = true;
    strokes.push([p]);
    updateInkHud();
  }

  function onPointerMove(e) {
    if (!drawing || state !== STATE_DRAW) return;
    e.preventDefault();
    var p = eventPoint(e);
    var stroke = strokes[strokes.length - 1];
    if (!stroke || !stroke.length) return;
    var last = stroke[stroke.length - 1];
    var d = hypot(last.x, last.y, p.x, p.y);
    if (d < 2.4) return;
    var used = totalInk();
    if (used + d > INK_MAX) {
      var remain = INK_MAX - used;
      if (remain > 0.8) {
        var t = remain / d;
        stroke.push({ x: last.x + (p.x - last.x) * t, y: last.y + (p.y - last.y) * t });
      }
      drawing = false;
      updateInkHud();
      return;
    }
    stroke.push(p);
    updateInkHud();
  }

  function onPointerUp(e) {
    if (!drawing) return;
    e.preventDefault();
    drawing = false;
    var stroke = strokes[strokes.length - 1];
    if (stroke && stroke.length < 2) strokes.pop();
    updateInkHud();
  }

  function bindDraw() {
    canvas.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    canvas.addEventListener("touchstart", onPointerDown, { passive: false });
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp, { passive: false });
    window.addEventListener("touchcancel", onPointerUp, { passive: false });
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }


  function worldFilter() {
    return { category: CAT_WORLD, mask: CAT_CART };
  }

  function cartFilter(group) {
    return { group: group, category: CAT_CART, mask: CAT_WORLD };
  }

  function addStaticBox(x, y, w, h, label) {
    var body = Matter.Bodies.rectangle(x + w * 0.5, y + h * 0.5, w, h, {
      isStatic: true,
      friction: 0.88,
      frictionStatic: 0.95,
      restitution: 0.03,
      collisionFilter: worldFilter(),
      label: label || "platform"
    });
    Matter.Composite.add(engine.world, body);
    return body;
  }

  function setupWorld() {
    engine = Matter.Engine.create({ enableSleeping: false });
    engine.gravity.x = 0;
    engine.gravity.y = 1.2;
    engine.positionIterations = 8;
    engine.velocityIterations = 7;

    addStaticBox(START.x, START.y, START.w, START.h, "platform");
    addStaticBox(LAND.x, LAND.y, LAND.w, LAND.h, "platform");
    addStaticBox(BACKSTOP.x, BACKSTOP.y, BACKSTOP.w, BACKSTOP.h, "platform");
    addStaticBox(176, START.y, 44, 14, "platform");

    starBody = Matter.Bodies.circle(STAR_POS.x, STAR_POS.y, 22, {
      isStatic: true,
      isSensor: true,
      collisionFilter: { category: CAT_WORLD, mask: CAT_CART },
      label: "star"
    });
    flagBody = Matter.Bodies.rectangle(FLAG_POS.x, FLAG_POS.y - 40, 36, 84, {
      isStatic: true,
      isSensor: true,
      collisionFilter: { category: CAT_WORLD, mask: CAT_CART },
      label: "flag"
    });
    Matter.Composite.add(engine.world, [starBody, flagBody]);

    Matter.Events.on(engine, "collisionStart", onCollideStart);
    Matter.Events.on(engine, "collisionActive", onCollideActive);
  }

  function clearTrack() {
    for (var i = 0; i < trackBodies.length; i++) {
      Matter.Composite.remove(engine.world, trackBodies[i], true);
    }
    trackBodies = [];
  }

  function buildTrack() {
    clearTrack();
    for (var s = 0; s < strokes.length; s++) {
      var pts = rdp(strokes[s], 3.1);
      if (pts.length < 2) continue;
      for (var i = 0; i < pts.length - 1; i++) {
        var p1 = pts[i], p2 = pts[i + 1];
        var dx = p2.x - p1.x, dy = p2.y - p1.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 3.5) continue;
        var body = Matter.Bodies.rectangle(
          (p1.x + p2.x) * 0.5,
          (p1.y + p2.y) * 0.5,
          len + 8,
          TRACK_THICK,
          {
            isStatic: true,
            angle: Math.atan2(dy, dx),
            friction: 0.9,
            frictionStatic: 1,
            restitution: 0.04,
            collisionFilter: worldFilter(),
            label: "track"
          }
        );
        trackBodies.push(body);
        Matter.Composite.add(engine.world, body);
      }
    }
  }

  function clearCart() {
    if (!cart) return;
    Matter.Composite.remove(engine.world, cart.composite, true);
    cart = null;
  }

  function spawnCart() {
    clearCart();
    var group = Matter.Body.nextGroup(true);
    var x = SPAWN.x;
    var wr = 13;
    var wy = START.y - wr - 0.4;
    var cy = wy - 11;

    var chassis = Matter.Bodies.rectangle(x, cy, 54, 18, {
      chamfer: { radius: 4 },
      density: 0.0024,
      friction: 0.32,
      restitution: 0.05,
      collisionFilter: cartFilter(group),
      label: "chassis"
    });

    var wopt = {
      density: 0.0016,
      friction: 0.96,
      frictionStatic: 1,
      restitution: 0.05,
      collisionFilter: cartFilter(group),
      label: "wheel"
    };
    var wheelA = Matter.Bodies.circle(x - 20, wy, wr, wopt);
    var wheelB = Matter.Bodies.circle(x + 20, wy, wr, {
      density: wopt.density,
      friction: wopt.friction,
      frictionStatic: wopt.frictionStatic,
      restitution: wopt.restitution,
      collisionFilter: cartFilter(group),
      label: "wheel"
    });

    var axA = Matter.Constraint.create({
      bodyA: chassis, pointA: { x: -20, y: 10 },
      bodyB: wheelA, stiffness: 0.55, damping: 0.18, length: 7
    });
    var axB = Matter.Constraint.create({
      bodyA: chassis, pointA: { x: 20, y: 10 },
      bodyB: wheelB, stiffness: 0.55, damping: 0.18, length: 7
    });

    var composite = Matter.Composite.create({ label: "cart" });
    Matter.Composite.add(composite, [chassis, wheelA, wheelB, axA, axB]);
    Matter.Composite.add(engine.world, composite);
    cart = { composite: composite, chassis: chassis, wheelA: wheelA, wheelB: wheelB };
    Matter.Body.setVelocity(chassis, { x: 3.2, y: 0 });
  }

  function driveWheels() {
    if (!cart) return;
    var MAX = 0.5;
    var add = 0.022;
    function spin(w) {
      if (w.angularVelocity < MAX) {
        Matter.Body.setAngularVelocity(w, Math.min(MAX, w.angularVelocity + add));
      }
    }
    spin(cart.wheelA);
    spin(cart.wheelB);
  }


  function pairHas(pair, a, b) {
    var la = pair.bodyA.label, lb = pair.bodyB.label;
    return (la === a && lb === b) || (la === b && lb === a);
  }

  function onCollideActive(ev) {
    if (state !== STATE_RUN || ended) return;
    var pairs = ev.pairs;
    for (var i = 0; i < pairs.length; i++) {
      if (pairHas(pairs[i], "chassis", "flag")) { finish(true); return; }
      if (!starGot && (pairHas(pairs[i], "chassis", "star") || pairHas(pairs[i], "wheel", "star"))) {
        collectStar();
      }
    }
  }

  function onCollideStart(ev) {
    if (state !== STATE_RUN || ended) return;
    var pairs = ev.pairs;
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      if (pairHas(pair, "chassis", "flag")) { finish(true); return; }
      if (!starGot && (pairHas(pair, "chassis", "star") || pairHas(pair, "wheel", "star"))) {
        collectStar();
      }
      var ch = pair.bodyA.label === "chassis" ? pair.bodyA
        : pair.bodyB.label === "chassis" ? pair.bodyB : null;
      var other = ch === pair.bodyA ? pair.bodyB : pair.bodyA;
      if (ch && (other.label === "track" || other.label === "platform") && ch.speed > 24) {
        crashReason = "bonk";
        finish(false);
        return;
      }
    }
  }

  function collectStar() {
    if (starGot) return;
    starGot = true;
    if (starBody) Matter.Body.setPosition(starBody, { x: -400, y: -400 });
    spawnPop(STAR_POS.x, STAR_POS.y);
  }

  function spawnPop(x, y) {
    for (var i = 0; i < 10; i++) {
      var a = (i / 10) * Math.PI * 2 + 0.3;
      pops.push({
        x: x, y: y,
        vx: Math.cos(a) * (2.2 + i % 3),
        vy: Math.sin(a) * (2.2 + i % 3) - 1.4,
        life: 420,
        r: 3 + (i % 3)
      });
    }
  }

  function tickPops(dt) {
    for (var i = pops.length - 1; i >= 0; i--) {
      var p = pops[i];
      p.life -= dt;
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      p.vy += 0.12;
      if (p.life <= 0) pops.splice(i, 1);
    }
  }

  function checkEnd() {
    if (state !== STATE_RUN || ended || !cart) return;
    var pos = cart.chassis.position;
    if (timeMs > RUN_MAX_MS) {
      crashReason = "stuck";
      finish(false);
      return;
    }
    var spd = cart.chassis.speed;
    if (timeMs > 900 && spd < 0.48) {
      stallMs += STEP;
      if (stallMs >= STALL_MS) {
        crashReason = "stuck";
        finish(false);
        return;
      }
    } else {
      stallMs = 0;
    }
    if (pos.y > KILL_Y) {
      crashReason = "dirt";
      finish(false);
      return;
    }
    var ang = Math.abs(wrapAngle(cart.chassis.angle));
    if (ang > 2.05) {
      flipMs += STEP;
      didFlip = true;
      if (flipMs >= FLIP_FAIL_MS) {
        crashReason = "turtle";
        finish(false);
      }
    } else {
      flipMs = 0;
    }
    if (Math.abs(pos.x - FLAG_POS.x) < 28 && pos.y < FLAG_POS.y + 10 && pos.y > FLAG_POS.y - 90) {
      finish(true);
    }
    if (!starGot && Math.hypot(pos.x - STAR_POS.x, pos.y - STAR_POS.y) < 34) {
      collectStar();
    }
  }

  function scoreFor(won) {
    if (!won) return 0;
    var ink01 = clamp(totalInk() / INK_MAX, 0, 1);
    var s = 1000;
    if (starGot) s += 500;
    s += Math.round((1 - ink01) * 300);
    s += Math.round(Math.max(0, 9000 - timeMs) / 22);
    return s;
  }

  function publishResult(won) {
    window.__KOW_LAST_RESULT = {
      gameId: "ride-my-line",
      mode: "campaign",
      levelId: "yard-01",
      score: scoreFor(won),
      timeMs: Math.round(timeMs),
      attempts: attempts,
      secondaryMetrics: {
        stars: starGot ? 1 : 0,
        inkUsed: clamp(totalInk() / INK_MAX, 0, 1),
        flip: didFlip
      },
      completed: !!won
    };
  }

  function finish(won) {
    if (ended) return;
    ended = true;
    state = won ? STATE_WIN : STATE_FAIL;
    if (!won) shake = 16;
    if (el.btnGo) el.btnGo.disabled = true;
    publishResult(won);
    showResult(won);
  }

  function showResult(won) {
    if (!el.result) return;
    el.result.classList.remove("hidden");
    el.resultTitle.textContent = won ? "MADE IT" : (
      crashReason === "turtle" ? "TURTLE" :
      crashReason === "bonk" ? "BONK" :
      crashReason === "stuck" ? "STUCK" : "ATE DIRT"
    );
    el.resultTitle.className = won ? "" : "fail";
    el.resultKicker.textContent = won ? "yard-01 cleared" : "yard-01 wipeout";
    el.resultStars.textContent = won && starGot ? "STAR" : (won ? "no star" : " ");
    el.statTime.textContent = (timeMs / 1000).toFixed(2) + "s";
    el.statInk.textContent = Math.round(clamp(totalInk() / INK_MAX, 0, 1) * 100) + "%";
    el.statScore.textContent = String(scoreFor(won));
    if (el.hint) el.hint.textContent = won ? "again?" : "redraw it";
  }

  function hideResult() {
    if (el.result) el.result.classList.add("hidden");
  }

  function snapCamera() {
    camX = DESIGN_W * 0.5;
    camY = DESIGN_H * 0.5;
    camZ = 1;
  }

  function teardownRun() {
    clearTrack();
    clearCart();
    if (starBody) Matter.Body.setPosition(starBody, STAR_POS);
    starGot = false;
    didFlip = false;
    flipMs = 0;
    stallMs = 0;
    crashReason = "";
    ended = false;
    timeMs = 0;
    acc = 0;
    pops = [];
    shake = 0;
  }

  function resetToDraw(clearLine) {
    teardownRun();
    if (clearLine) strokes = [];
    drawing = false;
    state = STATE_DRAW;
    snapCamera();
    hideResult();
    if (el.btnGo) el.btnGo.disabled = false;
    if (el.hint) el.hint.textContent = "Draw one track · tap GO";
    updateInkHud();
  }

  function go() {
    if (state !== STATE_DRAW) return;
    hideResult();
    teardownRun();
    buildTrack();
    spawnCart();
    attempts += 1;
    if (el.attemptChip) el.attemptChip.textContent = "try " + attempts;
    runStart = performance.now();
    timeMs = 0;
    state = STATE_RUN;
    ended = false;
    if (el.btnGo) el.btnGo.disabled = true;
    if (el.hint) el.hint.textContent = "hang on";
  }


  function sketchLine(c, x1, y1, x2, y2, wob) {
    wob = wob || 1.6;
    c.beginPath();
    c.moveTo(x1 + (Math.sin(x1 * 0.11) * wob), y1 + (Math.cos(y1 * 0.09) * wob * 0.6));
    c.lineTo(x2 + (Math.sin(x2 * 0.13) * wob), y2 + (Math.cos(y2 * 0.1) * wob * 0.6));
    c.stroke();
  }

  function drawPaper(c) {
    c.fillStyle = "#f4efe2";
    c.fillRect(0, 0, DESIGN_W, DESIGN_H);
    c.fillStyle = "rgba(42,34,24,0.045)";
    for (var i = 0; i < paperDots.length; i++) {
      var d = paperDots[i];
      c.fillRect(d.x, d.y, d.s, d.s);
    }
    c.strokeStyle = "rgba(42,34,24,0.05)";
    c.lineWidth = 1;
    for (var y = 80; y < DESIGN_H; y += 48) {
      c.beginPath();
      c.moveTo(0, y + Math.sin(y) * 1.4);
      c.lineTo(DESIGN_W, y);
      c.stroke();
    }
  }

  function drawSun(c) {
    c.save();
    c.strokeStyle = "#d4542a";
    c.lineWidth = 2.4;
    c.lineCap = "round";
    c.beginPath();
    c.arc(92, 168, 22, 0.2, Math.PI * 2 - 0.4);
    c.stroke();
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4 + 0.15;
      sketchLine(c, 92 + Math.cos(a) * 30, 168 + Math.sin(a) * 30, 92 + Math.cos(a) * 40, 168 + Math.sin(a) * 40, 0.4);
    }
    c.restore();
  }

  function drawWood(c, x, y, w, h) {
    c.save();
    c.fillStyle = "#c9a36c";
    c.beginPath();
    c.moveTo(x + 3, y + 2);
    c.lineTo(x + w - 2, y + 4);
    c.lineTo(x + w - 4, y + h);
    c.lineTo(x + 2, y + h - 3);
    c.closePath();
    c.fill();
    c.strokeStyle = "#2a2218";
    c.lineWidth = 2.6;
    c.stroke();
    c.strokeStyle = "rgba(90,60,30,0.45)";
    c.lineWidth = 1.3;
    for (var i = 1; i < 5; i++) {
      var yy = y + (h / 5) * i + Math.sin(i * 2) * 2;
      sketchLine(c, x + 8, yy, x + w - 8, yy + 2, 1.2);
    }
    c.fillStyle = "#2a2218";
    var nails = [0.12, 0.38, 0.64, 0.88];
    for (var n = 0; n < nails.length; n++) {
      c.beginPath();
      c.arc(x + w * nails[n], y + 10, 2.1, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  function drawPlatforms(c) {
    drawWood(c, START.x - 4, START.y, START.w + 8, 36);
    drawWood(c, START.x - 2, START.y + 34, START.w - 20, 22);
    drawWood(c, 176, START.y - 2, 48, 16);
    drawWood(c, LAND.x - 4, LAND.y, LAND.w + 8, 36);
    drawWood(c, LAND.x + 16, LAND.y + 34, LAND.w - 24, 22);
    c.save();
    c.strokeStyle = "#2a2218";
    c.lineWidth = 4;
    c.lineCap = "round";
    sketchLine(c, BACKSTOP.x + 8, BACKSTOP.y + 4, BACKSTOP.x + 10, START.y + 2, 0.8);
    sketchLine(c, BACKSTOP.x - 2, BACKSTOP.y + 18, BACKSTOP.x + 20, BACKSTOP.y + 16, 0.6);
    c.restore();
    c.save();
    c.strokeStyle = "rgba(42,34,24,0.28)";
    c.lineWidth = 2;
    for (var g = 0; g < 9; g++) {
      var gx = START.x + START.w + 18 + g * 30;
      sketchLine(c, gx, START.y + 18, gx + 14, START.y + 46, 0.8);
    }
    c.restore();
    c.fillStyle = "#6a8a4a";

    for (var i = 0; i < 18; i++) {
      var gx = 18 + i * 40 + (i % 3) * 6;
      var gy = DESIGN_H - 46;
      c.beginPath();
      c.moveTo(gx, gy + 10);
      c.lineTo(gx + 5, gy - 8 - (i % 4) * 3);
      c.lineTo(gx + 10, gy + 10);
      c.fill();
    }
    c.fillStyle = "#8aa45c";
    c.fillRect(0, DESIGN_H - 38, DESIGN_W, 38);
    c.strokeStyle = "#2a2218";
    c.lineWidth = 2;
    sketchLine(c, 0, DESIGN_H - 38, DESIGN_W, DESIGN_H - 36, 1);
  }

  function drawHint(c) {
    if (state !== STATE_DRAW || strokes.length) return;
    c.save();
    c.setLineDash([8, 10]);
    c.strokeStyle = "rgba(212,84,42,0.38)";
    c.lineWidth = 3;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(START.x + START.w - 8, START.y - 2);
    c.quadraticCurveTo(340, 790, LAND.x + 8, LAND.y - 2);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = "rgba(212,84,42,0.7)";
    c.font = "16px Segoe Print, Comic Sans MS, cursive";
    c.fillText("across", 300, 770);
    c.restore();
  }


  function drawMarkerStroke(c, pts) {
    if (!pts || pts.length < 2) return;
    c.save();
    c.lineJoin = "round";
    c.lineCap = "round";
    c.strokeStyle = "rgba(42,34,24,0.18)";
    c.lineWidth = 18;
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.stroke();
    c.strokeStyle = "#2a2218";
    for (var j = 1; j < pts.length; j++) {
      c.beginPath();
      c.lineWidth = 11 + 2.1 * Math.sin(j * 0.62) + 1.1 * Math.sin(j * 1.7);
      c.moveTo(pts[j - 1].x, pts[j - 1].y);
      c.lineTo(pts[j].x, pts[j].y);
      c.stroke();
    }
    c.restore();
  }

  function drawStarShape(c, x, y, r, rot) {
    c.beginPath();
    for (var i = 0; i < 5; i++) {
      var a = rot - Math.PI / 2 + i * Math.PI * 2 / 5;
      var wob = 1 + 0.07 * Math.sin(i * 2.2 + rot);
      var px = x + Math.cos(a) * r * wob;
      var py = y + Math.sin(a) * r * wob;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
      var b = a + Math.PI / 5;
      c.lineTo(x + Math.cos(b) * r * 0.4, y + Math.sin(b) * r * 0.4);
    }
    c.closePath();
  }

  function drawStar(c) {
    if (starGot) return;
    var pulse = 1 + 0.04 * Math.sin((lastTs || 0) * 0.008);
    c.save();
    c.translate(STAR_POS.x, STAR_POS.y);
    c.rotate(-0.12);
    c.fillStyle = "#e6b423";
    drawStarShape(c, 0, 0, 20 * pulse, 0.08);
    c.fill();
    c.strokeStyle = "#2a2218";
    c.lineWidth = 2.4;
    c.stroke();
    c.restore();
  }

  function drawFlag(c) {
    var x = FLAG_POS.x, y = FLAG_POS.y;
    c.save();
    c.strokeStyle = "#2a2218";
    c.lineWidth = 3.2;
    c.lineCap = "round";
    sketchLine(c, x, y + 4, x - 2, y - 78, 0.5);
    c.fillStyle = "#d4542a";
    c.beginPath();
    c.moveTo(x, y - 76);
    c.lineTo(x + 38 + Math.sin((lastTs || 0) * 0.006) * 3, y - 62);
    c.lineTo(x + 6, y - 44);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }

  function drawPops(c) {
    for (var i = 0; i < pops.length; i++) {
      var p = pops[i];
      c.save();
      c.globalAlpha = clamp(p.life / 420, 0, 1);
      c.fillStyle = "#e6b423";
      c.strokeStyle = "#2a2218";
      c.lineWidth = 1.4;
      c.beginPath();
      c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.restore();
    }
  }

  function drawWheelDoodle(c, x, y, ang, r) {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.fillStyle = "#3a332b";
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#2a2218";
    c.lineWidth = 2.4;
    c.stroke();
    c.strokeStyle = "#f4efe2";
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(-r + 3, 0); c.lineTo(r - 3, 0);
    c.moveTo(0, -r + 3); c.lineTo(0, r - 3);
    c.stroke();
    c.fillStyle = "#c9a36c";
    c.beginPath();
    c.arc(0, 0, 3.4, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function drawRiderAndWagon(c, x, y, ang) {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.fillStyle = "#b08955";
    c.strokeStyle = "#2a2218";
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(-28, 2);
    c.lineTo(28, 3);
    c.lineTo(24, 14);
    c.lineTo(-24, 13);
    c.closePath();
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(-26, 2);
    c.lineTo(-22, -10);
    c.lineTo(22, -9);
    c.lineTo(26, 3);
    c.stroke();
    c.beginPath();
    c.moveTo(-16, -10);
    c.lineTo(-16, 3);
    c.moveTo(16, -9);
    c.lineTo(16, 3);
    c.stroke();
    c.lineCap = "round";
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(-2, -8);
    c.lineTo(-1, -28);
    c.stroke();
    c.fillStyle = "#f4efe2";
    c.beginPath();
    c.arc(-1, -38, 9.2, 0.15, Math.PI * 2 - 0.1);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(-5, -40); c.lineTo(-3, -38);
    c.moveTo(3, -40); c.lineTo(5, -38);
    c.stroke();
    c.beginPath();
    c.arc(-1, -35, 3.2, 0.2, Math.PI - 0.2);
    c.stroke();
    c.beginPath();
    c.moveTo(-1, -28);
    c.lineTo(-18, -12);
    c.moveTo(-1, -26);
    c.lineTo(17, -11);
    c.stroke();
    c.restore();
  }

  function drawCart(c) {
    var x, y, ang, wa, wb, wax, way, wbx, wby;
    if (cart && (state === STATE_RUN || state === STATE_WIN || state === STATE_FAIL)) {
      x = cart.chassis.position.x;
      y = cart.chassis.position.y;
      ang = cart.chassis.angle;
      wax = cart.wheelA.position.x; way = cart.wheelA.position.y; wa = cart.wheelA.angle;
      wbx = cart.wheelB.position.x; wby = cart.wheelB.position.y; wb = cart.wheelB.angle;
    } else {
      var wr = 13;
      var wy = START.y - wr - 0.4;
      var cy = wy - 11;
      x = SPAWN.x; y = cy; ang = 0;
      wax = x - 20; way = wy; wa = 0;
      wbx = x + 20; wby = wy; wb = 0;
    }
    drawWheelDoodle(c, wax, way, wa, 13);
    drawWheelDoodle(c, wbx, wby, wb, 13);
    drawRiderAndWagon(c, x, y, ang);
  }


  function updateCamera() {
    var targetZ = state === STATE_RUN ? 1.22 : 1;
    camZ += (targetZ - camZ) * 0.08;
    var tx = DESIGN_W * 0.5;
    var ty = DESIGN_H * 0.5;
    if (cart && state === STATE_RUN) {
      tx = cart.chassis.position.x + 30;
      ty = cart.chassis.position.y - 50;
      var halfW = (DESIGN_W * 0.5) / camZ;
      var halfH = (DESIGN_H * 0.5) / camZ;
      tx = clamp(tx, halfW - 30, DESIGN_W - halfW + 30);
      ty = clamp(ty, halfH - 30, DESIGN_H - halfH + 30);
    }
    var k = state === STATE_RUN ? 0.09 : 0.16;
    camX += (tx - camX) * k;
    camY += (ty - camY) * k;
  }

  function render() {
    var dpr = view.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, view.cssW, view.cssH);
    ctx.fillStyle = "#1c1814";
    ctx.fillRect(0, 0, view.cssW, view.cssH);

    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);

    if (shake > 0.35) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    ctx.translate(DESIGN_W * 0.5, DESIGN_H * 0.5);
    ctx.scale(camZ, camZ);
    ctx.translate(-camX, -camY);

    drawPaper(ctx);
    drawSun(ctx);
    drawPlatforms(ctx);
    drawHint(ctx);
    drawFlag(ctx);
    drawStar(ctx);

    for (var i = 0; i < strokes.length; i++) drawMarkerStroke(ctx, strokes[i]);

    drawCart(ctx);
    drawPops(ctx);

    ctx.strokeStyle = "rgba(42,34,24,0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, DESIGN_W - 6, DESIGN_H - 6);
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    if (!lastTs) lastTs = ts;
    var dt = ts - lastTs;
    if (dt > 32) dt = 32;
    lastTs = ts;

    if (state === STATE_RUN && engine) {
      acc += dt;
      if (acc > 80) acc = 80;
      while (acc >= STEP) {
        driveWheels();
        Matter.Engine.update(engine, STEP);
        acc -= STEP;
      }
      timeMs = ts - runStart;
      checkEnd();
    }

    if (shake > 0.4) shake *= 0.86;
    else shake = 0;
    tickPops(dt);
    updateCamera();
    render();
  }

  function bindHud() {
    el.btnGo.addEventListener("click", function (e) {
      e.preventDefault();
      go();
    });
    el.btnReset.addEventListener("click", function (e) {
      e.preventDefault();
      resetToDraw(true);
    });
    el.btnAgain.addEventListener("click", function (e) {
      e.preventDefault();
      resetToDraw(false);
      go();
    });
    el.btnResetLine.addEventListener("click", function (e) {
      e.preventDefault();
      resetToDraw(true);
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "g" || e.key === "G" || e.key === "Enter") {
        if (state === STATE_DRAW) go();
      } else if (e.key === "r" || e.key === "R") {
        resetToDraw(true);
      } else if (e.key === " ") {
        if (state === STATE_WIN || state === STATE_FAIL) { resetToDraw(false); go(); }
        e.preventDefault();
      }
    });
  }

  function gatherEls() {
    canvas = document.getElementById("game");
    ctx = canvas.getContext("2d");
    el.btnGo = document.getElementById("btnGo");
    el.btnReset = document.getElementById("btnReset");
    el.btnAgain = document.getElementById("btnAgain");
    el.btnResetLine = document.getElementById("btnResetLine");
    el.inkFill = document.getElementById("inkFill");
    el.inkPct = document.getElementById("inkPct");
    el.hint = document.getElementById("hint");
    el.attemptChip = document.getElementById("attemptChip");
    el.result = document.getElementById("result");
    el.resultTitle = document.getElementById("resultTitle");
    el.resultKicker = document.getElementById("resultKicker");
    el.resultStars = document.getElementById("resultStars");
    el.statTime = document.getElementById("statTime");
    el.statInk = document.getElementById("statInk");
    el.statScore = document.getElementById("statScore");
    el.bootError = document.getElementById("bootError");
    el.hud = document.getElementById("hud");
  }

  function seedPaper() {
    paperDots = [];
    for (var i = 0; i < 90; i++) {
      paperDots.push({
        x: (i * 97) % DESIGN_W,
        y: (i * 53 + 17) % DESIGN_H,
        s: 1 + (i % 3)
      });
    }
  }

  function boot() {
    gatherEls();
    if (!canvas || !ctx) return;
    canvas.style.touchAction = "none";
    seedPaper();
    resize();
    window.addEventListener("resize", resize);
    setupWorld();
    bindDraw();
    bindHud();
    updateInkHud();
    requestAnimationFrame(loop);
  }

  function whenMatterReady() {
    if (window.Matter) {
      boot();
      return;
    }
    var n = 0;
    var t = setInterval(function () {
      n += 1;
      if (window.Matter) {
        clearInterval(t);
        boot();
      } else if (n > 40) {
        clearInterval(t);
        gatherEls();
        showBootError();
      }
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", whenMatterReady);
  } else {
    whenMatterReady();
  }
})();
