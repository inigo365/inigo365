// CONSOLE OVERLAY
(function () {
  // ── Skip when returning from a project page ──────────────────────────────
  // Tile clicks set sessionStorage 'fromProject' = 'true' before navigating.
  // We check and immediately clear it here so it only fires once.
  if (sessionStorage.getItem('fromProject') === 'true') {
    sessionStorage.removeItem('fromProject');
    return;
  }

  var isMobile = window.matchMedia('(pointer: coarse)').matches;

  // ── Audio ─────────────────────────────────────────────────────────────────
  // Fetch + decode to raw PCM immediately so playback is zero-latency.
  var AC = window.AudioContext || window.webkitAudioContext;
  var audioCtx    = null;
  var audioBuffer = null;

  if (AC) { try { audioCtx = new AC(); } catch(e) {} }

  if (audioCtx) {
    fetch('sfx/typewriter.mp3')
      .then(function(r) { return r.arrayBuffer(); })
      .then(function(ab) {
        audioCtx.decodeAudioData(ab,
          function(buf) { audioBuffer = buf; },
          function()    { audioCtx = null;   }
        );
      })
      .catch(function() { audioCtx = null; });
  }

  // HTML5 fallback — two DOM-attached elements so fwd/rev can overlap.
  var twEl = [document.createElement('audio'), document.createElement('audio')];
  var twIdx = 0;
  twEl.forEach(function(a) {
    a.src = 'sfx/typewriter.mp3';
    a.volume = 0.75;
    document.head.appendChild(a);
    a.load();
  });

  function playTw() {
    if (audioCtx && audioCtx.state === 'running' && audioBuffer) {
      try {
        var gain = audioCtx.createGain();
        gain.gain.value = 0.75;
        gain.connect(audioCtx.destination);
        var src = audioCtx.createBufferSource();
        src.buffer = audioBuffer;
        src.connect(gain);
        src.start(0);
        return function() { try { src.stop(); } catch(e) {} };
      } catch(e) {}
    }
    var a = twEl[twIdx];
    twIdx = 1 - twIdx;
    a.currentTime = 0;
    a.play().catch(function(){});
    return function() { a.pause(); a.currentTime = 0; };
  }

  // ── Freeze body fade-in so the overlay's black is fully opaque on paint ──
  document.body.style.opacity   = '1';
  document.body.style.animation = 'none';

  // ── Build DOM ─────────────────────────────────────────────────────────────
  var overlay = document.createElement('div');
  overlay.id  = 'console-overlay';

  var wrap = document.createElement('div');
  wrap.id  = 'console-text-wrap';

  var row    = document.createElement('span');
  var prefix = document.createElement('span');
  prefix.textContent = '> ';
  var typed  = document.createElement('span');
  var cursor = document.createElement('span');
  cursor.id  = 'console-cursor';
  cursor.classList.add('waiting');

  row.appendChild(prefix);
  row.appendChild(typed);
  row.appendChild(cursor);
  wrap.appendChild(row);
  overlay.appendChild(wrap);
  document.body.appendChild(overlay);

  // ── Chess-piece clones ────────────────────────────────────────────────────
  // .portfolio has transform:translateZ(0) → own stacking context → chess gifs
  // (z-index 10 inside it) are trapped below the overlay (z-index 5 at root).
  // Clone each as position:fixed at its current viewport coordinates instead.
  var chessClones = [];

  function cloneChessPieces() {
    document.querySelectorAll('.chess-intersection').forEach(function(img) {
      var r  = img.getBoundingClientRect();
      var cx = r.left + r.width  / 2;
      var cy = r.top  + r.height / 2;
      var sz = window.innerWidth >= 768 ? '200px' : '210px';
      var cl = img.cloneNode(true);
      cl.style.cssText =
        'position:fixed;left:'   + cx + 'px;top:' + cy +
        'px;transform:translate(-50%,-50%);height:' + sz +
        ';width:auto;pointer-events:none;z-index:10;';
      document.body.appendChild(cl);
      chessClones.push(cl);
    });
  }

  // ── Dismiss ───────────────────────────────────────────────────────────────
  function dismiss() {
    overlay.classList.add('fading');
    setTimeout(function() {
      overlay.style.display = 'none';
      // Remove fixed clones — originals in .portfolio take over
      chessClones.forEach(function(c) { c.parentNode && c.parentNode.removeChild(c); });
      chessClones = [];
      // Force-reload original GIFs: browsers throttle GIF animation behind an
      // opaque overlay; toggling src off/on restarts the animation loop.
      document.querySelectorAll('.chess-intersection').forEach(function(img) {
        var src = img.src;
        img.src = '';
        img.src = src;
      });
    }, 1400);
  }

  // ── bfcache: clean up overlay on browser back-navigation restore ──────────
  // If the user navigated away before/during the overlay sequence, bfcache
  // may restore the page with the overlay still showing and clones in the DOM.
  // Hide everything immediately — the page content is already fully visible.
  window.addEventListener('pageshow', function(e) {
    if (e.persisted) {
      chessClones.forEach(function(c) { c.parentNode && c.parentNode.removeChild(c); });
      chessClones = [];
      overlay.style.display = 'none';
    }
  });

  // ── Typewriter sequence ───────────────────────────────────────────────────
  var started = false;

  function startSequence() {
    if (started) return;
    started = true;

    document.removeEventListener('keydown',    onAnyKey);
    document.removeEventListener('click',      onAnyClick);
    document.removeEventListener('touchstart', onAnyTouch);

    // If AudioContext creation failed earlier (old iOS blocks before gesture),
    // try once more now that we're inside a user gesture.
    if (!audioCtx && AC) { try { audioCtx = new AC(); } catch(e) {} }

    // Resume in the background — never block the animation on this promise.
    // iOS AudioContext.resume() can hang indefinitely; run() must fire now.
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function(){});
    }

    cursor.classList.remove('waiting');
    cursor.style.opacity = '1';

    var text     = 'inigo365.com';
    var interval = 78;
    var i        = 0;
    var stopFwd  = playTw();

    var fw = setInterval(function() {
      typed.textContent = text.slice(0, ++i);
      if (i < text.length) return;
      clearInterval(fw);
      stopFwd();

      setTimeout(function() {
        var stopRev = playTw();
        var rv = setInterval(function() {
          typed.textContent = text.slice(0, --i);
          if (i > 0) return;
          clearInterval(rv);
          stopRev();
          dismiss();
        }, interval);
      }, 600);
    }, interval);
  }

  // ── Interaction listeners ─────────────────────────────────────────────────
  // All on document: iOS won't reliably fire touch events on plain divs.
  function onAnyKey()    { startSequence(); }
  function onAnyClick()  { startSequence(); }
  function onAnyTouch(e) { e.preventDefault(); startSequence(); }

  document.addEventListener('keydown',    onAnyKey);
  document.addEventListener('click',      onAnyClick);
  document.addEventListener('touchstart', onAnyTouch, { passive: false });

  // ── On load: position text (mobile) + clone chess pieces ─────────────────
  window.addEventListener('load', function() {
    // Set flag on every tile click so the overlay is skipped on return
    document.querySelectorAll('a.tile').forEach(function(tile) {
      tile.addEventListener('click', function() {
        // go/index.html is the homepage — arriving from there should still
        // show the overlay, so only set the flag for genuine project pages.
        if (tile.getAttribute('href') !== 'go/index.html') {
          sessionStorage.setItem('fromProject', 'true');
        }
      });
    });

    if (isMobile) {
      var gifs = document.querySelectorAll('.chess-intersection');
      if (gifs.length >= 2) {
        var r1   = gifs[0].getBoundingClientRect();
        var r2   = gifs[1].getBoundingClientRect();
        var midY = (r1.top + r1.height / 2 + r2.top + r2.height / 2) / 2;
        wrap.style.top       = midY + 'px';
        wrap.style.transform = 'translateX(-50%)';
      }
    }
    cloneChessPieces();
  });
}());
