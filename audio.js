/* Ride My Line — playful real-asset audio director. No synthesized sound effects. */
(function (root) {
  "use strict";

  var SAMPLE_PATHS = {
    pencil: "assets/audio/sfx/pencil.ogg",
    launch: "assets/audio/sfx/launch-boing.ogg",
    ring: "assets/audio/sfx/ring-pizzicato.ogg",
    star: "assets/audio/sfx/star-pizzicato.ogg",
    rubberBoing: "assets/audio/sfx/rubber-boing.ogg",
    rubberSqueak1: "assets/audio/sfx/rubber-squeak-1.ogg",
    rubberSqueak2: "assets/audio/sfx/rubber-squeak-2.ogg",
    ice: "assets/audio/sfx/ice-scrape.ogg",
    impactLight: "assets/audio/sfx/wood-light.ogg",
    impactMedium: "assets/audio/sfx/wood-medium.ogg",
    impactHeavy: "assets/audio/sfx/wood-heavy.ogg",
    impactSoft: "assets/audio/sfx/soft-impact.ogg",
    wind: "assets/audio/sfx/wind.ogg",
    roll: "assets/audio/sfx/wheel-clack.ogg",
    win: "assets/audio/sfx/win-pizzicato.ogg",
    fail: "assets/audio/sfx/fail-pizzicato.ogg",
    toggle: "assets/audio/sfx/toggle.ogg",
    voiceJoy: "assets/audio/sfx/rider-woohoo-playful.ogg",
    voicePanic: "assets/audio/sfx/rider-fall-funny.ogg",
    voiceOof: "assets/audio/sfx/rider-oof-playful.ogg",
    voiceVictory: "assets/audio/sfx/rider-yippee.ogg"
  };

  var audioCtx = null;
  var master = null;
  var musicBus = null;
  var sfxBus = null;
  var voiceBus = null;
  var compressor = null;
  var musicElement = null;
  var musicSource = null;
  var musicStarted = false;
  var mode = "draw";
  var muted = false;
  var visible = true;
  var duckTimer = 0;
  var activeVoice = null;
  var lastVoiceMs = -10000;
  var buffers = {};
  var pending = {};
  var failed = {};
  var lastPlayed = {};
  var activeCounts = {};
  var variantCounters = {};
  var settings = { music: true, sfx: true, voices: true };

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function modeVolume() {
    if (mode === "run") return 0.086;
    if (mode === "result") return 0.038;
    return 0.058;
  }

  function setBus(bus, value, seconds) {
    if (!audioCtx || !bus) return;
    var now = audioCtx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(value, now, seconds || 0.025);
  }

  function applySettings() {
    setBus(musicBus, settings.music ? modeVolume() : 0, 0.04);
    setBus(sfxBus, settings.sfx ? 0.88 : 0, 0.025);
    setBus(voiceBus, settings.voices ? 0.76 : 0, 0.025);
  }

  function ensure() {
    if (audioCtx) return true;
    var AudioCtor = root.AudioContext || root.webkitAudioContext;
    if (!AudioCtor) return false;
    audioCtx = new AudioCtor();
    master = audioCtx.createGain();
    musicBus = audioCtx.createGain();
    sfxBus = audioCtx.createGain();
    voiceBus = audioCtx.createGain();
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -13;
    compressor.knee.value = 14;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.2;
    master.gain.value = muted ? 0 : 0.9;
    musicBus.connect(compressor);
    sfxBus.connect(compressor);
    voiceBus.connect(compressor);
    compressor.connect(master);
    master.connect(audioCtx.destination);
    applySettings();
    Object.keys(SAMPLE_PATHS).forEach(loadSample);
    return true;
  }

  function loadSample(name) {
    if (buffers[name]) return Promise.resolve(buffers[name]);
    if (pending[name]) return pending[name];
    if (!audioCtx || !SAMPLE_PATHS[name]) return Promise.reject(new Error("Audio is not ready"));
    pending[name] = root.fetch(SAMPLE_PATHS[name], { cache: "force-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("Could not load " + SAMPLE_PATHS[name]);
        return response.arrayBuffer();
      })
      .then(function (data) { return audioCtx.decodeAudioData(data); })
      .then(function (buffer) {
        buffers[name] = buffer;
        delete pending[name];
        return buffer;
      })
      .catch(function (error) {
        failed[name] = true;
        delete pending[name];
        throw error;
      });
    return pending[name];
  }

  function unlock(withMusic) {
    if (!ensure()) return false;
    if (audioCtx.state === "suspended") audioCtx.resume();
    if (withMusic) startMusic();
    return true;
  }

  function nextVariant(group, names) {
    var index = variantCounters[group] || 0;
    variantCounters[group] = index + 1;
    return names[index % names.length];
  }

  function stopActiveVoice() {
    if (!activeVoice) return;
    var source = activeVoice;
    activeVoice = null;
    source.onended = null;
    activeCounts["rider-voice"] = Math.max(0, (activeCounts["rider-voice"] || 1) - 1);
    try { source.stop(); } catch (error) { /* The previous reaction may have already ended. */ }
  }

  function playSample(name, amount, category, rate, options) {
    options = options || {};
    if (muted || !visible || !unlock(false)) return false;
    if (category === "voice" && !settings.voices) return false;
    if (category !== "voice" && !settings.sfx) return false;

    var cooldownKey = options.cooldownKey || name;
    var nowMs = audioCtx.currentTime * 1000;
    var cooldownMs = options.cooldownMs || 0;
    if (lastPlayed[cooldownKey] != null && nowMs - lastPlayed[cooldownKey] < cooldownMs) return false;
    lastPlayed[cooldownKey] = nowMs;

    loadSample(name).then(function (buffer) {
      if (muted || !visible || !audioCtx || audioCtx.state !== "running") return;
      var group = options.group || cooldownKey;
      var maxVoices = options.maxVoices || 3;
      if (category === "voice" && options.replaceVoice) stopActiveVoice();
      if ((activeCounts[group] || 0) >= maxVoices) return;

      var source = audioCtx.createBufferSource();
      var gain = audioCtx.createGain();
      var now = audioCtx.currentTime;
      var jitter = options.rateJitter == null ? 0.026 : options.rateJitter;
      var level = clamp(amount == null ? 0.6 : amount, 0.025, 1);
      var offset = clamp(options.offset || 0, 0, Math.max(0, buffer.duration - 0.01));
      var duration = options.duration == null ? null : clamp(options.duration, 0.025, buffer.duration - offset);

      source.buffer = buffer;
      source.playbackRate.value = clamp((rate || 1) + (Math.random() - 0.5) * jitter, 0.72, 1.28);
      gain.gain.setValueAtTime(level, now);
      if (duration && options.fadeOut) {
        gain.gain.setValueAtTime(level, now + Math.max(0, duration - options.fadeOut));
        gain.gain.linearRampToValueAtTime(0.0001, now + duration);
      }

      source.connect(gain);
      gain.connect(category === "voice" ? voiceBus : sfxBus);
      activeCounts[group] = (activeCounts[group] || 0) + 1;
      source.onended = function () {
        activeCounts[group] = Math.max(0, (activeCounts[group] || 1) - 1);
        if (activeVoice === source) activeVoice = null;
      };
      if (category === "voice") activeVoice = source;
      if (duration) source.start(0, offset, duration);
      else source.start(0, offset);
    }).catch(function () { /* Missing assets fail silently after being reported in debug state. */ });
    return true;
  }

  function startMusic() {
    if (!ensure() || musicStarted || !settings.music) return;
    musicStarted = true;
    var url = document.body ? document.body.getAttribute("data-music") : "";
    if (!url) return;
    try {
      musicElement = new Audio(url);
      musicElement.loop = true;
      musicElement.preload = "auto";
      musicElement.playsInline = true;
      musicSource = audioCtx.createMediaElementSource(musicElement);
      musicSource.connect(musicBus);
      var result = musicElement.play();
      if (result && result.catch) result.catch(function () { failed.music = true; });
    } catch (error) {
      failed.music = true;
      musicElement = null;
      musicSource = null;
    }
  }

  function duck(duration, floor) {
    if (!audioCtx || !musicStarted || !settings.music) return;
    root.clearTimeout(duckTimer);
    setBus(musicBus, floor == null ? 0.016 : floor, 0.025);
    duckTimer = root.setTimeout(function () { setBus(musicBus, modeVolume(), 0.1); }, duration || 650);
  }

  function play(name, intensity) {
    var amount = clamp(intensity == null ? 0.6 : intensity, 0.15, 1);
    if (name === "pencil") {
      var scratchIndex = variantCounters.pencil || 0;
      var scratchOffsets = [0.03, 0.37, 0.73, 1.08];
      variantCounters.pencil = scratchIndex + 1;
      playSample("pencil", amount * 0.42, "sfx", 0.94 + (scratchIndex % 3) * 0.035, {
        cooldownKey: "pencil",
        cooldownMs: 66,
        group: "pencil",
        maxVoices: 2,
        offset: scratchOffsets[scratchIndex % scratchOffsets.length],
        duration: 0.15,
        fadeOut: 0.055,
        rateJitter: 0.018
      });
    } else if (name === "go") {
      playSample("launch", amount * 0.68, "sfx", 0.96, { cooldownMs: 160, maxVoices: 1 });
    } else if (name === "ring") {
      playSample("ring", amount * 0.76, "sfx", 1, { cooldownMs: 180, maxVoices: 1 });
    } else if (name === "star") {
      playSample("star", amount * 0.72, "sfx", 1.02, { cooldownMs: 180, maxVoices: 1 });
    } else if (name === "impact") {
      playSample(amount > 0.78 ? "impactHeavy" : amount > 0.48 ? "impactMedium" : "impactLight", amount * 0.64, "sfx", 0.96 + amount * 0.08, {
        cooldownKey: "wood-impact",
        cooldownMs: 125,
        group: "impact",
        maxVoices: 2
      });
    } else if (name === "rubber") {
      var rubber = nextVariant("rubber", amount > 0.72
        ? ["rubberBoing", "rubberSqueak1", "rubberBoing"]
        : ["rubberBoing", "rubberSqueak2", "rubberBoing"]);
      playSample(rubber, amount * 0.66, "sfx", 0.9 + amount * 0.13, {
        cooldownKey: "rubber-impact",
        cooldownMs: 145,
        group: "rubber",
        maxVoices: 1
      });
    } else if (name === "ice") {
      playSample("ice", amount * 0.46, "sfx", 0.94 + amount * 0.1, {
        cooldownMs: 190,
        maxVoices: 1
      });
    } else if (name === "roll") {
      playSample("roll", amount * 0.38, "sfx", 0.88 + amount * 0.22, {
        cooldownMs: 132,
        maxVoices: 1,
        duration: 0.2,
        fadeOut: 0.04
      });
    } else if (name === "wind") {
      playSample("wind", amount * 0.25, "sfx", 0.94 + amount * 0.07, {
        cooldownMs: 720,
        maxVoices: 1,
        duration: 0.9,
        fadeOut: 0.16
      });
    } else if (name === "win") {
      playSample("win", amount * 0.76, "sfx", 1, { cooldownMs: 900, maxVoices: 1, rateJitter: 0 });
      duck(1050, 0.012);
    } else if (name === "fail") {
      playSample("fail", amount * 0.56, "sfx", 1, { cooldownMs: 700, maxVoices: 1, rateJitter: 0 });
      duck(900, 0.014);
    } else if (name === "cargo") {
      playSample("impactSoft", amount * 0.72, "sfx", 0.9, { cooldownMs: 250, maxVoices: 1 });
    } else {
      playSample(name, amount * 0.78, "sfx", name === "toggle" ? 1.04 : 1, { cooldownMs: 80, maxVoices: 2 });
    }
  }

  function say(kind, intensity) {
    if (muted || !visible || !settings.voices || !unlock(false)) return;
    if (kind === "shriek") kind = "panic";
    var nowMs = audioCtx.currentTime * 1000;
    var urgent = kind === "panic" || kind === "oof";
    var cooldown = kind === "victory" ? 1200 : kind === "joy" ? 1100 : 520;
    if (!urgent && nowMs - lastVoiceMs < cooldown) return;
    if (urgent && nowMs - lastVoiceMs < 360) return;

    var sample = "voiceJoy";
    var amount = clamp(intensity == null ? 0.7 : intensity, 0.3, 0.88);
    var rate = 1;
    var duckMs = 780;
    if (kind === "panic") {
      sample = "voicePanic";
      amount *= 0.88;
      rate = 1.02;
      duckMs = 720;
    } else if (kind === "oof") {
      sample = "voiceOof";
      amount *= 0.82;
      rate = 0.98;
      duckMs = 420;
    } else if (kind === "victory") {
      var victoryIndex = variantCounters.victoryVoice || 0;
      variantCounters.victoryVoice = victoryIndex + 1;
      sample = victoryIndex % 3 === 0 ? "voiceVictory" : "voiceJoy";
      amount *= sample === "voiceVictory" ? 0.72 : 0.8;
      duckMs = sample === "voiceVictory" ? 1250 : 820;
    }

    var played = playSample(sample, amount, "voice", rate, {
      cooldownKey: "voice-" + kind,
      cooldownMs: cooldown,
      group: "rider-voice",
      maxVoices: 1,
      replaceVoice: urgent,
      rateJitter: kind === "oof" ? 0.035 : 0.016
    });
    if (played) {
      lastVoiceMs = nowMs;
      duck(duckMs, 0.01);
    }
  }

  function impact(material, intensity) {
    if (material === "rubber") play("rubber", intensity);
    else if (material === "ice") play("ice", intensity);
    else play("impact", intensity);
  }

  function setMode(nextMode) {
    mode = nextMode || "draw";
    if (musicStarted && settings.music) setBus(musicBus, modeVolume(), 0.08);
  }

  function setMuted(nextMuted) {
    muted = !!nextMuted;
    setBus(master, muted ? 0 : 0.9, 0.025);
  }

  function setVisible(nextVisible) {
    visible = !!nextVisible;
    if (!audioCtx) return;
    if (!visible && audioCtx.state === "running") audioCtx.suspend();
    else if (visible && !muted && audioCtx.state === "suspended") audioCtx.resume();
  }

  function setSettings(nextSettings) {
    settings = {
      music: nextSettings.music !== false,
      sfx: nextSettings.sfx !== false,
      voices: nextSettings.voices !== false
    };
    if (!settings.voices) stopActiveVoice();
    if (settings.music && musicStarted && musicElement && musicElement.paused) musicElement.play().catch(function () {});
    if (!settings.music && musicElement && !musicElement.paused) musicElement.pause();
    applySettings();
  }

  root.RML_AUDIO = {
    unlock: unlock,
    startMusic: startMusic,
    play: play,
    say: say,
    impact: impact,
    setMode: setMode,
    setMuted: setMuted,
    isMuted: function () { return muted; },
    setVisible: setVisible,
    setSettings: setSettings,
    getSettings: function () {
      return { music: settings.music, sfx: settings.sfx, voices: settings.voices };
    },
    debug: function () {
      return {
        available: !!audioCtx,
        state: audioCtx ? audioCtx.state : "idle",
        mode: mode,
        muted: muted,
        musicStarted: musicStarted,
        usingLicensedTrack: !!musicElement,
        realAssets: true,
        audioProfile: "backyard-slapstick-v2",
        loadedSamples: Object.keys(buffers).length,
        failedSamples: Object.keys(failed),
        activeSampleGroups: Object.keys(activeCounts).filter(function (key) { return activeCounts[key] > 0; }).length,
        activeSampleVoices: Object.keys(activeCounts).reduce(function (total, key) { return total + activeCounts[key]; }, 0),
        activeRiderVoices: activeCounts["rider-voice"] || 0
      };
    }
  };
})(window);
