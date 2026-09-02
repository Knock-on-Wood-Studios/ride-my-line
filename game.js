/* Ride My Line — Knock on Wood Studios
   Vanilla Matter.js production game. Vehicle cart, not liquid. */
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
  var STORAGE_MEDALS = "kow.rideMyLine.medals";
  var STORAGE_BESTS = "kow.rideMyLine.bests";
  var STORAGE_WIN_ANIM = "kow.rideMyLine.lastWinAnim";
  var STORAGE_FAIL_ANIM = "kow.rideMyLine.lastFailAnim";
  var STORAGE_MUTED = "kow.rideMyLine.muted";
  var STORAGE_VERSION = "kow.rideMyLine.storageVersion";
  var STORAGE_MUSIC = "kow.rideMyLine.music";
  var STORAGE_EFFECTS = "kow.rideMyLine.effects";
  var STORAGE_VOICES = "kow.rideMyLine.voices";
  var CURRENT_STORAGE_VERSION = 3;

  var localHost = typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "::1");
  var devMode = localHost && new URLSearchParams(window.location.search).get("production") !== "1";

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
  var strokePending = false;
  var strokeInvalid = false;
  var strokeStartAnchor = -1;
  var engine = null;
  var cart = null;
  var trackBodies = [];
  var checkpointBodies = [];
  var checkpointHits = [];
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
  var finishHoldMs = 0;
  var cargoBroken = false;
  var bestMedals = {};
  var bestResults = {};
  var lastRunRecord = null;
  var hintTimer = 0;
  var groundGraceMs = 0;
  var airborneMs = 0;
  var longestAirMs = 0;
  var maxRunSpeed = 0;
  var maxImpactSeen = 0;
  var checkpointRejectMs = -1000;
  var flightVoiceStage = 0;
  var impactPulse = 0;
  var lastImpactSoundMs = -1000;
  var rollSoundMs = 0;
  var windActiveMs = 0;
  var windSoundMs = 0;
  var pencilSoundMs = 0;
  var reduceMotion = false;
  var motionQuery = null;
  var keyboardCursor = { x: 0, y: 0 };
  var keyboardDrawing = false;
  var resultReturnFocus = null;
  var frameId = 0;
  var pageVisible = !document.hidden;
  var hiddenAt = 0;
  var staticLayer = null;
  var staticLayerLevel = "";
  var renderCount = 0;
  var storageAvailable = true;
  var resetProgressArmed = false;
  var resetProgressTimer = 0;
  var lastInputMethod = "unknown";
  var lastWinAnim = "";
  var lastFailAnim = "";
  var lastStamp = "";
  var orientationQuery = null;
  var orientationDismissed = false;
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

  var SOUND = window.RML_AUDIO || {
    unlock: function () { return false; },
    startMusic: function () {},
    play: function () {},
    say: function () {},
    impact: function () {},
    setMode: function () {},
    setMuted: function () {},
    isMuted: function () { return true; },
    setVisible: function () {},
    setSettings: function () {},
    getSettings: function () { return { music: false, sfx: false, voices: false }; },
    debug: function () {
      return { state: "unavailable", mode: "silent", musicStarted: false, realAssets: false, loadedSamples: 0, failedSamples: ["audio-director"] };
    }
  };
  var TELEMETRY = window.RML_TELEMETRY || {
    track: function () {},
    flush: function () {},
    isEnabled: function () { return false; }
  };


  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function formatScore(value) {
    value = Math.max(0, Math.round(Number(value) || 0));
    try { return value.toLocaleString("en-US"); } catch (error) { return String(value); }
  }

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

  function levelRules() {
    return (level && level.rules) || {};
  }

  function levelContract() {
    return (level && level.contract) || {};
  }

  function levelPhysics() {
    return (level && level.physics) || {};
  }

  function maxStrokes() {
    var n = levelRules().maxStrokes;
    return n == null ? 99 : Math.max(1, n);
  }

  function trackMaterial() {
    return levelRules().material || "chalk";
  }

  function pointInBox(p, box, pad) {
    pad = pad || 0;
    return p.x >= box.x - pad && p.x <= box.x + box.w + pad &&
      p.y >= box.y - pad && p.y <= box.y + box.h + pad;
  }

  function pointIssue(p) {
    var rules = levelRules();
    var zones = rules.drawZones || [];
    var noDraw = rules.noDrawZones || [];
    var inZone = !zones.length;
    var i;
    for (i = 0; i < zones.length; i++) {
      if (pointInBox(p, zones[i], 2)) { inZone = true; break; }
    }
    if (!inZone) return "outside";
    for (i = 0; i < noDraw.length; i++) {
      if (pointInBox(p, noDraw[i], 5)) return "no-draw";
    }
    return "";
  }

  function pointAllowed(p) {
    return !pointIssue(p);
  }

  function nearestAnchor(p, maxDist, exceptIndex) {
    var anchors = levelRules().anchors || [];
    var best = -1;
    var bestDist = maxDist == null ? 40 : maxDist;
    for (var i = 0; i < anchors.length; i++) {
      if (i === exceptIndex) continue;
      var d = hypot(p.x, p.y, anchors[i].x, anchors[i].y);
      if (d <= bestDist) { best = i; bestDist = d; }
    }
    return best;
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
    var requestedDpr = Math.min(window.devicePixelRatio || 1, 2);
    var pixelBudgetDpr = Math.sqrt(4000000 / Math.max(1, w * h));
    var dpr = Math.max(0.75, Math.min(requestedDpr, pixelBudgetDpr));
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
    requestFrame();
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
      storageAvailable = false;
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (err) {
      storageAvailable = false;
      return false;
    }
  }

  function resetCampaignProgress() {
    if (resetProgressTimer) window.clearTimeout(resetProgressTimer);
    resetProgressTimer = 0;
    resetProgressArmed = false;
    bestMedals = {};
    bestResults = {};
    unlockedCount = 1;
    lastWinAnim = "";
    lastFailAnim = "";
    storageSet(STORAGE_UNLOCK, "1");
    storageSet(STORAGE_LAST, LEVELS[0] ? LEVELS[0].id : "");
    storageSet(STORAGE_MEDALS, "{}");
    storageSet(STORAGE_BESTS, "{}");
    storageSet(STORAGE_WIN_ANIM, "");
    storageSet(STORAGE_FAIL_ANIM, "");
    TELEMETRY.track("progress_reset", { yard: LEVELS[0] ? LEVELS[0].id : "none", input: lastInputMethod });
    hideYardList();
    loadLevel(0, { clearLine: true });
    announceStatus("Campaign progress reset. Yard 1 is ready.");
    canvas.focus();
  }

  function armProgressReset(button) {
    if (resetProgressArmed) {
      resetCampaignProgress();
      return;
    }
    resetProgressArmed = true;
    button.textContent = "CONFIRM RESET";
    button.setAttribute("aria-label", "Confirm reset campaign progress");
    announceStatus("Press Confirm Reset to erase records, medals, and locked-yard progress. Sound settings will stay unchanged.");
    if (resetProgressTimer) window.clearTimeout(resetProgressTimer);
    resetProgressTimer = window.setTimeout(function () {
      resetProgressArmed = false;
      resetProgressTimer = 0;
      if (button && button.isConnected) {
        button.textContent = "RESET PROGRESS";
        button.setAttribute("aria-label", "Reset campaign progress");
      }
    }, 6000);
  }

  function cancelProgressReset() {
    resetProgressArmed = false;
    if (resetProgressTimer) window.clearTimeout(resetProgressTimer);
    resetProgressTimer = 0;
  }

  function migrateStorage() {
    var version = parseInt(storageGet(STORAGE_VERSION, "0"), 10) || 0;
    if (version < 2) {
      var medals = storageGet(STORAGE_MEDALS, "{}");
      try { JSON.parse(medals); } catch (error) { storageSet(STORAGE_MEDALS, "{}"); }
      storageSet(STORAGE_MUSIC, storageGet(STORAGE_MUSIC, "1"));
      storageSet(STORAGE_EFFECTS, storageGet(STORAGE_EFFECTS, "1"));
      storageSet(STORAGE_VOICES, storageGet(STORAGE_VOICES, "1"));
    }
    if (version < 3) storageSet(STORAGE_BESTS, storageGet(STORAGE_BESTS, "{}"));
    storageSet(STORAGE_VERSION, String(CURRENT_STORAGE_VERSION));
  }

  function parseBestResults(raw) {
    var parsed;
    var clean = {};
    try { parsed = JSON.parse(raw || "{}"); } catch (error) { return clean; }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return clean;
    for (var i = 0; i < LEVELS.length; i++) {
      var id = LEVELS[i].id;
      var item = parsed[id];
      if (!item || typeof item !== "object") continue;
      var score = Number(item.score);
      var time = Number(item.timeMs);
      var ink = Number(item.inkPercent);
      var medals = Number(item.medals);
      if (!Number.isFinite(score) || score < 0 || score > 100000) continue;
      clean[id] = {
        score: Math.round(score),
        timeMs: Number.isFinite(time) ? Math.round(clamp(time, 0, 60000)) : 60000,
        inkPercent: Number.isFinite(ink) ? Math.round(clamp(ink, 0, 100)) : 100,
        medals: Number.isFinite(medals) ? Math.round(clamp(medals, 0, 3)) : 0
      };
    }
    return clean;
  }

  function loadAudioSettings() {
    return {
      music: storageGet(STORAGE_MUSIC, "1") !== "0",
      sfx: storageGet(STORAGE_EFFECTS, "1") !== "0",
      voices: storageGet(STORAGE_VOICES, "1") !== "0"
    };
  }

  function loadProgress() {
    lastWinAnim = storageGet(STORAGE_WIN_ANIM, "");
    lastFailAnim = storageGet(STORAGE_FAIL_ANIM, "");
    try {
      bestMedals = JSON.parse(storageGet(STORAGE_MEDALS, "{}")) || {};
    } catch (err) {
      bestMedals = {};
    }
    bestResults = parseBestResults(storageGet(STORAGE_BESTS, "{}"));
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

  function persistMedals() {
    storageSet(STORAGE_MEDALS, JSON.stringify(bestMedals));
  }

  function persistBestResults() {
    storageSet(STORAGE_BESTS, JSON.stringify(bestResults));
  }

  function updateSoundHud() {
    if (!el.soundToggle) return;
    var on = !SOUND.isMuted();
    var settings = SOUND.getSettings();
    el.soundToggle.textContent = on ? "SOUND ON" : "SOUND OFF";
    el.soundToggle.setAttribute("aria-label", "Sound settings, " + (on ? "sound on" : "sound muted"));
    updateAudioSwitch(el.masterAudioToggle, on);
    updateAudioSwitch(el.musicToggle, settings.music);
    updateAudioSwitch(el.effectsToggle, settings.sfx);
    updateAudioSwitch(el.voicesToggle, settings.voices);
    updateAudioDebug();
  }

  function updateAudioSwitch(button, on) {
    if (!button) return;
    button.setAttribute("aria-checked", on ? "true" : "false");
    var value = button.querySelector("strong");
    if (value) value.textContent = on ? "ON" : "OFF";
  }

  function updateAudioDebug() {
    if (!document.body) return;
    var debug = SOUND.debug();
    document.body.dataset.audioState = debug.state;
    document.body.dataset.audioMode = debug.mode;
    document.body.dataset.audioMusic = debug.musicStarted ? "started" : "idle";
    document.body.dataset.audioSource = debug.realAssets ? "licensed-assets" : "unavailable";
    document.body.dataset.audioSamples = String(debug.loadedSamples || 0);
    document.body.dataset.audioFailures = (debug.failedSamples || []).join(",");
  }

  function toggleSound() {
    var muted = !SOUND.isMuted();
    SOUND.setMuted(muted);
    storageSet(STORAGE_MUTED, muted ? "1" : "0");
    updateSoundHud();
    if (!muted) {
      SOUND.unlock(false);
      SOUND.play("toggle", 0.5);
    }
    window.setTimeout(updateAudioDebug, 80);
  }

  function toggleAudioCategory(category) {
    var settings = SOUND.getSettings();
    settings[category] = !settings[category];
    SOUND.setSettings(settings);
    if (category === "music") storageSet(STORAGE_MUSIC, settings.music ? "1" : "0");
    else if (category === "sfx") storageSet(STORAGE_EFFECTS, settings.sfx ? "1" : "0");
    else if (category === "voices") storageSet(STORAGE_VOICES, settings.voices ? "1" : "0");
    updateSoundHud();
    if (settings.sfx && category === "sfx") SOUND.play("toggle", 0.45);
  }

  function hideAudioPanel() {
    if (!el.audioPanel) return;
    el.audioPanel.classList.add("hidden");
    if (el.soundToggle) el.soundToggle.setAttribute("aria-expanded", "false");
  }

  function toggleAudioPanel() {
    if (!el.audioPanel) return;
    var opening = el.audioPanel.classList.contains("hidden");
    hideYardList();
    if (!opening) {
      hideAudioPanel();
      return;
    }
    el.audioPanel.classList.remove("hidden");
    el.soundToggle.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(function () { el.masterAudioToggle.focus(); });
  }


  function updateInkHud() {
    var used = totalInk();
    var max = inkMax();
    var left = clamp(1 - used / max, 0, 1);
    if (el.inkFill) {
      el.inkFill.style.transform = "scaleX(" + left.toFixed(4) + ")";
      if (left < 0.22) el.inkFill.classList.add("low");
      else el.inkFill.classList.remove("low");
    }
    if (el.inkPct) el.inkPct.textContent = Math.round(left * 100) + "%";
    if (el.inkTrack) {
      el.inkTrack.setAttribute("aria-valuenow", String(Math.round(left * 100)));
      el.inkTrack.setAttribute("aria-valuetext", Math.round(left * 100) + "% ink remaining");
    }
    if (el.inkLabel) el.inkLabel.textContent = trackMaterial() === "chalk" ? "INK" : trackMaterial().toUpperCase();
    updateCanvasDescription();
    requestFrame();
  }

  function updateCanvasDescription() {
    if (!canvas || !level) return;
    var left = Math.round(clamp(1 - totalInk() / inkMax(), 0, 1) * 100);
    canvas.setAttribute(
      "aria-label",
      "Yard " + (levelIndex + 1) + " of " + LEVELS.length + ", " + level.name + ". " +
      level.objective + ". " + levelRuleDescription() + " " + left + "% ink remaining."
    );
  }

  function levelRuleDescription() {
    if (!level) return "";
    var rules = levelRules();
    var details = [];
    if ((rules.drawZones || []).length) details.push("Draw only inside the green dashed boxes.");
    if ((rules.noDrawZones || []).length) details.push("Red crossed boxes do not accept ink.");
    if ((rules.anchors || []).length) details.push("Each line must connect two orange pins.");
    if ((level.checkpoints || []).length) details.push("Pass the numbered directional rings in order.");
    if ((level.fields || []).length) details.push("Arrow-marked wind zones push the cart.");
    if ((level.extras || []).length) details.push("Wooden obstacles are solid.");
    if (rules.material === "rubber") details.push("Rubber ink rebounds.");
    else if (rules.material === "ice") details.push("Ice ink preserves speed.");
    if (level.cargo) details.push("Protect the fragile cargo.");
    details.push("Use at most " + rules.maxStrokes + (rules.maxStrokes === 1 ? " line." : " lines."));
    return details.join(" ");
  }

  function announceStatus(message) {
    if (el.gameStatus) el.gameStatus.textContent = message;
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
      if (i === 0 || i === 12) {
        var section = document.createElement("p");
        section.className = "yard-section";
        section.textContent = i === 0 ? "OPENING RUN · 1–12" : "MASTERY RUN · 13–25";
        el.yardList.appendChild(section);
      }
      var btn = document.createElement("button");
      btn.type = "button";
      var open = i < unlockedCount;
      btn.disabled = !open;
      var savedMedals = bestMedals[LEVELS[i].id] || 0;
      var savedResult = bestResults[LEVELS[i].id];
      var medalTag = savedMedals ? "  ·  " + savedMedals + "/3" : "";
      var scoreTag = savedResult ? "  ·  " + formatScore(savedResult.score) : "";
      btn.textContent = open
        ? (i + 1) + "  " + LEVELS[i].name + medalTag + scoreTag
        : (i + 1) + "  —";
      if (open) {
        var recordLabel = savedResult ? ", best score " + formatScore(savedResult.score) : ", not yet cleared";
        btn.setAttribute("aria-label", "Yard " + (i + 1) + ", " + LEVELS[i].name + ", " + savedMedals + " of 3 medals" + recordLabel);
      } else {
        btn.setAttribute("aria-label", "Yard " + (i + 1) + ", locked");
      }
      if (i === levelIndex) {
        btn.className = "current";
        btn.setAttribute("aria-current", "step");
      }
      btn.setAttribute("data-yard", String(i));
      if (open) {
        btn.addEventListener("click", (function (idx) {
          return function (e) {
            e.preventDefault();
            hideYardList();
            if (idx !== levelIndex) loadLevel(idx, { clearLine: true });
            canvas.focus();
          };
        })(i));
      }
      el.yardList.appendChild(btn);
    }
    var reset = document.createElement("button");
    reset.type = "button";
    reset.className = "yard-reset";
    reset.textContent = resetProgressArmed ? "CONFIRM RESET" : "RESET PROGRESS";
    reset.setAttribute("aria-label", resetProgressArmed ? "Confirm reset campaign progress" : "Reset campaign progress");
    reset.addEventListener("click", function (e) {
      e.preventDefault();
      armProgressReset(reset);
    });
    el.yardList.appendChild(reset);
  }

  function hideYardList() {
    if (!el.yardList) return;
    cancelProgressReset();
    el.yardList.classList.add("hidden");
    if (el.yardChip) el.yardChip.setAttribute("aria-expanded", "false");
  }

  function toggleYardList() {
    if (!el.yardList) return;
    var open = el.yardList.classList.contains("hidden");
    if (open) {
      hideAudioPanel();
      renderYardList();
      el.yardList.classList.remove("hidden");
      if (el.yardChip) el.yardChip.setAttribute("aria-expanded", "true");
      window.requestAnimationFrame(function () {
        var current = el.yardList.querySelector("button.current:not(:disabled)");
        var first = el.yardList.querySelector("button:not(:disabled)");
        if (current || first) (current || first).focus();
      });
    } else {
      hideYardList();
    }
  }

  function canDraw() {
    return state === STATE_DRAW && strokes.length < maxStrokes() && totalInk() < inkMax() - 0.5;
  }

  function clearHintNudge() {
    if (!hintTimer) return;
    window.clearTimeout(hintTimer);
    hintTimer = 0;
  }

  function showDrawNudge(message) {
    clearHintNudge();
    if (el.hint) el.hint.textContent = message;
    var activeLevel = level;
    hintTimer = window.setTimeout(function () {
      hintTimer = 0;
      if (state === STATE_DRAW && level === activeLevel) setHintDraw();
    }, 1100);
  }

  function nudgePointIssue(issue) {
    if (issue === "no-draw") showDrawNudge("RED X = NO INK");
    else if (issue === "outside") showDrawNudge("DRAW INSIDE GREEN DASHES");
  }

  function onPointerDown(e) {
    if (state !== STATE_DRAW) return;
    lastInputMethod = e.type.indexOf("touch") === 0 ? "touch" : "pointer";
    hideYardList();
    if (!canDraw()) {
      e.preventDefault();
      showDrawNudge(strokes.length >= maxStrokes() ? "LINE USED · reset to redraw" : "OUT OF INK · reset to redraw");
      return;
    }
    e.preventDefault();
    SOUND.unlock(false);
    var p = eventPoint(e);
    var issue = pointIssue(p);
    if (issue) {
      nudgePointIssue(issue);
      return;
    }
    var anchors = levelRules().anchors || [];
    strokeStartAnchor = -1;
    if (anchors.length) {
      strokeStartAnchor = nearestAnchor(p, 44, -1);
      if (strokeStartAnchor < 0) {
        showDrawNudge("START ON A PIN");
        return;
      }
      p = { x: anchors[strokeStartAnchor].x, y: anchors[strokeStartAnchor].y };
    }
    drawing = true;
    strokePending = true;
    strokeInvalid = false;
    strokes.push([p]);
    SOUND.play("pencil", 0.36);
    pencilSoundMs = 72;
    updateInkHud();
  }

  function onPointerMove(e) {
    if (!drawing || state !== STATE_DRAW) return;
    e.preventDefault();
    var p = eventPoint(e);
    var stroke = strokes[strokes.length - 1];
    if (!stroke || !stroke.length) return;
    var issue = pointIssue(p);
    if (issue) {
      drawing = false;
      strokeInvalid = true;
      nudgePointIssue(issue);
      return;
    }
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
      showDrawNudge("OUT OF INK · tap GO or reset");
      return;
    }
    stroke.push(p);
    if (pencilSoundMs <= 0) {
      SOUND.play("pencil", clamp(d / 18, 0.25, 0.9));
      pencilSoundMs = 70;
    }
    updateInkHud();
  }

  function onPointerUp(e) {
    if (!strokePending) return;
    e.preventDefault();
    drawing = false;
    strokePending = false;
    var stroke = strokes[strokes.length - 1];
    var anchors = levelRules().anchors || [];
    if (anchors.length && stroke && !strokeInvalid) {
      var endPoint = eventPoint(e);
      var endAnchor = nearestAnchor(endPoint, 48, strokeStartAnchor);
      if (endAnchor < 0) {
        strokeInvalid = true;
        showDrawNudge("END ON THE OTHER PIN");
      } else {
        stroke.push({ x: anchors[endAnchor].x, y: anchors[endAnchor].y });
      }
    }
    if (strokeInvalid || (stroke && stroke.length < 2)) {
      strokes.pop();
      if (!strokeInvalid) showDrawNudge("DRAW A LONGER LINE");
    }
    strokeInvalid = false;
    strokeStartAnchor = -1;
    updateInkHud();
  }

  function resetKeyboardCursor() {
    var anchors = levelRules().anchors || [];
    var start = anchors.length
      ? anchors[0]
      : { x: level.ledge.x + level.ledge.w - 10, y: level.ledge.y + 12 };
    keyboardCursor = { x: start.x, y: start.y };
    keyboardDrawing = false;
  }

  function startKeyboardStroke() {
    if (!canDraw()) {
      var exhausted = strokes.length >= maxStrokes() ? "All lines are already used." : "No ink remains.";
      showDrawNudge(exhausted.toUpperCase());
      announceStatus(exhausted + " Reset the line to draw again.");
      return;
    }
    var point = { x: keyboardCursor.x, y: keyboardCursor.y };
    var issue = pointIssue(point);
    if (issue) {
      nudgePointIssue(issue);
      announceStatus(issue === "no-draw" ? "The pen is inside a red no-ink area." : "The pen is outside the green drawing area.");
      return;
    }
    var anchors = levelRules().anchors || [];
    strokeStartAnchor = -1;
    if (anchors.length) {
      strokeStartAnchor = nearestAnchor(point, 44, -1);
      if (strokeStartAnchor < 0) {
        showDrawNudge("START ON A PIN");
        announceStatus("Move the pen onto a pin before starting this line.");
        return;
      }
      point = { x: anchors[strokeStartAnchor].x, y: anchors[strokeStartAnchor].y };
      keyboardCursor = { x: point.x, y: point.y };
    }
    strokes.push([point]);
    keyboardDrawing = true;
    SOUND.unlock(false);
    SOUND.play("pencil", 0.36);
    updateInkHud();
    announceStatus("Line started. Use the arrow keys to draw, then press Space to finish.");
  }

  function finishKeyboardStroke() {
    var stroke = strokes[strokes.length - 1];
    if (!keyboardDrawing || !stroke) return;
    var anchors = levelRules().anchors || [];
    if (anchors.length) {
      var endAnchor = nearestAnchor(keyboardCursor, 48, strokeStartAnchor);
      if (endAnchor < 0) {
        showDrawNudge("END ON THE OTHER PIN");
        announceStatus("Move the pen onto the other pin before finishing this line.");
        return;
      }
      var endPoint = { x: anchors[endAnchor].x, y: anchors[endAnchor].y };
      if (hypot(keyboardCursor.x, keyboardCursor.y, endPoint.x, endPoint.y) > 0.5) stroke.push(endPoint);
      keyboardCursor = endPoint;
    }
    if (stroke.length < 2) {
      strokes.pop();
      announceStatus("The line was too short and was removed.");
    } else {
      announceStatus("Line finished. Press Enter to run it, or move the pen and press Space to add another line.");
    }
    keyboardDrawing = false;
    strokeStartAnchor = -1;
    updateInkHud();
  }

  function cancelKeyboardStroke() {
    if (!keyboardDrawing) return false;
    strokes.pop();
    keyboardDrawing = false;
    strokeStartAnchor = -1;
    updateInkHud();
    announceStatus("Active line cancelled.");
    return true;
  }

  function moveKeyboardCursor(dx, dy) {
    var candidate = {
      x: clamp(keyboardCursor.x + dx, 0, DESIGN_W),
      y: clamp(keyboardCursor.y + dy, 0, DESIGN_H)
    };
    if (!keyboardDrawing) {
      keyboardCursor = candidate;
      requestFrame();
      return;
    }
    var issue = pointIssue(candidate);
    if (issue) {
      nudgePointIssue(issue);
      announceStatus(issue === "no-draw" ? "Cannot draw through the red no-ink area." : "Cannot draw outside the green area.");
      return;
    }
    var stroke = strokes[strokes.length - 1];
    var last = stroke[stroke.length - 1];
    var distance = hypot(last.x, last.y, candidate.x, candidate.y);
    var remaining = inkMax() - totalInk();
    if (distance > remaining) {
      if (remaining > 0.8) {
        var portion = remaining / distance;
        candidate = {
          x: last.x + (candidate.x - last.x) * portion,
          y: last.y + (candidate.y - last.y) * portion
        };
        stroke.push(candidate);
      }
      keyboardCursor = candidate;
      keyboardDrawing = false;
      showDrawNudge("OUT OF INK · tap GO or reset");
      announceStatus("No ink remains. Press Enter to run the line or reset it.");
      updateInkHud();
      return;
    }
    if (distance >= 2.4) stroke.push(candidate);
    keyboardCursor = candidate;
    updateInkHud();
  }

  function onCanvasKeyDown(e) {
    if (state !== STATE_DRAW) return;
    lastInputMethod = "keyboard";
    var step = e.shiftKey ? 24 : 8;
    var handled = true;
    if (e.key === "ArrowLeft") moveKeyboardCursor(-step, 0);
    else if (e.key === "ArrowRight") moveKeyboardCursor(step, 0);
    else if (e.key === "ArrowUp") moveKeyboardCursor(0, -step);
    else if (e.key === "ArrowDown") moveKeyboardCursor(0, step);
    else if (e.key === " ") {
      if (keyboardDrawing) finishKeyboardStroke();
      else startKeyboardStroke();
    } else if (e.key === "Escape") {
      handled = cancelKeyboardStroke();
    } else if (e.key === "Enter") {
      if (keyboardDrawing) finishKeyboardStroke();
      if (!keyboardDrawing && strokes.length) go();
    } else {
      handled = false;
    }
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function bindDraw() {
    canvas.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
    canvas.addEventListener("touchstart", onPointerDown, { passive: false });
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp, { passive: false });
    window.addEventListener("touchcancel", onPointerUp, { passive: false });
    canvas.addEventListener("keydown", onCanvasKeyDown);
    canvas.addEventListener("focus", function () {
      announceStatus("Keyboard drawing ready. Use arrow keys to move the pen and Space to start or finish a line.");
      requestFrame();
    });
    canvas.addEventListener("blur", requestFrame);
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
    checkpointBodies = [];
    starBody = null;
    flagBody = null;
  }

  function setupWorld() {
    destroyWorld();
    if (!level) return;
    var physics = levelPhysics();
    engine = Matter.Engine.create({ enableSleeping: false });
    engine.gravity.x = physics.gravityX != null ? physics.gravityX : 0;
    engine.gravity.y = physics.gravityY != null ? physics.gravityY : 1.56;
    engine.positionIterations = physics.positionIterations || 8;
    engine.velocityIterations = physics.velocityIterations || 7;

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
    checkpointBodies = [];
    var checkpoints = level.checkpoints || [];
    for (i = 0; i < checkpoints.length; i++) {
      var checkpointBody = Matter.Bodies.circle(checkpoints[i].x, checkpoints[i].y, checkpoints[i].r || 32, {
        isStatic: true,
        isSensor: true,
        collisionFilter: { category: CAT_WORLD, mask: CAT_CART },
        label: "checkpoint:" + i
      });
      checkpointBodies.push(checkpointBody);
      Matter.Composite.add(engine.world, checkpointBody);
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
    var physics = levelPhysics();
    var material = trackMaterial();
    var fric = (level && level.friction && level.friction.track != null) ? level.friction.track : 0.9;
    var staticFric = 1;
    var bounce = physics.trackRestitution != null ? physics.trackRestitution : 0.06;
    if (material === "rubber") {
      fric = Math.min(fric, 0.32);
      staticFric = 0.3;
      bounce = physics.rubberBounce != null ? physics.rubberBounce : 0.58;
    } else if (material === "ice") {
      fric = physics.iceFriction != null ? physics.iceFriction : 0.014;
      staticFric = fric * 1.2;
      bounce = physics.iceBounce != null ? physics.iceBounce : 0.1;
    }
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
            chamfer: { radius: Math.max(3, TRACK_THICK * 0.42) },
            angle: Math.atan2(dy, dx),
            friction: fric,
            frictionStatic: staticFric,
            restitution: bounce,
            collisionFilter: worldFilter(),
            label: "track"
          }
        );
        body.rmlMaterial = material;
        trackBodies.push(body);
        Matter.Composite.add(engine.world, body);
      }
      for (var j = 1; j < pts.length - 1; j++) {
        var joint = Matter.Bodies.circle(pts[j].x, pts[j].y, TRACK_THICK * 0.64, {
          isStatic: true,
          friction: fric,
          frictionStatic: staticFric,
          restitution: bounce,
          collisionFilter: worldFilter(),
          label: "track"
        });
        joint.rmlMaterial = material;
        trackBodies.push(joint);
        Matter.Composite.add(engine.world, joint);
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
    var physics = levelPhysics();
    var group = Matter.Body.nextGroup(true);
    var sp = spawnPoint();
    var x = sp.x;
    var wr = sp.wr;
    var wy = sp.wy;
    var cy = sp.cy;
    var push = (level && level.push) || { x: 2.4, y: 0.1 };

    var chassis = Matter.Bodies.rectangle(x, cy, 54, 18, {
      chamfer: { radius: 4 },
      density: physics.chassisDensity != null ? physics.chassisDensity : 0.00245,
      friction: physics.chassisFriction != null ? physics.chassisFriction : 0.26,
      restitution: physics.chassisBounce != null ? physics.chassisBounce : 0.045,
      collisionFilter: cartFilter(group),
      label: "chassis"
    });
    Matter.Body.setInertia(chassis, chassis.inertia * (physics.inertiaScale || 1.55));

    var wopt = {
      density: physics.wheelDensity != null ? physics.wheelDensity : 0.00155,
      friction: physics.wheelFriction != null ? physics.wheelFriction : 0.96,
      frictionStatic: physics.wheelStaticFriction != null ? physics.wheelStaticFriction : 0.99,
      restitution: physics.wheelBounce != null ? physics.wheelBounce : 0.055,
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
      bodyB: wheelA,
      stiffness: physics.suspensionStiffness != null ? physics.suspensionStiffness : 0.7,
      damping: physics.suspensionDamping != null ? physics.suspensionDamping : 0.24,
      length: physics.suspensionLength != null ? physics.suspensionLength : 7
    });
    var axB = Matter.Constraint.create({
      bodyA: chassis, pointA: { x: 20, y: 10 },
      bodyB: wheelB,
      stiffness: physics.suspensionStiffness != null ? physics.suspensionStiffness : 0.7,
      damping: physics.suspensionDamping != null ? physics.suspensionDamping : 0.24,
      length: physics.suspensionLength != null ? physics.suspensionLength : 7
    });

    var composite = Matter.Composite.create({ label: "cart" });
    Matter.Composite.add(composite, [chassis, wheelA, wheelB, axA, axB]);
    Matter.Composite.add(engine.world, composite);
    cart = { composite: composite, chassis: chassis, wheelA: wheelA, wheelB: wheelB };

    Matter.Body.setVelocity(chassis, { x: push.x, y: push.y });
    Matter.Body.setVelocity(wheelA, { x: push.x, y: push.y });
    Matter.Body.setVelocity(wheelB, { x: push.x, y: push.y });
    Matter.Body.setAngularVelocity(wheelA, physics.initialWheelSpin != null ? physics.initialWheelSpin : 0.34);
    Matter.Body.setAngularVelocity(wheelB, physics.initialWheelSpin != null ? physics.initialWheelSpin : 0.34);
    driveLeft = (level && level.driveMs != null) ? level.driveMs : 360;
  }

  function driveWheels() {
    if (!cart || driveLeft <= 0) return;
    var physics = levelPhysics();
    var MAX = physics.driveMax != null ? physics.driveMax : 0.46;
    var add = physics.driveAdd != null ? physics.driveAdd : 0.026;
    function spin(w) {
      if (w.angularVelocity < MAX) {
        Matter.Body.setAngularVelocity(w, Math.min(MAX, w.angularVelocity + add));
      }
    }
    spin(cart.wheelA);
    spin(cart.wheelB);
    if (physics.driveForceX || physics.driveForceY) {
      var driveForce = {
        x: (physics.driveForceX || 0) / 3,
        y: (physics.driveForceY || 0) / 3
      };
      Matter.Body.applyForce(cart.chassis, cart.chassis.position, driveForce);
      Matter.Body.applyForce(cart.wheelA, cart.wheelA.position, driveForce);
      Matter.Body.applyForce(cart.wheelB, cart.wheelB.position, driveForce);
    }
  }

  function applyFields() {
    if (!cart || !level) return;
    var fields = level.fields || [];
    var bodies = [cart.chassis, cart.wheelA, cart.wheelB];
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (field.type !== "wind") continue;
      for (var b = 0; b < bodies.length; b++) {
        var body = bodies[b];
        if (pointInBox(body.position, field, 0)) {
          windActiveMs = 100;
          Matter.Body.applyForce(body, body.position, {
            x: field.forceX || 0,
            y: field.forceY || 0
          });
        }
      }
    }
  }

  function settleChassis() {
    if (!cart) return;
    var stability = levelPhysics().stability;
    if (stability == null) stability = 0.008;
    if (stability <= 0) return;
    var a = wrapAngle(cart.chassis.angle);
    if (Math.abs(a) < 1.35) {
      Matter.Body.setAngularVelocity(
        cart.chassis,
        cart.chassis.angularVelocity - a * stability
      );
    }
  }

  function contactMaterial(body) {
    if (!body) return "chalk";
    if (body.rmlMaterial) return body.rmlMaterial;
    if (body.label === "ice") return "ice";
    if (body.label === "wall" || body.label === "platform") return "wood";
    return trackMaterial();
  }

  function markGrounded(pair) {
    var mover = pair.bodyA.label === "chassis" || pair.bodyA.label === "wheel" ? pair.bodyA
      : pair.bodyB.label === "chassis" || pair.bodyB.label === "wheel" ? pair.bodyB : null;
    var solid = mover === pair.bodyA ? pair.bodyB : pair.bodyA;
    if (!mover || !solid || !isSolidLabel(solid.label)) return null;
    groundGraceMs = 105;
    return { mover: mover, solid: solid, material: contactMaterial(solid) };
  }

  function tickAudioPhysics(dt) {
    pencilSoundMs = Math.max(0, pencilSoundMs - dt);
    impactPulse = Math.max(0, impactPulse - dt * 0.0045);
    if (state !== STATE_RUN || !cart) return;

    maxRunSpeed = Math.max(maxRunSpeed, cart.chassis.speed);
    groundGraceMs = Math.max(0, groundGraceMs - dt);
    if (groundGraceMs > 0) {
      longestAirMs = Math.max(longestAirMs, airborneMs);
      if (airborneMs > 150) flightVoiceStage = 0;
      airborneMs = 0;
      rollSoundMs -= dt;
      if (cart.chassis.speed > 2.4 && rollSoundMs <= 0) {
        SOUND.play("roll", clamp(cart.chassis.speed / 12, 0.25, 0.85));
        rollSoundMs = clamp(205 - cart.chassis.speed * 4, 128, 188);
      }
    } else {
      airborneMs += dt;
      longestAirMs = Math.max(longestAirMs, airborneMs);
      var fallSpeed = cart.chassis.velocity.y;
      if (flightVoiceStage === 0 && airborneMs > 320 && fallSpeed > 5.2) {
        flightVoiceStage = 1;
        SOUND.say("joy", clamp(fallSpeed / 14, 0.35, 1));
      }
      if (flightVoiceStage < 2 && airborneMs > 820 && fallSpeed > 13.5) {
        flightVoiceStage = 2;
        SOUND.say("panic", clamp(fallSpeed / 18, 0.55, 1));
      }
    }

    windActiveMs = Math.max(0, windActiveMs - dt);
    windSoundMs -= dt;
    if (windActiveMs > 0 && windSoundMs <= 0) {
      SOUND.play("wind", clamp(cart.chassis.speed / 11, 0.3, 0.8));
      windSoundMs = 740;
    }
  }


  function pairHas(pair, a, b) {
    var la = pair.bodyA.label, lb = pair.bodyB.label;
    return (la === a && lb === b) || (la === b && lb === a);
  }

  function pairTouchesFlag(pair) {
    return pairHas(pair, "chassis", "flag") || pairHas(pair, "wheel", "flag");
  }

  function checkpointIndexForPair(pair) {
    var labels = [pair.bodyA.label || "", pair.bodyB.label || ""];
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].indexOf("checkpoint:") === 0) {
        return parseInt(labels[i].split(":")[1], 10);
      }
    }
    return -1;
  }

  function checkpointApproachIssue(cp) {
    if (!cp || !cart) return "";
    var v = cart.chassis.velocity;
    var speed = cart.chassis.speed;
    var minAxis = cp.minAxisSpeed != null ? cp.minAxisSpeed : 1.8;
    if (cp.direction === "down" && v.y < minAxis) return "down";
    if (cp.direction === "up" && v.y > -minAxis) return "up";
    if (cp.direction === "right" && v.x < minAxis) return "right";
    if (cp.direction === "left" && v.x > -minAxis) return "left";
    if (cp.airborne && airborneMs < (cp.minAirMs || 90)) return "air";
    if (cp.minSpeed != null && speed < cp.minSpeed) return "speed";
    if (cp.maxSpeed != null && speed > cp.maxSpeed) return "slow";
    return "";
  }

  function rejectCheckpoint(index, issue) {
    if (!el.hint || timeMs - checkpointRejectMs < 320) return;
    checkpointRejectMs = timeMs;
    var label = "RING " + (index + 1) + " · ";
    var messages = {
      down: "HIT IT GOING DOWN",
      up: "HIT IT GOING UP",
      right: "HIT IT MOVING RIGHT",
      left: "HIT IT MOVING LEFT",
      air: "JUMP THROUGH IT",
      speed: "MORE SPEED",
      slow: "TOO FAST"
    };
    el.hint.textContent = label + (messages[issue] || "TRY ANOTHER ANGLE");
  }

  function collectCheckpoint(index) {
    if (index < 0 || checkpointHits[index]) return;
    for (var i = 0; i < index; i++) {
      if (!checkpointHits[i]) return;
    }
    var cp = level && level.checkpoints && level.checkpoints[index];
    var issue = checkpointApproachIssue(cp);
    if (issue) {
      rejectCheckpoint(index, issue);
      return;
    }
    checkpointHits[index] = true;
    SOUND.play("ring", 0.72);
    if (cp) spawnPop(cp.x, cp.y);
    if (el.hint) {
      el.hint.textContent = index + 1 >= checkpointHits.length ? "RING HIT · now the flag" : "RING HIT · keep going";
    }
  }

  function checkpointsComplete() {
    for (var i = 0; i < checkpointHits.length; i++) {
      if (!checkpointHits[i]) return false;
    }
    return true;
  }

  function finishIssue() {
    if (!checkpointsComplete()) return "checkpoint";
    if (cargoBroken) return "cargo";
    var contract = levelContract();
    var speed = cart ? cart.chassis.speed : 0;
    var angle = cart ? Math.abs(wrapAngle(cart.chassis.angle)) : 0;
    if (contract.minSpeed != null && speed < contract.minSpeed) return "too-slow";
    if (contract.maxSpeed != null && speed > contract.maxSpeed) return "too-fast";
    if (contract.maxAngle != null && angle > contract.maxAngle) return "crooked";
    if (contract.requireFlip && !didFlip) return "no-flip";
    if (contract.minAirMs != null && Math.max(longestAirMs, airborneMs) < contract.minAirMs) return "no-air";
    return "";
  }

  function attemptFinish() {
    var issue = finishIssue();
    if (issue) {
      crashReason = issue;
      finish(false);
    } else {
      finish(true);
    }
  }

  function handleFlagTouch() {
    if (levelContract().settleMs) return;
    attemptFinish();
  }

  function onCollideActive(ev) {
    if (state !== STATE_RUN || ended) return;
    var pairs = ev.pairs;
    for (var i = 0; i < pairs.length; i++) {
      markGrounded(pairs[i]);
      if (!starGot && (pairHas(pairs[i], "chassis", "star") || pairHas(pairs[i], "wheel", "star"))) {
        collectStar();
      }
      collectCheckpoint(checkpointIndexForPair(pairs[i]));
    }
    for (i = 0; i < pairs.length; i++) {
      if (pairTouchesFlag(pairs[i])) { handleFlagTouch(); return; }
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

  function pairImpactSpeed(pair, mover, solid) {
    var sv = (solid && solid.velocity) || { x: 0, y: 0 };
    var rvx = mover.velocity.x - sv.x;
    var rvy = mover.velocity.y - sv.y;
    var normal = pair.collision && pair.collision.normal;
    if (!normal) return Math.max(Math.abs(rvy), mover.speed * 0.45);
    return Math.abs(rvx * normal.x + rvy * normal.y);
  }

  function onCollideStart(ev) {
    if (state !== STATE_RUN || ended) return;
    var pairs = ev.pairs;
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      if (!starGot && (pairHas(pair, "chassis", "star") || pairHas(pair, "wheel", "star"))) {
        collectStar();
      }
      collectCheckpoint(checkpointIndexForPair(pair));
    }
    for (i = 0; i < pairs.length; i++) {
      pair = pairs[i];
      if (pairTouchesFlag(pair)) { handleFlagTouch(); if (ended) return; }
      var mover = pair.bodyA.label === "chassis" || pair.bodyA.label === "wheel" ? pair.bodyA
        : pair.bodyB.label === "chassis" || pair.bodyB.label === "wheel" ? pair.bodyB : null;
      var solid = mover === pair.bodyA ? pair.bodyB : pair.bodyA;
      var contract = levelContract();
      if (mover && solid && isSolidLabel(solid.label)) {
        markGrounded(pair);
        var impact = pairImpactSpeed(pair, mover, solid);
        maxImpactSeen = Math.max(maxImpactSeen, impact);
        if (impact > 3.2 && timeMs - lastImpactSoundMs > 125) {
          lastImpactSoundMs = timeMs;
          impactPulse = Math.max(impactPulse, clamp((impact - 3) / 12, 0.16, 1));
          SOUND.impact(contactMaterial(solid), clamp(impact / 18, 0.22, 1));
        }
        if (contract.cargoMaxImpact != null && impact > contract.cargoMaxImpact) {
          cargoBroken = true;
          crashReason = "cargo";
          SOUND.play("cargo", 1);
          finish(false);
          return;
        }
        if (contract.maxImpact != null && impact > contract.maxImpact) {
          crashReason = "hard-hit";
          finish(false);
          return;
        }
      }
      var ch = pair.bodyA.label === "chassis" ? pair.bodyA
        : pair.bodyB.label === "chassis" ? pair.bodyB : null;
      var other = ch === pair.bodyA ? pair.bodyB : pair.bodyA;
      if (ch && other && isSolidLabel(other.label)) {
        var flat = Math.abs(Math.sin(other.angle || 0)) < 0.32;
        var vy = ch.velocity.y;
        var mostlyDown = vy > 12 && vy > ch.speed * 0.6;
        if (contract.maxImpact == null && contract.cargoMaxImpact == null && flat && mostlyDown) {
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
    SOUND.play("star", 0.76);
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
      var settleMs = levelContract().settleMs || 0;
      if (!settleMs) {
        attemptFinish();
        return;
      }
      var issue = finishIssue();
      if (issue === "checkpoint" || issue === "cargo") {
        crashReason = issue;
        finish(false);
        return;
      }
      if (!issue) {
        finishHoldMs += STEP;
        if (el.hint) el.hint.textContent = "HOLD IT · almost parked";
        if (finishHoldMs >= settleMs) {
          finish(true);
          return;
        }
      } else {
        finishHoldMs = 0;
        if (el.hint) el.hint.textContent = issue === "too-fast" ? "SLOW DOWN" : "LAND UPRIGHT";
      }
    } else {
      finishHoldMs = 0;
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

  function recordWin(medals) {
    if (!level) return null;
    var score = scoreFor(true);
    var runTime = Math.round(timeMs);
    var runInk = Math.round(clamp(totalInk() / inkMax(), 0, 1) * 100);
    var previous = bestResults[level.id] || null;
    var next = {
      score: previous ? Math.max(previous.score, score) : score,
      timeMs: previous ? Math.min(previous.timeMs, runTime) : runTime,
      inkPercent: previous ? Math.min(previous.inkPercent, runInk) : runInk,
      medals: previous ? Math.max(previous.medals, medals) : medals
    };
    bestResults[level.id] = next;
    persistBestResults();
    return {
      isNew: !previous || score > previous.score,
      score: score,
      bestScore: next.score,
      previousScore: previous ? previous.score : 0
    };
  }

  function medalsFor(won) {
    if (!won) return 0;
    var medals = 1;
    if (starGot) medals += 1;
    var par = levelRules().parInk;
    if (par != null && totalInk() / inkMax() <= par) medals += 1;
    return medals;
  }

  function medalMarks(count) {
    var labels = ["CLEAR", "STAR", "CRAFT"];
    var marks = [];
    for (var i = 0; i < labels.length; i++) marks.push(labels[i] + " " + (i < count ? "●" : "○"));
    return marks.join("   ");
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
        medals: medalsFor(won),
        inkUsed: clamp(totalInk() / inkMax(), 0, 1),
        flip: didFlip,
        checkpoints: checkpointHits.filter(function (hit) { return hit; }).length,
        longestAirMs: Math.round(Math.max(longestAirMs, airborneMs)),
        maxSpeed: Math.round(maxRunSpeed * 100) / 100,
        maxImpact: Math.round(maxImpactSeen * 100) / 100
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
    if (reduceMotion) {
      stopFinishAnim();
      return;
    }
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
    if (!won && !reduceMotion) shake = 16;
    SOUND.setMode("result");
    SOUND.play(won ? "win" : "fail", 0.9);
    if (el.btnGo) el.btnGo.disabled = true;
    if (won && levelIndex + 1 < LEVELS.length && unlockedCount < levelIndex + 2) {
      unlockedCount = levelIndex + 2;
      persistUnlock();
    } else if (won && levelIndex + 1 === LEVELS.length) {
      unlockedCount = LEVELS.length;
      persistUnlock();
    }
    lastRunRecord = null;
    if (won && level) {
      var wonMedals = medalsFor(true);
      if (!bestMedals[level.id] || wonMedals > bestMedals[level.id]) {
        bestMedals[level.id] = wonMedals;
        persistMedals();
      }
      lastRunRecord = recordWin(wonMedals);
    }
    if (won) {
      SOUND.say("victory", 0.72);
    } else if (["bonk", "hard-hit", "cargo", "wipeout"].indexOf(crashReason) !== -1) {
      SOUND.say("oof", 0.64);
    }
    publishResult(won);
    TELEMETRY.track("run_finished", {
      yard: level ? level.id : "none",
      outcome: won ? "win" : "fail",
      reason: won ? "clear" : (crashReason || "wipeout"),
      attempt: attempts,
      durationMs: Math.round(timeMs),
      inkPercent: Math.round(clamp(totalInk() / inkMax(), 0, 1) * 100),
      stars: starGot ? 1 : 0,
      checkpoints: checkpointHits.filter(function (hit) { return hit; }).length,
      input: lastInputMethod
    });
    if (won && levelIndex + 1 === LEVELS.length) {
      TELEMETRY.track("campaign_completed", { yard: level.id, attempt: attempts, input: lastInputMethod });
    }
    if (document.body) {
      document.body.dataset.lastResult = won ? "win" : (crashReason || "fail");
      document.body.dataset.lastAirMs = String(Math.round(Math.max(longestAirMs, airborneMs)));
      document.body.dataset.lastMaxSpeed = String(Math.round(maxRunSpeed * 100) / 100);
      document.body.dataset.lastMaxImpact = String(Math.round(maxImpactSeen * 100) / 100);
      document.body.dataset.lastCheckpoints = String(checkpointHits.filter(function (hit) { return hit; }).length);
      document.body.dataset.lastX = cart ? String(Math.round(cart.chassis.position.x)) : "0";
      document.body.dataset.lastY = cart ? String(Math.round(cart.chassis.position.y)) : "0";
    }
    startFinishAnim(won);
    announceStatus(won ? "Yard cleared." : "Attempt failed: " + (crashReason || "wipeout") + ".");
    resultShown = false;
    resultTimer = 0;
  }

  function failureAdvice(reason) {
    var advice = {
      turtle: "Wheels up. Give the landing a gentler exit.",
      bonk: "The chassis hit first. Flatten the catch before the landing.",
      stuck: "Keep the line falling forward so the cart can carry speed.",
      "too-fast": "Scrub speed with a longer, softer uphill finish.",
      "too-slow": "Save more momentum through the final curve.",
      crooked: "Level the last section before the parking zone.",
      checkpoint: "Follow every numbered ring in order and in its arrow direction.",
      cargo: "Round out the hard landings to protect the cargo.",
      "hard-hit": "Soften the catch. The landing impact was too hard.",
      "no-flip": "Build one clean curl that turns the cart all the way over.",
      "no-air": "Use a sharper launch lip to earn more airtime.",
      dirt: "Catch the wheels before the rider meets the dirt."
    };
    return advice[reason] || "Redraw the catch and give the wheels a cleaner way through.";
  }

  function setResultButton(button, primary, label) {
    if (!button) return;
    button.className = "btn " + (primary ? "result-primary" : "result-secondary");
    button.textContent = label;
  }

  function showResult(won) {
    if (!el.result || resultShown) return;
    resultShown = true;
    el.result.classList.remove("hidden");
    var failTitles = {
      turtle: "TURTLE",
      bonk: "BONK",
      stuck: "STUCK",
      "too-fast": "TOO FAST",
      "too-slow": "TOO SLOW",
      crooked: "CROOKED",
      checkpoint: "MISSED RING",
      cargo: "SCRAMBLED",
      "hard-hit": "TOO HARD",
      "no-flip": "NO FLIP",
      "no-air": "NO JUMP",
      dirt: "ATE DIRT"
    };
    var openingComplete = !!(won && levelIndex === 11);
    var campaignComplete = !!(won && levelIndex + 1 === LEVELS.length);
    el.resultTitle.textContent = campaignComplete
      ? "CROWNED"
      : openingComplete
        ? "BOSS BEAT"
        : won ? "MADE IT" : (failTitles[crashReason] || "WIPEOUT");
    el.resultTitle.className = won ? "" : "fail";
    if (el.resultCard) el.resultCard.classList.toggle("campaign-complete", campaignComplete);
    var yardTag = level ? level.id : "yard-01";
    var yardName = level ? level.name : "";
    el.resultKicker.textContent = won
      ? yardTag + " · " + yardName + " cleared"
      : yardTag + " · " + yardName + " wipeout";
    var medals = medalsFor(won);
    el.resultStars.textContent = won ? medalMarks(medals) : " ";
    el.resultStars.setAttribute("aria-label", won ? medals + " of 3 medals" : "No medals");
    if (el.resultMessage) {
      el.resultMessage.textContent = campaignComplete
        ? "All 25 yards conquered. The backyard is yours."
        : openingComplete
          ? "Opening run cleared. Thirteen mastery yards are unlocked."
          : won ? "The flag is yours. Keep rolling or chase a cleaner line." : failureAdvice(crashReason);
    }
    if (el.resultRecord) {
      var saved = level ? bestResults[level.id] : null;
      if (won && lastRunRecord) {
        el.resultRecord.textContent = (lastRunRecord.isNew ? "NEW BEST · " : "BEST · ") + formatScore(lastRunRecord.bestScore);
      } else if (saved) {
        el.resultRecord.textContent = "BEST · " + formatScore(saved.score);
      } else {
        el.resultRecord.textContent = "NO CLEAR YET";
      }
    }
    el.statTime.textContent = (timeMs / 1000).toFixed(2) + "s";
    el.statInk.textContent = Math.round(clamp(totalInk() / inkMax(), 0, 1) * 100) + "%";
    el.statScore.textContent = formatScore(scoreFor(won));
    if (el.hint) el.hint.textContent = campaignComplete ? "backyard royalty" : won ? "keep rolling" : "tune the line";
    var hasNext = !!(won && levelIndex + 1 < LEVELS.length && levelIndex + 1 < unlockedCount);
    if (el.btnNext) {
      setResultButton(el.btnNext, true, openingComplete ? "ENTER MASTERY RUN" : "NEXT YARD");
      el.btnNext.classList.toggle("hidden", !hasNext);
    }
    if (won && hasNext) {
      setResultButton(el.btnAgain, false, "REPLAY YARD");
      if (el.btnResetLine) el.btnResetLine.classList.add("hidden");
    } else if (won) {
      setResultButton(el.btnAgain, true, campaignComplete ? "RIDE AGAIN" : "REPLAY YARD");
      if (el.btnResetLine) {
        setResultButton(el.btnResetLine, false, "DRAW A NEW LINE");
        el.btnResetLine.classList.remove("hidden");
      }
    } else {
      setResultButton(el.btnAgain, true, "TRY SAME LINE");
      if (el.btnResetLine) {
        setResultButton(el.btnResetLine, false, "REDRAW LINE");
        el.btnResetLine.classList.remove("hidden");
      }
    }
    resultReturnFocus = document.activeElement && document.activeElement !== document.body
      ? document.activeElement
      : canvas;
    setGameInert(true);
    el.result.focus();
  }

  function hideResult() {
    var wasOpen = !!(el.result && !el.result.classList.contains("hidden"));
    if (el.result) el.result.classList.add("hidden");
    resultShown = false;
    resultTimer = 0;
    if (el.btnNext) el.btnNext.classList.add("hidden");
    if (el.btnResetLine) el.btnResetLine.classList.remove("hidden");
    if (wasOpen) {
      setGameInert(false);
      var focusTarget = resultReturnFocus;
      if (!focusTarget || !focusTarget.isConnected || el.result.contains(focusTarget)) focusTarget = canvas;
      resultReturnFocus = null;
      window.requestAnimationFrame(function () { focusTarget.focus(); });
    }
  }

  function setGameInert(inert) {
    var nodes = [canvas, el.hud];
    for (var i = 0; i < nodes.length; i++) {
      if (!nodes[i]) continue;
      nodes[i].inert = inert;
      if (inert) nodes[i].setAttribute("aria-hidden", "true");
      else nodes[i].removeAttribute("aria-hidden");
    }
  }

  function trapResultFocus(e) {
    if (e.key !== "Tab" || !resultShown || !el.result) return;
    var controls = Array.prototype.slice.call(el.result.querySelectorAll("button:not(.hidden):not(:disabled)"));
    if (!controls.length) {
      e.preventDefault();
      el.result.focus();
      return;
    }
    var first = controls[0];
    var last = controls[controls.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === el.result)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === el.result) {
      e.preventDefault();
      first.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
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
    checkpointHits = [];
    var checkpoints = (level && level.checkpoints) || [];
    for (var i = 0; i < checkpoints.length; i++) checkpointHits.push(false);
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
    finishHoldMs = 0;
    cargoBroken = false;
    groundGraceMs = 0;
    airborneMs = 0;
    longestAirMs = 0;
    maxRunSpeed = 0;
    maxImpactSeen = 0;
    checkpointRejectMs = -1000;
    flightVoiceStage = 0;
    impactPulse = 0;
    lastImpactSoundMs = -1000;
    rollSoundMs = 0;
    windActiveMs = 0;
    windSoundMs = 0;
    stopFinishAnim();
  }

  function setHintDraw() {
    clearHintNudge();
    if (el.hint) el.hint.textContent = (level && level.objective) || "DRAW · tap GO";
  }

  function cloneReference(reference) {
    var copy = [];
    for (var i = 0; i < reference.length; i++) {
      var stroke = [];
      for (var j = 0; j < reference[i].length; j++) {
        stroke.push({ x: reference[i][j].x, y: reference[i][j].y });
      }
      copy.push(stroke);
    }
    return copy;
  }

  function loadDevReference(pattern) {
    if (!devMode || !level) return;
    if (pattern === "swoop") {
      var sx = level.ledge.x + level.ledge.w - 12;
      var sy = level.ledge.y + 12;
      var ex = level.landing.x + Math.min(52, level.landing.w * 0.28);
      var ey = level.landing.y + 2;
      var dx = ex - sx;
      var dy = ey - sy;
      var raw = [
        { x: sx, y: sy },
        { x: sx + dx * 0.32, y: sy + dy * 0.34 + 24 },
        { x: sx + dx * 0.68, y: sy + dy * 0.72 + 28 },
        { x: ex, y: ey }
      ];
      var clipped = [raw[0]];
      var blocked = !!pointIssue(raw[0]);
      for (var ri = 1; ri < raw.length && !blocked; ri++) {
        var ra = raw[ri - 1], rb = raw[ri];
        var samples = Math.max(1, Math.ceil(hypot(rb.x - ra.x, rb.y - ra.y) / 8));
        for (var rs = 1; rs <= samples; rs++) {
          var rt = rs / samples;
          var rp = { x: ra.x + (rb.x - ra.x) * rt, y: ra.y + (rb.y - ra.y) * rt };
          if (pointIssue(rp)) { blocked = true; break; }
          clipped.push(rp);
        }
      }
      strokes = [clipped];
    } else {
      if (!level.reference || !level.reference.length) return;
      strokes = cloneReference(level.reference);
    }
    updateInkHud();
  }

  function loadLevel(index, opts) {
    opts = opts || {};
    if (!LEVELS.length) return;
    if (index >= unlockedCount) index = unlockedCount - 1;
    levelIndex = clamp(index, 0, LEVELS.length - 1);
    level = LEVELS[levelIndex];
    if (opts.clearLine !== false) strokes = [];
    drawing = false;
    strokePending = false;
    strokeInvalid = false;
    strokeStartAnchor = -1;
    attempts = 0;
    teardownRun();
    setupWorld();
    state = STATE_DRAW;
    resetKeyboardCursor();
    SOUND.setMode("draw");
    snapCamera();
    hideResult();
    hideYardList();
    hideAudioPanel();
    if (el.btnGo) el.btnGo.disabled = false;
    setHintDraw();
    updateInkHud();
    updateYardHud();
    persistLastYard();
    TELEMETRY.track("yard_loaded", { yard: level.id, input: lastInputMethod });
    announceStatus("Yard " + (levelIndex + 1) + ", " + level.name + ". " + level.objective + ". " + levelRuleDescription() + " Draw a line and press Enter or choose Go.");
  }

  function resetToDraw(clearLine) {
    teardownRun();
    if (clearLine) strokes = [];
    drawing = false;
    strokePending = false;
    strokeInvalid = false;
    strokeStartAnchor = -1;
    state = STATE_DRAW;
    resetKeyboardCursor();
    SOUND.setMode("draw");
    snapCamera();
    hideResult();
    hideYardList();
    hideAudioPanel();
    if (el.btnGo) el.btnGo.disabled = false;
    setHintDraw();
    updateInkHud();
    announceStatus(clearLine ? "Line reset. Draw a new path to the flag." : "Ready to try the current line again.");
  }

  function go() {
    if (state !== STATE_DRAW) return;
    SOUND.unlock(true);
    SOUND.setMode("run");
    SOUND.play("go", 0.72);
    window.setTimeout(updateAudioDebug, 80);
    hideResult();
    hideYardList();
    hideAudioPanel();
    teardownRun();
    buildTrack();
    spawnCart();
    attempts += 1;
    TELEMETRY.track("run_started", {
      yard: level ? level.id : "none",
      attempt: attempts,
      inkPercent: Math.round(clamp(totalInk() / inkMax(), 0, 1) * 100),
      input: lastInputMethod
    });
    if (el.attemptChip) el.attemptChip.textContent = "try " + attempts;
    runStart = performance.now();
    timeMs = 0;
    state = STATE_RUN;
    ended = false;
    if (el.btnGo) el.btnGo.disabled = true;
    if (el.hint) el.hint.textContent = "hang on";
    announceStatus("The rider is moving. Hang on.");
    requestFrame();
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

  function drawWindFields(c) {
    if (!level) return;
    var fields = level.fields || [];
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (field.type !== "wind") continue;
      c.save();
      c.fillStyle = "rgba(88, 144, 164, 0.08)";
      c.fillRect(field.x, field.y, field.w, field.h);
      c.strokeStyle = "rgba(65, 116, 137, 0.45)";
      c.fillStyle = "rgba(65, 116, 137, 0.65)";
      c.lineWidth = 2.2;
      for (var y = field.y + 44; y < field.y + field.h; y += 76) {
        for (var x = field.x + 54; x < field.x + field.w; x += 102) {
          var dir = field.forceX < 0 ? -1 : 1;
          c.beginPath();
          c.moveTo(x - dir * 18, y);
          c.lineTo(x + dir * 18, y);
          c.lineTo(x + dir * 9, y - 7);
          c.moveTo(x + dir * 18, y);
          c.lineTo(x + dir * 9, y + 7);
          c.stroke();
        }
      }
      c.restore();
    }
  }

  function drawRuleLabel(c, box, text, color) {
    if (!box || box.w <= 0 || box.h <= 0) return;
    c.save();
    c.setLineDash([]);
    c.font = "800 17px Yard Hand, Segoe Print, Comic Sans MS, cursive";
    var textWidth = c.measureText(text).width;
    var small = box.w < textWidth + 22 || box.h < 42;
    var x = small ? box.x + box.w + 9 : box.x + 12;
    if (x + textWidth > DESIGN_W - 8) x = Math.max(8, box.x - textWidth - 9);
    var y = small ? box.y + Math.max(18, Math.min(box.h * 0.5 + 6, box.h - 4)) : box.y + 28;
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
    c.lineJoin = "round";
    c.lineWidth = 6;
    c.strokeStyle = "rgba(244, 239, 226, 0.96)";
    c.strokeText(text, x, y);
    c.fillStyle = color;
    c.fillText(text, x, y);
    c.restore();
  }

  function drawRuleZones(c) {
    if (state !== STATE_DRAW || !level) return;
    var rules = levelRules();
    var zones = rules.drawZones || [];
    var noDraw = rules.noDrawZones || [];
    var i;
    c.save();
    c.setLineDash([9, 9]);
    c.lineWidth = 2.4;
    c.strokeStyle = "rgba(75, 121, 79, 0.48)";
    c.fillStyle = "rgba(104, 146, 87, 0.045)";
    for (i = 0; i < zones.length; i++) {
      c.fillRect(zones[i].x, zones[i].y, zones[i].w, zones[i].h);
      c.strokeRect(zones[i].x, zones[i].y, zones[i].w, zones[i].h);
    }
    c.strokeStyle = "rgba(212, 84, 42, 0.62)";
    c.fillStyle = "rgba(212, 84, 42, 0.075)";
    for (i = 0; i < noDraw.length; i++) {
      var box = noDraw[i];
      c.fillRect(box.x, box.y, box.w, box.h);
      c.strokeRect(box.x, box.y, box.w, box.h);
      c.beginPath();
      c.moveTo(box.x + 8, box.y + 8);
      c.lineTo(box.x + box.w - 8, box.y + box.h - 8);
      c.moveTo(box.x + box.w - 8, box.y + 8);
      c.lineTo(box.x + 8, box.y + box.h - 8);
      c.stroke();
    }
    for (i = 0; i < zones.length; i++) drawRuleLabel(c, zones[i], "DRAW HERE", "#355b39");
    for (i = 0; i < noDraw.length; i++) drawRuleLabel(c, noDraw[i], "NO INK", "#a43b20");
    c.setLineDash([]);
    var anchors = rules.anchors || [];
    for (i = 0; i < anchors.length; i++) {
      c.fillStyle = "#f4efe2";
      c.strokeStyle = "#d4542a";
      c.lineWidth = 5;
      c.beginPath();
      c.arc(anchors[i].x, anchors[i].y, 13, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = "#2a2218";
      c.beginPath();
      c.arc(anchors[i].x, anchors[i].y, 3.5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  function drawCheckpoints(c) {
    if (!level) return;
    var checkpoints = level.checkpoints || [];
    for (var i = 0; i < checkpoints.length; i++) {
      var cp = checkpoints[i];
      var hit = !!checkpointHits[i];
      c.save();
      c.translate(cp.x, cp.y);
      c.rotate(-0.04);
      c.strokeStyle = hit ? "#6a8a4a" : "#d4542a";
      c.lineWidth = hit ? 7 : 5;
      c.setLineDash(hit ? [] : [12, 8]);
      c.beginPath();
      c.arc(0, 0, cp.r || 32, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = hit ? "#6a8a4a" : "#2a2218";
      c.font = "700 16px Yard Hand, Segoe Print, Comic Sans MS, cursive";
      c.textAlign = "center";
      var arrows = { down: "↓", up: "↑", right: "→", left: "←" };
      var glyph = hit ? "✓" : String(i + 1) + (arrows[cp.direction] || (cp.airborne ? "↗" : ""));
      c.fillText(glyph, 0, 6);
      c.restore();
    }
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
    if (state !== STATE_DRAW || strokes.length || !level || levelIndex !== 0) return;
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
    var material = trackMaterial();
    var ghost = material === "rubber" ? "rgba(212,84,42,0.22)"
      : material === "ice" ? "rgba(86,139,163,0.22)" : "rgba(42,34,24,0.18)";
    var ink = material === "rubber" ? "#d4542a" : material === "ice" ? "#5b879d" : "#2a2218";
    c.strokeStyle = ghost;
    c.lineWidth = 18;
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.stroke();
    c.strokeStyle = ink;
    for (var j = 1; j < pts.length; j++) {
      c.beginPath();
      c.lineWidth = 11 + 2.1 * Math.sin(j * 0.62) + 1.1 * Math.sin(j * 1.7);
      c.moveTo(pts[j - 1].x, pts[j - 1].y);
      c.lineTo(pts[j].x, pts[j].y);
      c.stroke();
    }
    c.restore();
  }

  function drawKeyboardCursor(c) {
    if (state !== STATE_DRAW || document.activeElement !== canvas) return;
    c.save();
    c.translate(keyboardCursor.x, keyboardCursor.y);
    c.fillStyle = keyboardDrawing ? "#d4542a" : "#fff8ee";
    c.strokeStyle = "#2a2218";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, 0, 12, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(-18, 0);
    c.lineTo(18, 0);
    c.moveTo(0, -18);
    c.lineTo(0, 18);
    c.stroke();
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
    if (level && level.cargo) {
      c.save();
      c.translate(12, -21);
      c.fillStyle = cargoBroken ? "#d7a18d" : "#e7dcc6";
      c.strokeStyle = "#2a2218";
      c.lineWidth = 2;
      c.fillRect(-12, -9, 24, 18);
      c.strokeRect(-12, -9, 24, 18);
      c.font = "700 6px Yard Hand, Segoe Print, Comic Sans MS, cursive";
      c.textAlign = "center";
      c.fillStyle = "#2a2218";
      c.fillText(level.cargo.label || "BOX", 0, 2);
      if (cargoBroken) {
        c.beginPath();
        c.moveTo(-8, -8);
        c.lineTo(-2, -1);
        c.lineTo(-6, 7);
        c.moveTo(6, -8);
        c.lineTo(1, 0);
        c.lineTo(8, 7);
        c.stroke();
      }
      c.restore();
    }
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
      if (pose.air > 0.05) {
        c.fillStyle = "#d4542a";
        c.beginPath();
        c.moveTo(-5, -29);
        c.lineTo(-10 - pose.air * 18, -27 - pose.air * 4);
        c.lineTo(-7, -21);
        c.closePath();
        c.fill();
        c.stroke();
      }
      if (pose.face === "panic") {
        c.fillStyle = "#2a2218";
        c.beginPath(); c.arc(-5, -40, 1.8, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(3, -40, 1.8, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(-1, -34, 3, 0, Math.PI * 2); c.stroke();
      } else if (pose.face === "oof") {
        c.beginPath();
        c.moveTo(-7, -42); c.lineTo(-3, -38); c.moveTo(-3, -42); c.lineTo(-7, -38);
        c.moveTo(1, -42); c.lineTo(5, -38); c.moveTo(5, -42); c.lineTo(1, -38);
        c.moveTo(-5, -34); c.lineTo(3, -34);
        c.stroke();
      } else {
        c.beginPath();
        c.moveTo(-5, -40); c.lineTo(-3, -38);
        c.moveTo(3, -40); c.lineTo(5, -38);
        c.stroke();
        c.beginPath();
        if (pose.face === "sad") c.arc(-1, -32, 3.2, Math.PI + 0.2, Math.PI * 2 - 0.2);
        else c.arc(-1, -35, pose.face === "joy" ? 4 : 3.2, 0.2, Math.PI - 0.2);
        c.stroke();
      }
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
      var pose = {
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
      if (state === STATE_RUN && airborneMs > 180) {
        pose.air = clamp((airborneMs - 180) / 620, 0, 1);
        pose.arms = "up";
        pose.face = flightVoiceStage >= 2 ? "panic" : "joy";
        if (!reduceMotion) pose.riderY = -pose.air * 7;
      }
      if (state === STATE_RUN && impactPulse > 0.04) {
        if (!reduceMotion) pose.squash = 1 + impactPulse * 0.24;
        if (impactPulse > 0.45) pose.face = "oof";
      }
      return pose;
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
      wbx: base.wbx, wby: base.wby, wb: base.wb,
      arms: base.arms,
      face: base.face,
      air: base.air,
      squash: base.squash,
      riderY: base.riderY
    };
    switch (finishAnim.name) {
      case "hop":
        pose.y -= Math.sin(k * Math.PI) * 56;
        pose.way -= Math.sin(k * Math.PI) * 56;
        pose.wby -= Math.sin(k * Math.PI) * 56;
        pose.arms = "up";
        pose.face = "joy";
        break;
      case "bow":
        pose.ang += Math.sin(k * Math.PI) * 0.95;
        pose.face = "joy";
        break;
      case "turtle":
        pose.ang = Math.PI + Math.sin(k * 10) * 0.14 * (1 - k);
        pose.y -= 14;
        pose.face = "panic";
        break;
      case "bonk":
        pose.crumple = e;
        pose.face = "oof";
        break;
      case "yeet":
        pose.riderX = k * 86;
        pose.riderY = k * k * 96 - Math.sin(k * Math.PI) * 36;
        pose.riderAng = k * 2.5;
        pose.arms = "up";
        pose.face = "panic";
        break;
      case "dirt":
        pose.y += e * 42;
        pose.way += e * 42;
        pose.wby += e * 42;
        pose.squash = 1 + e * 0.6;
        pose.face = "oof";
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
        pose.face = "sad";
        break;
      default:
        break;
    }
    return pose;
  }

  function drawAirLines(c, pose) {
    if (reduceMotion || state !== STATE_RUN || airborneMs < 220 || !cart) return;
    var speed = clamp(Math.abs(cart.chassis.velocity.y) / 15, 0.2, 1);
    var length = 18 + speed * 42;
    c.save();
    c.strokeStyle = "rgba(42,34,24," + (0.12 + speed * 0.2).toFixed(2) + ")";
    c.lineWidth = 2.4;
    c.lineCap = "round";
    for (var i = -1; i <= 1; i++) {
      var x = pose.x + i * 25 + Math.sin((lastTs || 0) * 0.01 + i) * 3;
      var y = pose.y - 34 - Math.abs(i) * 8;
      c.beginPath();
      c.moveTo(x, y - length);
      c.lineTo(x, y - 12);
      c.stroke();
    }
    c.restore();
  }

  function drawFlightScribble(c, pose) {
    if (state !== STATE_RUN || flightVoiceStage < 1 || airborneMs < 260) return;
    var word = flightVoiceStage >= 2 ? "AAAA!" : "WEEEE!";
    c.save();
    c.translate(pose.x + 48, pose.y - 54);
    c.rotate(-0.12);
    c.fillStyle = "#d4542a";
    c.font = "700 19px Yard Hand, Segoe Print, Comic Sans MS, cursive";
    c.textAlign = "left";
    c.fillText(word, 0, 0);
    c.restore();
  }

  function drawCart(c) {
    var pose = animPose(liveCartPose());
    drawAirLines(c, pose);
    drawFlightScribble(c, pose);
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
    c.font = "700 54px Yard Hand, Segoe Print, Comic Sans MS, cursive";
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
    c.font = "700 28px Yard Hand, Segoe Print, Comic Sans MS, cursive";
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
    var targetZ = !reduceMotion && state === STATE_RUN ? 1.1 : 1;
    camZ += (targetZ - camZ) * 0.08;
    var tx = DESIGN_W * 0.5;
    var ty = DESIGN_H * 0.5;
    if (!reduceMotion && cart && state === STATE_RUN) {
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
    renderCount += 1;
    var dpr = view.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, view.cssW, view.cssH);
    ctx.fillStyle = "#30251c";
    ctx.fillRect(0, 0, view.cssW, view.cssH);
    if (view.ox > 70) {
      ctx.strokeStyle = "rgba(231,220,198,0.09)";
      ctx.lineWidth = 2;
      for (var boardX = 28; boardX < view.cssW; boardX += 76) {
        ctx.beginPath();
        ctx.moveTo(boardX, 0);
        ctx.lineTo(boardX + 9, view.cssH);
        ctx.stroke();
      }
      ctx.save();
      ctx.fillStyle = "rgba(244,239,226,0.48)";
      ctx.font = "800 13px system-ui, sans-serif";
      ctx.letterSpacing = "0.16em";
      ctx.textAlign = "center";
      ctx.translate(view.ox * 0.5, view.cssH * 0.5);
      ctx.rotate(-Math.PI * 0.5);
      ctx.fillText("KNOCK ON WOOD · BACKYARD ARCADE", 0, 0);
      ctx.restore();
      ctx.save();
      ctx.fillStyle = "rgba(244,239,226,0.48)";
      ctx.font = "800 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.translate(view.cssW - view.ox * 0.5, view.cssH * 0.5);
      ctx.rotate(Math.PI * 0.5);
      ctx.fillText("DRAW · DROP · RIDE · REPEAT", 0, 0);
      ctx.restore();
    } else if (view.oy > 34) {
      ctx.strokeStyle = "rgba(231,220,198,0.09)";
      ctx.lineWidth = 2;
      for (var boardY = 24; boardY < view.cssH; boardY += 58) {
        ctx.beginPath();
        ctx.moveTo(0, boardY);
        ctx.lineTo(view.cssW, boardY + 4);
        ctx.stroke();
      }
      ctx.save();
      ctx.fillStyle = "rgba(244,239,226,0.48)";
      ctx.font = "800 10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("KNOCK ON WOOD · BACKYARD ARCADE", view.cssW * 0.5, view.oy * 0.5 + 4);
      ctx.fillText("DRAW · DROP · RIDE · REPEAT", view.cssW * 0.5, view.cssH - view.oy * 0.5 + 4);
      ctx.restore();
    }

    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);

    if (!reduceMotion && shake > 0.35) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    ctx.translate(DESIGN_W * 0.5, DESIGN_H * 0.5);
    ctx.scale(camZ, camZ);
    ctx.translate(-camX, -camY);

    drawStaticScene(ctx);
    drawRuleZones(ctx);
    drawHint(ctx);
    drawCheckpoints(ctx);
    drawFlag(ctx);
    drawStar(ctx);

    for (var i = 0; i < strokes.length; i++) drawMarkerStroke(ctx, strokes[i]);
    drawKeyboardCursor(ctx);

    drawCart(ctx);
    drawPops(ctx);
    drawStarBurstAnim(ctx);
    drawStamp(ctx);
    drawAnimScribble(ctx);

    ctx.strokeStyle = "rgba(42,34,24,0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, DESIGN_W - 6, DESIGN_H - 6);
  }

  function drawStaticScene(target) {
    if (!staticLayer) {
      staticLayer = document.createElement("canvas");
      staticLayer.width = DESIGN_W;
      staticLayer.height = DESIGN_H;
    }
    var levelId = level ? level.id : "empty";
    if (staticLayerLevel !== levelId) {
      var layer = staticLayer.getContext("2d");
      layer.clearRect(0, 0, DESIGN_W, DESIGN_H);
      drawPaper(layer);
      drawSun(layer);
      drawWindFields(layer);
      drawPlatforms(layer);
      staticLayerLevel = levelId;
    }
    target.drawImage(staticLayer, 0, 0);
  }

  function requestFrame() {
    if (!frameId && pageVisible) frameId = window.requestAnimationFrame(loop);
  }

  function needsContinuousFrame() {
    return state === STATE_RUN || finishAnim.active || shake > 0.4 || pops.length > 0 || (ended && !resultShown);
  }

  function loop(ts) {
    frameId = 0;
    if (!pageVisible) return;
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
        applyFields();
        Matter.Engine.update(engine, STEP);
        settleChassis();
        acc -= STEP;
      }
      timeMs = ts - runStart;
      tickAudioPhysics(dt);
      checkEnd();
    }

    if (finishAnim.active) {
      finishAnim.t += dt;
      if (finishAnim.t > finishAnim.dur + 200) stopFinishAnim();
    }

    if (ended && !resultShown) {
      resultTimer += dt;
      if (resultTimer >= (reduceMotion ? 160 : RESULT_DELAY_MS)) showResult(state === STATE_WIN);
    }

    if (reduceMotion) shake = 0;
    else if (shake > 0.4) shake *= 0.86;
    else shake = 0;
    tickPops(dt);
    updateCamera();
    render();
    if (needsContinuousFrame()) requestFrame();
  }

  function canRetryNow() {
    return ended && resultShown;
  }

  function updateOrientationGuard() {
    if (!el.orientationGuard || !orientationQuery) return;
    var shouldShow = orientationQuery.matches && !orientationDismissed;
    el.orientationGuard.hidden = !shouldShow;
    if (document.body) document.body.dataset.orientationGuard = shouldShow ? "shown" : "hidden";
    if (shouldShow) announceStatus("Portrait orientation is recommended. Turn the phone upright or choose Play Sideways.");
  }

  function bindOrientationGuard() {
    if (!window.matchMedia || !el.orientationGuard) return;
    orientationQuery = window.matchMedia("(orientation: landscape) and (max-height: 560px) and (min-aspect-ratio: 4/3)");
    if (orientationQuery.addEventListener) orientationQuery.addEventListener("change", updateOrientationGuard);
    else if (orientationQuery.addListener) orientationQuery.addListener(updateOrientationGuard);
    if (el.btnLandscapeAnyway) {
      el.btnLandscapeAnyway.addEventListener("click", function () {
        orientationDismissed = true;
        updateOrientationGuard();
        canvas.focus();
      });
    }
    updateOrientationGuard();
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
    if (el.soundToggle) {
      el.soundToggle.addEventListener("click", function (e) {
        e.preventDefault();
        toggleAudioPanel();
      });
    }
    if (el.masterAudioToggle) el.masterAudioToggle.addEventListener("click", toggleSound);
    if (el.musicToggle) el.musicToggle.addEventListener("click", function () { toggleAudioCategory("music"); });
    if (el.effectsToggle) el.effectsToggle.addEventListener("click", function () { toggleAudioCategory("sfx"); });
    if (el.voicesToggle) el.voicesToggle.addEventListener("click", function () { toggleAudioCategory("voices"); });
    if (el.audioDone) el.audioDone.addEventListener("click", function () {
      hideAudioPanel();
      el.soundToggle.focus();
    });
    if (el.audioPanel) {
      el.audioPanel.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        e.preventDefault();
        e.stopPropagation();
        hideAudioPanel();
        el.soundToggle.focus();
      });
    }
    if (el.btnReload) {
      el.btnReload.addEventListener("click", function () { window.location.reload(); });
    }
    if (el.result) el.result.addEventListener("keydown", trapResultFocus);
    bindOrientationGuard();
    if (el.yardList) {
      el.yardList.addEventListener("keydown", function (e) {
        var items = Array.prototype.slice.call(el.yardList.querySelectorAll("button:not(:disabled)"));
        var index = items.indexOf(document.activeElement);
        if (e.key === "Escape") {
          e.preventDefault();
          hideYardList();
          el.yardChip.focus();
          return;
        }
        if (!items.length) return;
        if (e.key === "ArrowDown") index = (index + 1 + items.length) % items.length;
        else if (e.key === "ArrowUp") index = (index - 1 + items.length) % items.length;
        else if (e.key === "Home") index = 0;
        else if (e.key === "End") index = items.length - 1;
        else return;
        e.preventDefault();
        items[index].focus();
      });
    }
    window.addEventListener("keydown", function (e) {
      if (e.defaultPrevented) return;
      if (e.target && /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.key !== "Escape") return;
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
        var yardWasOpen = el.yardList && !el.yardList.classList.contains("hidden");
        var audioWasOpen = el.audioPanel && !el.audioPanel.classList.contains("hidden");
        hideYardList();
        hideAudioPanel();
        if (yardWasOpen && el.yardChip) el.yardChip.focus();
        else if (audioWasOpen && el.soundToggle) el.soundToggle.focus();
      } else if (e.key === "m" || e.key === "M") {
        toggleSound();
      }
    });
    document.addEventListener("visibilitychange", function () {
      pageVisible = !document.hidden;
      SOUND.setVisible(pageVisible);
      if (!pageVisible) {
        hiddenAt = performance.now();
        if (frameId) window.cancelAnimationFrame(frameId);
        frameId = 0;
      } else {
        if (hiddenAt && state === STATE_RUN) runStart += performance.now() - hiddenAt;
        hiddenAt = 0;
        lastTs = 0;
        requestFrame();
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
    el.inkLabel = document.getElementById("inkLabel");
    el.inkTrack = document.getElementById("inkTrack");
    el.inkFill = document.getElementById("inkFill");
    el.inkPct = document.getElementById("inkPct");
    el.hint = document.getElementById("hint");
    el.attemptChip = document.getElementById("attemptChip");
    el.yardChip = document.getElementById("yardChip");
    el.soundToggle = document.getElementById("soundToggle");
    el.audioPanel = document.getElementById("audioPanel");
    el.masterAudioToggle = document.getElementById("masterAudioToggle");
    el.musicToggle = document.getElementById("musicToggle");
    el.effectsToggle = document.getElementById("effectsToggle");
    el.voicesToggle = document.getElementById("voicesToggle");
    el.audioDone = document.getElementById("audioDone");
    el.yardList = document.getElementById("yardList");
    el.result = document.getElementById("result");
    el.resultCard = el.result ? el.result.querySelector(".result-card") : null;
    el.resultTitle = document.getElementById("resultTitle");
    el.resultKicker = document.getElementById("resultKicker");
    el.resultMessage = document.getElementById("resultMessage");
    el.resultStars = document.getElementById("resultStars");
    el.resultRecord = document.getElementById("resultRecord");
    el.statTime = document.getElementById("statTime");
    el.statInk = document.getElementById("statInk");
    el.statScore = document.getElementById("statScore");
    el.bootError = document.getElementById("bootError");
    el.btnReload = document.getElementById("btnReload");
    el.gameStatus = document.getElementById("gameStatus");
    el.hud = document.getElementById("hud");
    el.orientationGuard = document.getElementById("orientationGuard");
    el.btnLandscapeAnyway = document.getElementById("btnLandscapeAnyway");
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
    motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    reduceMotion = !!(motionQuery && motionQuery.matches);
    if (motionQuery) {
      var onMotionPreference = function (event) {
        reduceMotion = !!event.matches;
        if (document.body) document.body.dataset.reducedMotion = reduceMotion ? "true" : "false";
        if (reduceMotion) {
          shake = 0;
          stopFinishAnim();
          snapCamera();
        }
        requestFrame();
      };
      if (motionQuery.addEventListener) motionQuery.addEventListener("change", onMotionPreference);
      else if (motionQuery.addListener) motionQuery.addListener(onMotionPreference);
    }
    if (document.body) document.body.dataset.reducedMotion = reduceMotion ? "true" : "false";
    migrateStorage();
    SOUND.setSettings(loadAudioSettings());
    SOUND.setMuted(storageGet(STORAGE_MUTED, "0") === "1");
    updateSoundHud();
    seedPaper();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        staticLayerLevel = "";
        requestFrame();
      });
    }
    resize();
    window.addEventListener("resize", resize);
    var startIdx = loadProgress();
    var params = devMode ? new URLSearchParams(window.location.search) : null;
    if (devMode) {
      window.__RML_AUDIO = SOUND;
      window.__RML_DEBUG = {
        renderCount: function () { return renderCount; },
        state: function () { return state; },
        backingPixels: function () { return canvas.width * canvas.height; },
        reducedMotion: function () { return reduceMotion; }
      };
      unlockedCount = LEVELS.length;
      var requestedYard = parseInt(params.get("yard"), 10);
      if (requestedYard) startIdx = clamp(requestedYard - 1, 0, LEVELS.length - 1);
    }
    loadLevel(startIdx, { clearLine: true });
    TELEMETRY.track("game_loaded", { yard: level ? level.id : "none", input: lastInputMethod });
    if (document.body) document.body.dataset.storage = storageAvailable ? "available" : "unavailable";
    if (!storageAvailable) announceStatus("Progress cannot be saved in this browser session. The game is still playable.");
    if (devMode && params.get("autoplay") === "1") loadDevReference(params.get("pattern"));
    bindDraw();
    bindHud();
    updateInkHud();
    requestFrame();
    if (devMode && params.get("autoplay") === "1" && strokes.length) {
      window.setTimeout(go, 180);
    }
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
