/* click-sfx.js — Web Audio API sound system for portfolio pages
   Mirrors the SFX engine in go/index.html for consistent behaviour across
   mobile and desktop.

   Include with:
     <script src="js/click-sfx.js"></script>        (from root, e.g. home/about)
     <script src="../js/click-sfx.js"></script>     (from /projects pages)

   Usage:
     clickSFX.play()         — play click.mp3
     clickSFX.playCorrect()  — play correct.mp3  (used by about.html swipe unlock)
*/
const clickSFX = (() => {

  /* ── Path resolution ────────────────────────────────────────────────
     Works whether this script is loaded from root or /projects.        */
  function getBase() {
    const s = document.querySelector('script[src*="click-sfx"]');
    if (!s) return '';
    // Strip  "js/click-sfx.js"  (or "../js/click-sfx.js") from the full URL
    return s.src.replace(/(?:\.\.\/)?js\/click-sfx\.js.*$/, '');
  }
  const base = getBase();

  const paths = {
    click:    base + 'go/sounds/click.mp3',
    correct:  base + 'go/sounds/correct.mp3',
    password: base + 'go/sounds/password.mp3',
  };
  const volumes = { click: 0.55, correct: 0.75, password: 0.75 };
  const POOL_SIZES = { click: 6, correct: 3, password: 4 };

  /* ── State ──────────────────────────────────────────────────────── */
  let ctx             = null;
  let master          = null;
  let unlocked        = false;
  let heartbeatTimer  = null;

  const fetched = new Map();   // name -> ArrayBuffer
  const buffers = new Map();   // name -> AudioBuffer
  const pools   = new Map();   // name -> { els: HTMLAudioElement[], i: number }

  /* ── HTMLAudio pool (iOS fallback) ──────────────────────────────── */
  function ensurePool(name) {
    if (pools.has(name)) return pools.get(name);
    const n = POOL_SIZES[name] ?? 3;
    const els = Array.from({ length: n }, () => {
      const a = new Audio(paths[name]);
      a.preload = 'auto';
      a.volume  = volumes[name] ?? 1;
      return a;
    });
    const obj = { els, i: 0 };
    pools.set(name, obj);
    return obj;
  }

  // Pre-build all pools immediately so iOS starts buffering straight away.
  for (const n of Object.keys(paths)) ensurePool(n);

  function playFromPool(name) {
    const pool = ensurePool(name);
    const a = pool.els[pool.i];
    pool.i = (pool.i + 1) % pool.els.length;
    try {
      a.pause();
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {}
  }

  /* ── Web Audio ──────────────────────────────────────────────────── */
  async function fetchAll() {
    await Promise.all(Object.keys(paths).map(async (name) => {
      try {
        const res = await fetch(paths[name], { cache: 'force-cache' });
        fetched.set(name, await res.arrayBuffer());
      } catch { /* pool stays as fallback */ }
    }));
  }

  function ensureContext() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    return ctx;
  }

  // Silent heartbeat — prevents iOS from suspending the AudioContext.
  function startHeartbeat() {
    if (heartbeatTimer) return;
    heartbeatTimer = setInterval(() => {
      if (!ctx || !master || ctx.state !== 'running') return;
      try {
        const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(master);
        src.start(0);
      } catch {}
    }, 25000);
  }

  async function decodeAllIfPossible() {
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch {} }
    for (const name of Object.keys(paths)) {
      if (buffers.has(name)) continue;
      const arr = fetched.get(name);
      if (!arr) continue;
      try {
        const buf = await ctx.decodeAudioData(arr.slice(0));
        buffers.set(name, buf);
      } catch { ensurePool(name); }
    }
  }

  // Must be called inside a user-gesture handler to satisfy iOS autoplay policy.
  async function unlockNow() {
    if (unlocked) return;
    unlocked = true;
    ensureContext();
    await decodeAllIfPossible();
    // Warm-up blip — kicks iOS AudioContext into "running"
    if (ctx && master && ctx.state === 'running') {
      try {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        g.gain.value = 0.0001;
        osc.connect(g);
        g.connect(master);
        osc.start();
        osc.stop(ctx.currentTime + 0.01);
      } catch {}
    }
    startHeartbeat();
  }

  function playWebAudio(name) {
    if (!ctx || !master) return false;
    const buf = buffers.get(name);
    if (!buf) return false;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = volumes[name] ?? 1;
      src.connect(g);
      g.connect(master);
      src.start(0);
      return true;
    } catch { return false; }
  }

  function play(name) {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    const ok = playWebAudio(name);
    if (!ok) playFromPool(name);
  }

  // Resume when the page comes back into focus (e.g. after tab switch).
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  });

  // Start fetching immediately so buffers are ready before first gesture.
  fetchAll();

  // Unlock on first gesture — whichever fires first.
  const prime = () => unlockNow();
  window.addEventListener('touchstart',  prime, { capture: true, once: true });
  window.addEventListener('pointerdown', prime, { capture: true, once: true });
  window.addEventListener('keydown',     prime, { capture: true, once: true });

  return {
    play:          ()  => play('click'),
    playCorrect:   ()  => play('correct'),
    playPassword:  ()  => play('password'),
    unlockNow,
  };
})();
