/* Ride My Line — real-asset audio director. No synthesized sound effects. */
(function (root) {
  "use strict";

  var SAMPLE_PATHS = {
    pencil: "assets/audio/sfx/pencil.ogg",
    go: "assets/audio/sfx/go-click.ogg",
    ring: "assets/audio/sfx/confirmation.ogg",
    star: "assets/audio/sfx/star-pluck.ogg",
    rubber: "assets/audio/sfx/rubber-drop.ogg",
    ice: "assets/audio/sfx/ice-scrape.ogg",
    impactLight: "assets/audio/sfx/wood-light.ogg",
    impactMedium: "assets/audio/sfx/wood-medium.ogg",
    impactHeavy: "assets/audio/sfx/wood-heavy.ogg",
    impactSoft: "assets/audio/sfx/soft-impact.ogg",
    cargo: "assets/audio/sfx/fail.ogg",
    wind: "assets/audio/sfx/wind.ogg",
    roll: "assets/audio/sfx/wheel-clack.ogg",
    win: "assets/audio/sfx/confirmation.ogg",
    fail: "assets/audio/sfx/fail.ogg",
    toggle: "assets/audio/sfx/toggle.ogg",
    woohoo: "assets/audio/sfx/rider-woohoo.ogg",
    shriek1: "assets/audio/sfx/rider-shriek-1.wav",
    shriek2: "assets/audio/sfx/rider-shriek-2.wav"
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
  var voiceCounter = 0;
  var duckTimer = 0;
  var buffers = {};
  var pending = {};
  var failed = {};
  var settings = { music: true, sfx: true, voices: true };

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function modeVolume() {
    if (mode === "run") return 0.105;
    if (mode === "result") return 0.045;
    return 0.066;
  }

  function setBus(bus, value, seconds) {
    if (!audioCtx || !bus) return;
    var now = audioCtx.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(value, now, seconds || 0.025);
  }

  function applySettings() {
    setBus(musicBus, settings.music ? modeVolume() : 0, 0.04);
    setBus(sfxBus, settings.sfx ? 0.86 : 0, 0.025);
    setBus(voiceBus, settings.voices ? 0.82 : 0, 0.025);
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
    compressor.threshold.value = -14;
    compressor.knee.value = 16;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;
    master.gain.value = muted ? 0 : 0.92;
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

  function playSample(name, amount, category, rate) {
    if (muted || !visible || !unlock(false)) return;
    if (category === "voice" && !settings.voices) return;
    if (category !== "voice" && !settings.sfx) return;
    loadSample(name).then(function (buffer) {
      if (muted || !visible || !audioCtx || audioCtx.state !== "running") return;
      var source = audioCtx.createBufferSource();
      var gain = audioCtx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = clamp((rate || 1) + (Math.random() - 0.5) * 0.035, 0.72, 1.28);
      gain.gain.value = clamp(amount == null ? 0.6 : amount, 0.04, 1);
      source.connect(gain);
      gain.connect(category === "voice" ? voiceBus : sfxBus);
      source.start();
    }).catch(function () { /* Missing assets fail silently after being reported in debug state. */ });
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

  function duck(duration) {
    if (!audioCtx || !musicStarted || !settings.music) return;
    root.clearTimeout(duckTimer);
    setBus(musicBus, 0.018, 0.025);
    duckTimer = root.setTimeout(function () { setBus(musicBus, modeVolume(), 0.09); }, duration || 650);
  }

  function play(name, intensity) {
    var amount = clamp(intensity == null ? 0.6 : intensity, 0.15, 1);
    if (name === "impact") {
      playSample(amount > 0.78 ? "impactHeavy" : amount > 0.48 ? "impactMedium" : "impactLight", amount, "sfx", 0.96 + amount * 0.08);
    } else if (name === "rubber") {
      playSample("rubber", amount, "sfx", 0.9 + amount * 0.12);
    } else if (name === "ice") {
      playSample("ice", amount * 0.72, "sfx", 0.92 + amount * 0.12);
    } else if (name === "win") {
      playSample("win", amount, "sfx", 1.03);
      duck(560);
    } else if (name === "fail") {
      playSample("fail", amount, "sfx", 0.94);
      duck(520);
    } else {
      playSample(name, amount, "sfx", name === "pencil" ? 0.96 : 1);
    }
  }

  function say(kind, intensity) {
    if (muted || !visible || !settings.voices) return;
    var sample = kind === "shriek"
      ? (voiceCounter % 2 ? "shriek2" : "shriek1")
      : "woohoo";
    voiceCounter += 1;
    playSample(sample, clamp(intensity == null ? 0.72 : intensity, 0.35, 0.9), "voice", kind === "shriek" ? 1.02 : 0.98);
    duck(kind === "shriek" ? 900 : 720);
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
    setBus(master, muted ? 0 : 0.92, 0.025);
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
        loadedSamples: Object.keys(buffers).length,
        failedSamples: Object.keys(failed)
      };
    }
  };
})(window);
