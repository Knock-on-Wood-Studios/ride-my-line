/* Ride My Line — Knock on Wood Studios
   Vanilla Matter.js proto. Vehicle cart, not liquid. */
(function () {
  "use strict";

  var DESIGN_W = 720;
  var DESIGN_H = 1280;
  var TRACK_THICK = 17;
  var KILL_Y = 1210;
  var FLIP_FAIL_MS = 900;
  var STALL_MS = 1600;
  var STALL_GRACE_MS = 400;
  var RUN_MAX_MS = 14000;
  var STEP = 1000 / 60;
  var RESULT_DELAY_MS = 980;

  var CAT_WORLD = 0x0001;
  var CAT_CART = 0x0002;

  var LEVELS = (typeof window !== "undefined" && window.RML_LEVELS) || [];
  var STORAGE_UNLOCK = "kow.rideMyLine.unlocked";
  var STORAGE_LAST = "kow.rideMyLine.lastYard";
  var STORAGE_WIN_ANIM = "kow.rideMyLine.lastWinAnim";
  var STORAGE_FAIL_ANIM = "kow.rideMyLine.lastFailAnim";

  var WIN_ANIMS = ["hop", "flag-wave", "star-burst", "bow", "stamp"];
  var FAIL_ANIMS = ["turtle", "bonk", "yeet", "dirt", "stuck"];
  var STAMPS = ["YEEHAW", "NAILED IT", "SMOOTH"];

  var STATE_DRAW = "DRAW";
  var STATE_RUN = "RUNNING";
  var STATE_WIN = "WIN";
  var STATE_FAIL = "FAIL";

  var state = STATE_DRAW;
  var levelIndex = 0;
  var level = null;
  var unlockedCount = 1;
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
  var resultTimer = 0;
  var resultShown = false;
  var driveLeft = 0;
  var lastWinAnim = "";
  var lastFailAnim = "";
  var lastStamp = "";
  var finishAnim = {
    active: false,
    win: false,
    name: "",
    stamp: "",
    t: 0,
    dur: 900
  };

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

  function easeOut(t) {
    t = clamp(t, 0, 1);
    return 1 - (1 - t) * (1 - t);
  }

  function inkMax() {
    return (level && level.inkMax) || 540;
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


  function storageGet(key, fallback) {
    try {
      var v = window.localStorage.getItem(key);
      return v == null ? fallback : v;
    } catch (err) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (err) { /* ignore */ }
  }

  function loadProgress() {
    lastWinAnim = storageGet(STORAGE_WIN_ANIM, "");
    lastFailAnim = storageGet(STORAGE_FAIL_ANIM, "");
    unlockedCount = clamp(parseInt(storageGet(STORAGE_UNLOCK, "1"), 10) || 1, 1, LEVELS.length || 1);
    var lastId = storageGet(STORAGE_LAST, "");
    var idx = 0;
    if (lastId) {
      for (var i = 0; i < LEVELS.length; i++) {
        if (LEVELS[i].id === lastId) { idx = i; break; }
      }
    }
    if (idx >= unlockedCount) idx = unlockedCount - 1;
    return idx;
  }

  function persistUnlock() {
    storageSet(STORAGE_UNLOCK, String(unlockedCount));
  }

  function persistLastYard() {
    if (level) storageSet(STORAGE_LAST, level.id);
  }


  function updateInkHud() {
    var used = totalInk();
    var max = inkMax();
    var left = clamp(1 - used / max, 0, 1);
    if (el.inkFill) {
      el.inkFill.style.width = (left * 100).toFixed(1) + "%";
      if (left < 0.22) el.inkFill.classList.add("low");
      else el.inkFill.classList.remove("low");
    }
    if (el.inkPct) el.inkPct.textContent = Math.round(left * 100) + "%";
  }

  function updateYardHud() {
    if (el.yardChip && level) {
      el.yardChip.textContent = "yard " + (levelIndex + 1) + "/" + LEVELS.length;
    }
    if (el.attemptChip) el.attemptChip.textContent = "try " + Math.max(1, attempts || 1);
    renderYardList();
  }

  function renderYardList() {
    if (!el.yardList) return;
    el.yardList.innerHTML = "";
    for (var i = 0; i < LEVELS.length; i++) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "option");
      var open = i < unlockedCount;
      btn.disabled = !open;
      btn.textContent = open
        ? (i + 1) + "  " + LEVELS[i].name
        : (i + 1) + "  —";
      if (i === levelIndex) btn.className = "current";
      btn.setAttribute("data-yard", String(i));
      if (open) {
        btn.addEventListener("click", (function (idx) {
          return function (e) {
            e.preventDefault();
            hideYardList();
            if (idx !== levelIndex) loadLevel(idx, { clearLine: true });
          };
        })(i));
      }
      el.yardList.appendChild(btn);
    }
  }

  function hideYardList() {
    if (!el.yardList) return;
    el.yardList.classList.add("hidden");
    if (el.yardChip) el.yardChip.setAttribute("aria-expanded", "false");
  }

  function toggleYardList() {
    if (!el.yardList) return;
    var open = el.yardList.classList.contains("hidden");
    if (open) {
      renderYardList();
      el.yardList.classList.remove("hidden");
      if (el.yardChip) el.yardChip.setAttribute("aria-expanded", "true");
    } else {
      hideYardList();
    }
  }

  function canDraw() {
    return state === STATE_DRAW && totalInk() < inkMax() - 0.5;
  }

  function onPointerDown(e) {
    if (state !== STATE_DRAW) return;
    hideYardList();
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
    var max = inkMax();
    if (used + d > max) {
      var remain = max - used;
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

  function addStaticBox(x, y, w, h, label, extras) {
    extras = extras || {};
    var body = Matter.Bodies.rectangle(x + w * 0.5, y + h * 0.5, w, h, {
      isStatic: true,
      friction: extras.friction != null ? extras.friction : 0.88,
      frictionStatic: extras.frictionStatic != null ? extras.frictionStatic : 0.95,
      restitution: extras.restitution != null ? extras.restitution : 0.03,
      collisionFilter: worldFilter(),
      label: label || "platform"
    });
    Matter.Composite.add(engine.world, body);
    return body;
  }

  function destroyWorld() {
    if (!engine) return;
    Matter.Events.off(engine, "collisionStart", onCollideStart);
    Matter.Events.off(engine, "collisionActive", onCollideActive);
    Matter.World.clear(engine.world, false);
    Matter.Engine.clear(engine);
    engine = null;
    cart = null;
    trackBodies = [];
    starBody = null;
    flagBody = null;
  }

  function setupWorld() {
    destroyWorld();
    if (!level) return;
    engine = Matter.Engine.create({ enableSleeping: false });
    engine.gravity.x = 0;
    engine.gravity.y = 1.42;
    engine.positionIterations = 8;
    engine.velocityIterations = 7;

    var landFric = (level.landing && level.landing.friction != null)
      ? level.landing.friction
      : (level.friction && level.friction.land != null ? level.friction.land : 0.88);
    var landIce = !!(level.landing && level.landing.ice);

    addStaticBox(level.ledge.x, level.ledge.y, level.ledge.w, level.ledge.h, "platform");
    if (level.backstop) {
      addStaticBox(level.backstop.x, level.backstop.y, level.backstop.w, level.backstop.h, "platform");
    }
    var i;
    var posts = level.posts || [];
    for (i = 0; i < posts.length; i++) {
      addStaticBox(posts[i].x, posts[i].y, posts[i].w, posts[i].h, "platform");
    }
    addStaticBox(level.landing.x, level.landing.y, level.landing.w, level.landing.h,
      landIce ? "ice" : "platform", {
        friction: landFric,
        frictionStatic: landIce ? 0.04 : 0.95,
        restitution: landIce ? 0.16 : 0.03
      });
    var landPosts = level.landPosts || [];
    for (i = 0; i < landPosts.length; i++) {
      addStaticBox(landPosts[i].x, landPosts[i].y, landPosts[i].w, landPosts[i].h, "platform");
    }
    var extras = level.extras || [];
    for (i = 0; i < extras.length; i++) {
      var ex = extras[i];
      var lab = ex.type === "wall" ? "wall" : (ex.type === "ice" ? "ice" : "platform");
      addStaticBox(ex.x, ex.y, ex.w, ex.h, lab, {
        friction: ex.friction != null ? ex.friction : (lab === "ice" ? 0.04 : 0.88),
        frictionStatic: lab === "ice" ? 0.04 : 0.95,
        restitution: ex.restitution != null ? ex.restitution : (lab === "wall" ? 0.08 : 0.03)
      });
    }

    if (level.star) {
      starBody = Matter.Bodies.circle(level.star.x, level.star.y, 22, {
        isStatic: true,
        isSensor: true,
        collisionFilter: { category: CAT_WORLD, mask: CAT_CART },
        label: "star"
      });
      Matter.Composite.add(engine.world, starBody);
    } else {
      starBody = null;
    }
    flagBody = Matter.Bodies.rectangle(level.flag.x, level.flag.y - 36, 56, 100, {
      isStatic: true,
      isSensor: true,
      collisionFilter: { category: CAT_WORLD, mask: CAT_CART },
      label: "flag"
    });
    Matter.Composite.add(engine.world, flagBody);

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
    if (!engine) return;
    var fric = (level && level.friction && level.friction.track != null) ? level.friction.track : 0.9;
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
            friction: fric,
            frictionStatic: 1,
            restitution: 0.06,
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
    if (!cart || !engine) return;
    Matter.Composite.remove(engine.world, cart.composite, true);
    cart = null;
  }

  function spawnPoint() {
    var ledge = level.ledge;
    var wr = 13;
    return {
      x: ledge.x + ledge.w - 46,
      wy: ledge.y - wr - 0.4,
      cy: ledge.y - wr - 0.4 - 11,
      wr: wr
    };
  }

  function spawnCart() {
    clearCart();
    var group = Matter.Body.nextGroup(true);
    var sp = spawnPoint();
    var x = sp.x;
    var wr = sp.wr;
    var wy = sp.wy;
    var cy = sp.cy;
    var push = (level && level.push) || { x: 2.4, y: 0.1 };

    var chassis = Matter.Bodies.rectangle(x, cy, 54, 18, {
      chamfer: { radius: 4 },
      density: 0.0028,
      friction: 0.28,
      frictionAir: 0.035,
      restitution: 0.02,
      collisionFilter: cartFilter(group),
      label: "chassis"
    });
    Matter.Body.setInertia(chassis, chassis.inertia * 2.3);

    var wopt = {
      density: 0.0018,
      friction: 0.82,
      frictionStatic: 0.9,
      restitution: 0.03,
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
      bodyB: wheelA, stiffness: 0.78, damping: 0.32, length: 6
    });
    var axB = Matter.Constraint.create({
      bodyA: chassis, pointA: { x: 20, y: 10 },
      bodyB: wheelB, stiffness: 0.78, damping: 0.32, length: 6
    });

    var composite = Matter.Composite.create({ label: "cart" });
    Matter.Composite.add(composite, [chassis, wheelA, wheelB, axA, axB]);
    Matter.Composite.add(engine.world, composite);
    cart = { composite: composite, chassis: chassis, wheelA: wheelA, wheelB: wheelB };

    Matter.Body.setVelocity(chassis, { x: push.x, y: push.y });
    Matter.Body.setVelocity(wheelA, { x: push.x, y: push.y });
    Matter.Body.setVelocity(wheelB, { x: push.x, y: push.y });
    Matter.Body.setAngularVelocity(wheelA, 0.32);
    Matter.Body.setAngularVelocity(wheelB, 0.32);
    driveLeft = (level && level.driveMs != null) ? level.driveMs : 360;
  }

  function driveWheels() {
    if (!cart || driveLeft <= 0) return;
    var MAX = 0.42;
    var add = 0.02;
    function spin(w) {
      if (w.angularVelocity < MAX) {
        Matter.Body.setAngularVelocity(w, Math.min(MAX, w.angularVelocity + add));
      }
    }
    spin(cart.wheelA);
    spin(cart.wheelB);
  }

  function settleChassis() {
    if (!cart) return;
    var a = wrapAngle(cart.chassis.angle);
    if (Math.abs(a) < 1.35) {
      Matter.Body.setAngularVelocity(
        cart.chassis,
        cart.chassis.angularVelocity - a * 0.016
      );
    }
  }


  function pairHas(pair, a, b) {
    var la = pair.bodyA.label, lb = pair.bodyB.label;
    return (la === a && lb === b) || (la === b && lb === a);
  }

  function pairTouchesFlag(pair) {
    return pairHas(pair, "chassis", "flag") || pairHas(pair, "wheel", "flag");
  }

  function onCollideActive(ev) {
    if (state !== STATE_RUN || ended) return;
    var pairs = ev.pairs;
    for (var i = 0; i < pairs.length; i++) {
      if (pairTouchesFlag(pairs[i])) { finish(true); return; }
      if (!starGot && (pairHas(pairs[i], "chassis", "star") || pairHas(pairs[i], "wheel", "star"))) {
        collectStar();
      }
    }
  }

  function isSolidLabel(lab) {
    return lab === "track" || lab === "platform" || lab === "ice" || lab === "wall";
  }

  function overLanding() {
    if (!cart || !level || !level.landing) return false;
    var p = cart.chassis.position;
    var L = level.landing;
    return p.x >= L.x - 28 && p.x <= L.x + L.w + 28 &&
      p.y >= L.y - 96 && p.y <= L.y + 70;
  }

  function atFlag() {
    if (!cart || !level || !level.flag) return false;
    function hit(x, y) {
      return Math.abs(x - level.flag.x) < 46 && y < level.flag.y + 28 && y > level.flag.y - 110;
    }
    var c = cart.chassis.position;
    if (hit(c.x, c.y)) return true;
    if (hit(cart.wheelA.position.x, cart.wheelA.position.y)) return true;
    if (hit(cart.wheelB.position.x, cart.wheelB.position.y)) return true;
    return false;
  }

  function onCollideStart(ev) {
    if (state !== STATE_RUN || ended) return;
    var pairs = ev.pairs;
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      if (pairTouchesFlag(pair)) { finish(true); return; }
      if (!starGot && (pairHas(pair, "chassis", "star") || pairHas(pair, "wheel", "star"))) {
        collectStar();
      }
      var ch = pair.bodyA.label === "chassis" ? pair.bodyA
        : pair.bodyB.label === "chassis" ? pair.bodyB : null;
      var other = ch === pair.bodyA ? pair.bodyB : pair.bodyA;
      if (ch && other && isSolidLabel(other.label)) {
        var flat = Math.abs(Math.sin(other.angle || 0)) < 0.32;
        var vy = ch.velocity.y;
        var mostlyDown = vy > 12 && vy > ch.speed * 0.6;
        if (flat && mostlyDown) {
          crashReason = "bonk";
          finish(false);
          return;
        }
        if (other.label === "wall" && ch.speed > 15) {
          crashReason = "bonk";
          finish(false);
          return;
        }
        if (ch.speed > 26) {
          crashReason = "bonk";
          finish(false);
          return;
        }
      }
    }
  }

  function collectStar() {
    if (starGot || !level || !level.star) return;
    starGot = true;
    if (starBody) Matter.Body.setPosition(starBody, { x: -400, y: -400 });
    spawnPop(level.star.x, level.star.y);
  }

  function spawnPop(x, y) {
    for (var i = 0; i < 10; i++) {
      var a = (i / 10) * Math.PI * 2 + 0.3;
      pops.push({
        x: x, y: y,
        vx: Math.cos(a) * (2.2 + i % 3),
        vy: Math.sin(a) * (2.2 + i % 3) - 1.4,
        life: 420,
        r: 3 + (i % 3),
        kind: "star"
      });
    }
  }

  function spawnDust(x, y, n) {
    for (var i = 0; i < n; i++) {
      pops.push({
        x: x + (i - n * 0.5) * 6,
        y: y,
        vx: (i - n * 0.5) * 0.7,
        vy: -1.2 - (i % 3) * 0.4,
        life: 380,
        r: 4 + (i % 3),
        kind: "dust"
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
    if (state !== STATE_RUN || ended || !cart || !level) return;
    var pos = cart.chassis.position;
    if (atFlag()) {
      finish(true);
      return;
    }
    if (pos.y > KILL_Y) {
      crashReason = "dirt";
      finish(false);
      return;
    }
    if (timeMs > RUN_MAX_MS) {
      crashReason = "stuck";
      finish(false);
      return;
    }
    var spd = cart.chassis.speed;
    if (timeMs > STALL_GRACE_MS) {
      if (spd < 0.7) {
        stallMs += STEP;
        if (stallMs >= STALL_MS) {
          crashReason = "stuck";
          finish(false);
          return;
        }
      } else {
        stallMs = Math.max(0, stallMs - STEP * 2);
      }
    }
    var ang = Math.abs(wrapAngle(cart.chassis.angle));
    if (ang > 2.05) {
      flipMs += STEP;
      didFlip = true;
      if (flipMs >= FLIP_FAIL_MS && !overLanding() && !atFlag()) {
        crashReason = "turtle";
        finish(false);
      }
    } else {
      flipMs = 0;
    }
    if (level.star && !starGot && Math.hypot(pos.x - level.star.x, pos.y - level.star.y) < 34) {
      collectStar();
    }
  }

  function scoreFor(won) {
    if (!won) return 0;
    var ink01 = clamp(totalInk() / inkMax(), 0, 1);
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
      levelId: level ? level.id : "yard-01",
      score: scoreFor(won),
      timeMs: Math.round(timeMs),
      attempts: attempts,
      secondaryMetrics: {
        stars: starGot ? 1 : 0,
        inkUsed: clamp(totalInk() / inkMax(), 0, 1),
        flip: didFlip
      },
      completed: !!won
    };
  }

  function pickCycled(pool, last) {
    var choices = [];
    var i;
    for (i = 0; i < pool.length; i++) {
      if (pool[i] !== last) choices.push(pool[i]);
    }
    if (!choices.length) choices = pool.slice();
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function pickWinAnim() {
    var name = pickCycled(WIN_ANIMS, lastWinAnim);
    lastWinAnim = name;
    storageSet(STORAGE_WIN_ANIM, name);
    var stamp = "";
    if (name === "stamp") {
      stamp = pickCycled(STAMPS, lastStamp);
      lastStamp = stamp;
    }
    return { name: name, stamp: stamp, dur: name === "stamp" ? 1000 : 880 };
  }

  function pickFailAnim(reason) {
    var name;
    if (reason && FAIL_ANIMS.indexOf(reason) !== -1 && reason !== lastFailAnim) {
      name = reason;
    } else {
      name = pickCycled(FAIL_ANIMS, lastFailAnim);
    }
    lastFailAnim = name;
    storageSet(STORAGE_FAIL_ANIM, name);
    return { name: name, dur: name === "yeet" ? 1100 : 860 };
  }

  function startFinishAnim(won) {
    var pick = won ? pickWinAnim() : pickFailAnim(crashReason);
    finishAnim.active = true;
    finishAnim.win = won;
    finishAnim.name = pick.name;
    finishAnim.stamp = pick.stamp || "";
    finishAnim.t = 0;
    finishAnim.dur = pick.dur;
    if (!won) {
      var pose = liveCartPose();
      if (pick.name === "turtle" || pick.name === "dirt" || pick.name === "bonk") {
        spawnDust(pose.x, pose.y + 18, 7);
      }
    } else if (pick.name === "star-burst") {
      var burst = level && level.flag ? level.flag : { x: DESIGN_W * 0.5, y: DESIGN_H * 0.5 };
      spawnPop(burst.x - 20, burst.y - 50);
      spawnPop(poseOrCenter().x, poseOrCenter().y - 20);
    } else if (pick.name === "flag-wave" && level) {
      spawnDust(level.flag.x + 18, level.flag.y - 58, 6);
    }
  }

  function poseOrCenter() {
    if (cart) return { x: cart.chassis.position.x, y: cart.chassis.position.y };
    var sp = level ? spawnPoint() : { x: 120, cy: 400 };
    return { x: sp.x, y: sp.cy };
  }

  function finish(won) {
    if (ended) return;
    ended = true;
    state = won ? STATE_WIN : STATE_FAIL;
    if (!won) shake = 16;
    if (el.btnGo) el.btnGo.disabled = true;
    if (won && levelIndex + 1 < LEVELS.length && unlockedCount < levelIndex + 2) {
      unlockedCount = levelIndex + 2;
      persistUnlock();
    } else if (won && levelIndex + 1 === LEVELS.length) {
      unlockedCount = LEVELS.length;
      persistUnlock();
    }
    publishResult(won);
    startFinishAnim(won);
    resultShown = false;
    resultTimer = 0;
  }

  function showResult(won) {
    if (!el.result || resultShown) return;
    resultShown = true;
    el.result.classList.remove("hidden");
    el.resultTitle.textContent = won ? "MADE IT" : (
      crashReason === "turtle" ? "TURTLE" :
      crashReason === "bonk" ? "BONK" :
      crashReason === "stuck" ? "STUCK" : "ATE DIRT"
    );
    el.resultTitle.className = won ? "" : "fail";
    var yardTag = level ? level.id : "yard-01";
    var yardName = level ? level.name : "";
    el.resultKicker.textContent = won
      ? yardTag + " · " + yardName + " cleared"
      : yardTag + " · " + yardName + " wipeout";
    el.resultStars.textContent = won && starGot ? "STAR" : (won ? "no star" : " ");
    el.statTime.textContent = (timeMs / 1000).toFixed(2) + "s";
    el.statInk.textContent = Math.round(clamp(totalInk() / inkMax(), 0, 1) * 100) + "%";
    el.statScore.textContent = String(scoreFor(won));
    if (el.hint) el.hint.textContent = won ? "again?" : "redraw it";
    if (el.btnNext) {
      var hasNext = !!(won && levelIndex + 1 < LEVELS.length && levelIndex + 1 < unlockedCount);
      if (hasNext) el.btnNext.classList.remove("hidden");
      else el.btnNext.classList.add("hidden");
    }
  }

  function hideResult() {
    if (el.result) el.result.classList.add("hidden");
    resultShown = false;
    resultTimer = 0;
    if (el.btnNext) el.btnNext.classList.add("hidden");
  }

  function snapCamera() {
    camX = DESIGN_W * 0.5;
    camY = DESIGN_H * 0.5;
    camZ = 1;
  }

  function stopFinishAnim() {
    finishAnim.active = false;
    finishAnim.t = 0;
    finishAnim.name = "";
    finishAnim.stamp = "";
  }

  function teardownRun() {
    clearTrack();
    clearCart();
    if (starBody && level && level.star) Matter.Body.setPosition(starBody, level.star);
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
    driveLeft = 0;
    stopFinishAnim();
  }

  function setHintDraw() {
    if (el.hint) el.hint.textContent = (level && level.hint) || "draw the catch · tap GO";
  }

  function loadLevel(index, opts) {
    opts = opts || {};
    if (!LEVELS.length) return;
    if (index >= unlockedCount) index = unlockedCount - 1;
    levelIndex = clamp(index, 0, LEVELS.length - 1);
    level = LEVELS[levelIndex];
    if (opts.clearLine !== false) strokes = [];
    drawing = false;
    attempts = 0;
    teardownRun();
    setupWorld();
    state = STATE_DRAW;
    snapCamera();
    hideResult();
    hideYardList();
    if (el.btnGo) el.btnGo.disabled = false;
    setHintDraw();
    updateInkHud();
    updateYardHud();
    persistLastYard();
  }

  function resetToDraw(clearLine) {
    teardownRun();
    if (clearLine) strokes = [];
    drawing = false;
    state = STATE_DRAW;
    snapCamera();
    hideResult();
    hideYardList();
    if (el.btnGo) el.btnGo.disabled = false;
    setHintDraw();
    updateInkHud();
  }

  function go() {
    if (state !== STATE_DRAW) return;
    hideResult();
    hideYardList();
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

  function goNextYard() {
    if (state !== STATE_WIN) return;
    if (levelIndex + 1 >= LEVELS.length) return;
    if (levelIndex + 1 >= unlockedCount) return;
    loadLevel(levelIndex + 1, { clearLine: true });
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
    var lines = Math.max(2, Math.round(h / 14));
    for (var i = 1; i < lines; i++) {
      var yy = y + (h / lines) * i + Math.sin(i * 2) * 2;
      sketchLine(c, x + 6, yy, x + w - 6, yy + 2, 1.2);
    }
    c.fillStyle = "#2a2218";
    var nails = w > 40 ? [0.12, 0.38, 0.64, 0.88] : [0.28, 0.72];
    for (var n = 0; n < nails.length; n++) {
      c.beginPath();
      c.arc(x + w * nails[n], y + Math.min(10, h * 0.35), 2.1, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  function drawIceDeck(c, x, y, w, h) {
    c.save();
    c.fillStyle = "#d7e7ee";
    c.beginPath();
    c.moveTo(x + 3, y + 2);
    c.lineTo(x + w - 2, y + 3);
    c.lineTo(x + w - 3, y + h);
    c.lineTo(x + 2, y + h - 2);
    c.closePath();
    c.fill();
    c.strokeStyle = "#2a2218";
    c.lineWidth = 2.4;
    c.stroke();
    c.strokeStyle = "rgba(80,130,160,0.55)";
    c.lineWidth = 1.4;
    for (var i = 0; i < 5; i++) {
      sketchLine(c, x + 12 + i * (w / 6), y + 6, x + 28 + i * (w / 6), y + h - 5, 0.8);
    }
    c.restore();
  }

  function drawWall(c, x, y, w, h) {
    c.save();
    c.fillStyle = "#b08955";
    c.beginPath();
    c.moveTo(x + 1, y + 2);
    c.lineTo(x + w - 1, y + 4);
    c.lineTo(x + w, y + h);
    c.lineTo(x, y + h - 3);
    c.closePath();
    c.fill();
    c.strokeStyle = "#2a2218";
    c.lineWidth = 2.6;
    c.stroke();
    c.strokeStyle = "rgba(42,34,24,0.55)";
    c.lineWidth = 1.6;
    for (var i = 1; i < 6; i++) {
      var xx = x + (w / 6) * i;
      sketchLine(c, xx, y + 6, xx + 2, y + h - 6, 1);
    }
    c.restore();
  }

  function drawGrass(c) {
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

  function drawGapHatch(c) {
    if (!level) return;
    c.save();
    c.strokeStyle = "rgba(42,34,24,0.22)";
    c.lineWidth = 2;
    var left = level.ledge.x + level.ledge.w + 10;
    var right = level.landing.x - 8;
    var extras = level.extras || [];
    var mid = null;
    var i;
    for (i = 0; i < extras.length; i++) {
      if (extras[i].type === "plank") { mid = extras[i]; break; }
    }
    function hatch(a, b) {
      if (b - a < 20) return;
      for (var g = 0; g < 14; g++) {
        var gx = a + 8 + g * ((b - a - 16) / 13);
        sketchLine(c, gx, DESIGN_H - 70, gx + 12, DESIGN_H - 42, 0.7);
      }
    }
    if (mid) {
      hatch(left, mid.x);
      hatch(mid.x + mid.w, right);
    } else {
      hatch(left, right);
    }
    c.restore();
  }

  function drawPlatforms(c) {
    if (!level) return;
    var i;
    var posts = level.posts || [];
    for (i = 0; i < posts.length; i++) {
      drawWood(c, posts[i].x, posts[i].y, posts[i].w, posts[i].h);
    }
    var landPosts = level.landPosts || [];
    for (i = 0; i < landPosts.length; i++) {
      drawWood(c, landPosts[i].x, landPosts[i].y, landPosts[i].w, landPosts[i].h);
    }
    drawWood(c, level.ledge.x - 4, level.ledge.y, level.ledge.w + 8, level.ledge.h);
    if (level.landing.ice) {
      drawIceDeck(c, level.landing.x - 4, level.landing.y, level.landing.w + 8, level.landing.h);
    } else {
      drawWood(c, level.landing.x - 4, level.landing.y, level.landing.w + 8, level.landing.h);
    }
    var extras = level.extras || [];
    for (i = 0; i < extras.length; i++) {
      var ex = extras[i];
      if (ex.type === "wall") drawWall(c, ex.x, ex.y, ex.w, ex.h);
      else if (ex.type === "ice") drawIceDeck(c, ex.x, ex.y, ex.w, ex.h);
      else drawWood(c, ex.x, ex.y, ex.w, ex.h);
    }
    if (level.backstop) {
      c.save();
      c.strokeStyle = "#2a2218";
      c.lineWidth = 4;
      c.lineCap = "round";
      sketchLine(c, level.backstop.x + 8, level.backstop.y + 4, level.backstop.x + 10, level.ledge.y + 2, 0.8);
      sketchLine(c, level.backstop.x - 2, level.backstop.y + 18, level.backstop.x + 20, level.backstop.y + 16, 0.6);
      c.restore();
    }
    drawGapHatch(c);
    drawGrass(c);
  }

  function drawHint(c) {
    if (state !== STATE_DRAW || strokes.length || !level) return;
    c.save();
    c.setLineDash([8, 10]);
    c.strokeStyle = "rgba(212,84,42,0.38)";
    c.lineWidth = 3;
    c.lineCap = "round";
    var sx = level.ledge.x + level.ledge.w - 6;
    var sy = level.ledge.y + 2;
    var ex = level.landing.x + 10;
    var ey = level.landing.y;
    c.beginPath();
    c.moveTo(sx, sy);
    c.bezierCurveTo(sx + 50, sy + 90, (sx + ex) * 0.5, ey - 30, ex, ey);
    c.stroke();
    c.setLineDash([]);
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
    if (!level || !level.star || starGot) return;
    var pulse = 1 + 0.04 * Math.sin((lastTs || 0) * 0.008);
    c.save();
    c.translate(level.star.x, level.star.y);
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
    if (!level) return;
    var x = level.flag.x, y = level.flag.y;
    var wave = 1;
    var splat = 0;
    if (finishAnim.active && finishAnim.name === "flag-wave") {
      var k = clamp(finishAnim.t / finishAnim.dur, 0, 1);
      wave = 1 + Math.sin(k * Math.PI * 6) * 0.9;
      splat = Math.sin(k * Math.PI);
    }
    c.save();
    c.strokeStyle = "#2a2218";
    c.lineWidth = 3.2;
    c.lineCap = "round";
    sketchLine(c, x, y + 4, x - 2, y - 78, 0.5);
    c.fillStyle = "#d4542a";
    c.beginPath();
    c.moveTo(x, y - 76);
    c.lineTo(x + (38 + Math.sin((lastTs || 0) * 0.006) * 3) * wave, y - 62);
    c.lineTo(x + 6, y - 44);
    c.closePath();
    c.fill();
    c.stroke();
    if (splat > 0.05) {
      c.globalAlpha = splat;
      c.fillStyle = "#d4542a";
      for (var i = 0; i < 7; i++) {
        var a = i * 0.9 + 0.4;
        c.beginPath();
        c.arc(x + 22 + Math.cos(a) * 18 * splat, y - 60 + Math.sin(a) * 14 * splat, 4 + (i % 3), 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
    }
    c.restore();
  }

  function drawPops(c) {
    for (var i = 0; i < pops.length; i++) {
      var p = pops[i];
      c.save();
      c.globalAlpha = clamp(p.life / 420, 0, 1);
      if (p.kind === "dust") {
        c.fillStyle = "#8a7a5c";
        c.strokeStyle = "#2a2218";
      } else {
        c.fillStyle = "#e6b423";
        c.strokeStyle = "#2a2218";
      }
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

  function drawRiderAndWagon(c, x, y, ang, pose) {
    pose = pose || {};
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    if (pose.squash) c.scale(1 + (pose.squash - 1) * 0.35, 1 / pose.squash);
    if (pose.crumple > 0) {
      var cr = pose.crumple;
      c.strokeStyle = "#2a2218";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(-22, 4);
      for (var s = 1; s < 9; s++) {
        c.lineTo(-22 + s * 6, 4 + Math.sin(s * 2.4 + cr * 8) * (6 + cr * 10));
      }
      c.stroke();
      c.beginPath();
      c.arc(0, -6, 16 * (1 - cr * 0.4), 0.2, Math.PI * 1.6);
      c.stroke();
      c.restore();
      return;
    }
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
    if (!pose.hideRider) {
      var rx = pose.riderX || 0;
      var ry = pose.riderY || 0;
      var ra = pose.riderAng || 0;
      c.save();
      c.translate(rx, ry);
      c.rotate(ra);
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
      if (pose.arms === "up") {
        c.beginPath();
        c.moveTo(-1, -28);
        c.lineTo(-16, -48);
        c.moveTo(-1, -26);
        c.lineTo(18, -50);
        c.stroke();
      } else {
        c.beginPath();
        c.moveTo(-1, -28);
        c.lineTo(-18, -12);
        c.moveTo(-1, -26);
        c.lineTo(17, -11);
        c.stroke();
      }
      c.restore();
    }
    c.restore();
  }

  function liveCartPose() {
    if (cart && (state === STATE_RUN || state === STATE_WIN || state === STATE_FAIL)) {
      return {
        x: cart.chassis.position.x,
        y: cart.chassis.position.y,
        ang: cart.chassis.angle,
        wax: cart.wheelA.position.x,
        way: cart.wheelA.position.y,
        wa: cart.wheelA.angle,
        wbx: cart.wheelB.position.x,
        wby: cart.wheelB.position.y,
        wb: cart.wheelB.angle
      };
    }
    var sp = level ? spawnPoint() : { x: 114, wy: 785, cy: 774 };
    return {
      x: sp.x, y: sp.cy, ang: 0,
      wax: sp.x - 20, way: sp.wy, wa: 0,
      wbx: sp.x + 20, wby: sp.wy, wb: 0
    };
  }

  function animPose(base) {
    if (!finishAnim.active) return base;
    var k = clamp(finishAnim.t / finishAnim.dur, 0, 1);
    var e = easeOut(k);
    var pose = {
      x: base.x, y: base.y, ang: base.ang,
      wax: base.wax, way: base.way, wa: base.wa,
      wbx: base.wbx, wby: base.wby, wb: base.wb
    };
    switch (finishAnim.name) {
      case "hop":
        pose.y -= Math.sin(k * Math.PI) * 56;
        pose.way -= Math.sin(k * Math.PI) * 56;
        pose.wby -= Math.sin(k * Math.PI) * 56;
        pose.arms = "up";
        break;
      case "bow":
        pose.ang += Math.sin(k * Math.PI) * 0.95;
        break;
      case "turtle":
        pose.ang = Math.PI + Math.sin(k * 10) * 0.14 * (1 - k);
        pose.y -= 14;
        break;
      case "bonk":
        pose.crumple = e;
        break;
      case "yeet":
        pose.riderX = k * 86;
        pose.riderY = k * k * 96 - Math.sin(k * Math.PI) * 36;
        pose.riderAng = k * 2.5;
        break;
      case "dirt":
        pose.y += e * 42;
        pose.way += e * 42;
        pose.wby += e * 42;
        pose.squash = 1 + e * 0.6;
        break;
      case "stuck":
        if (k < 0.55) {
          pose.x += Math.sin(k * 48) * 3.2;
          pose.wax += Math.sin(k * 48) * 3.2;
          pose.wbx += Math.sin(k * 48) * 3.2;
        } else {
          pose.ang += (k - 0.55) * 1.1;
          pose.y += (k - 0.55) * 18;
        }
        break;
      default:
        break;
    }
    return pose;
  }

  function drawCart(c) {
    var pose = animPose(liveCartPose());
    if (pose.crumple) {
      drawRiderAndWagon(c, pose.x, pose.y, pose.ang, pose);
      return;
    }
    drawWheelDoodle(c, pose.wax, pose.way, pose.wa, 13);
    drawWheelDoodle(c, pose.wbx, pose.wby, pose.wb, 13);
    drawRiderAndWagon(c, pose.x, pose.y, pose.ang, pose);
  }

  function drawStamp(c) {
    if (!finishAnim.active || finishAnim.name !== "stamp" || !finishAnim.stamp) return;
    var k = clamp(finishAnim.t / finishAnim.dur, 0, 1);
    var punch = k < 0.18 ? k / 0.18 : 1;
    var fade = k > 0.82 ? 1 - (k - 0.82) / 0.18 : 1;
    c.save();
    c.translate(DESIGN_W * 0.5, 340);
    c.rotate(-0.16);
    c.scale(0.85 + punch * 0.55, 0.85 + punch * 0.55);
    c.globalAlpha = fade;
    c.strokeStyle = "#d4542a";
    c.fillStyle = "rgba(212,84,42,0.14)";
    c.lineWidth = 5;
    c.font = "700 54px Segoe Print, Comic Sans MS, cursive";
    c.textAlign = "center";
    c.textBaseline = "middle";
    var w = c.measureText(finishAnim.stamp).width + 36;
    c.beginPath();
    c.rect(-w * 0.5, -34, w, 68);
    c.fill();
    c.stroke();
    c.fillStyle = "#d4542a";
    c.fillText(finishAnim.stamp, 0, 2);
    c.restore();
  }

  function drawAnimScribble(c) {
    if (!finishAnim.active) return;
    var k = clamp(finishAnim.t / finishAnim.dur, 0, 1);
    var word = "";
    if (finishAnim.name === "turtle") word = "WHOOPS";
    else if (finishAnim.name === "bonk") word = "BONK";
    else if (finishAnim.name === "yeet") word = "YEET";
    else if (finishAnim.name === "dirt") word = "FWUMP";
    else if (finishAnim.name === "stuck") word = "SIGH";
    else if (finishAnim.name === "hop") word = "YEEHAW";
    else if (finishAnim.name === "bow") word = "THANK U";
    if (!word || finishAnim.name === "stamp") return;
    var fade = k < 0.15 ? k / 0.15 : (k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1);
    c.save();
    c.globalAlpha = fade;
    c.fillStyle = "#d4542a";
    c.strokeStyle = "#2a2218";
    c.lineWidth = 2;
    c.font = "700 28px Segoe Print, Comic Sans MS, cursive";
    c.textAlign = "center";
    c.translate(DESIGN_W * 0.5 + Math.sin(k * 8) * 3, 300);
    c.rotate(-0.12);
    c.fillText(word, 0, 0);
    c.restore();
  }

  function drawStarBurstAnim(c) {
    if (!finishAnim.active || finishAnim.name !== "star-burst") return;
    var k = clamp(finishAnim.t / finishAnim.dur, 0, 1);
    var pose = liveCartPose();
    var n = 8;
    c.save();
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + 0.2;
      var r = 20 + k * 70;
      c.globalAlpha = 1 - k;
      c.fillStyle = "#e6b423";
      c.strokeStyle = "#2a2218";
      c.lineWidth = 2;
      c.translate(0, 0);
      drawStarShape(c, pose.x + Math.cos(a) * r, pose.y - 20 + Math.sin(a) * r, 9 + (i % 3), k * 2);
      c.fill();
      c.stroke();
    }
    c.restore();
  }


  function updateCamera() {
    var targetZ = state === STATE_RUN ? 1.1 : 1;
    camZ += (targetZ - camZ) * 0.08;
    var tx = DESIGN_W * 0.5;
    var ty = DESIGN_H * 0.5;
    if (cart && state === STATE_RUN) {
      tx = cart.chassis.position.x + 24;
      ty = cart.chassis.position.y - 40;
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
    drawStarBurstAnim(ctx);
    drawStamp(ctx);
    drawAnimScribble(ctx);

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
        if (driveLeft > 0) {
          driveWheels();
          driveLeft -= STEP;
        }
        Matter.Engine.update(engine, STEP);
        settleChassis();
        acc -= STEP;
      }
      timeMs = ts - runStart;
      checkEnd();
    }

    if (finishAnim.active) {
      finishAnim.t += dt;
      if (finishAnim.t > finishAnim.dur + 200) finishAnim.t = finishAnim.dur + 200;
    }

    if (ended && !resultShown) {
      resultTimer += dt;
      if (resultTimer >= RESULT_DELAY_MS) showResult(state === STATE_WIN);
    }

    if (shake > 0.4) shake *= 0.86;
    else shake = 0;
    tickPops(dt);
    updateCamera();
    render();
  }

  function canRetryNow() {
    return ended && resultShown;
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
    if (el.btnNext) {
      el.btnNext.addEventListener("click", function (e) {
        e.preventDefault();
        goNextYard();
      });
    }
    if (el.yardChip) {
      el.yardChip.addEventListener("click", function (e) {
        e.preventDefault();
        if (state === STATE_DRAW) toggleYardList();
      });
    }
    window.addEventListener("keydown", function (e) {
      if (e.key === "g" || e.key === "G" || e.key === "Enter") {
        if (state === STATE_DRAW) go();
      } else if (e.key === "r" || e.key === "R") {
        resetToDraw(true);
      } else if (e.key === " ") {
        if (canRetryNow()) { resetToDraw(false); go(); }
        e.preventDefault();
      } else if (e.key === "n" || e.key === "N") {
        if (canRetryNow() && state === STATE_WIN && levelIndex + 1 < LEVELS.length) goNextYard();
      } else if (e.key === "Escape") {
        hideYardList();
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
    el.btnNext = document.getElementById("btnNext");
    el.inkFill = document.getElementById("inkFill");
    el.inkPct = document.getElementById("inkPct");
    el.hint = document.getElementById("hint");
    el.attemptChip = document.getElementById("attemptChip");
    el.yardChip = document.getElementById("yardChip");
    el.yardList = document.getElementById("yardList");
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
    if (!LEVELS.length) {
      showBootError();
      return;
    }
    canvas.style.touchAction = "none";
    seedPaper();
    resize();
    window.addEventListener("resize", resize);
    var startIdx = loadProgress();
    loadLevel(startIdx, { clearLine: true });
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
