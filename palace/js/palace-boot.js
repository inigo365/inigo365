// PALACE BOOT SEQUENCE
// Modeled on go/js/console-overlay.js: full-screen black overlay, typewriter
// "> inigo365.com" (78ms cadence, same audio, forward-type / pause /
// reverse-type / dismiss). Adapted so the FRIEND gif is the centerpiece AND,
// on desktop, physically GLIDES from its centered boot position into
// .friend-sprite's resting spot (a FLIP transform), instead of a hard swap.
// Plays on every load (no session gate), matching go/index.html.
(function () {
  // ── Elements hidden until the handoff ─────────────────────────────────────
  var friendSprite = document.querySelector('.friend-sprite');
  var rackWrap     = document.querySelector('.rack-wrap');

  // Keep the persistent sprite + rack fully invisible (no transition) for the
  // whole sequence, so neither shows through/under the overlay before the
  // handoff. We kill the CSS fadeIn animation too, otherwise it would win over
  // the inline opacity:0 and reveal them early.
  if (friendSprite) {
    friendSprite.style.animation  = 'none';
    friendSprite.style.transition = 'none';
    friendSprite.style.opacity    = '0';
  }
  if (rackWrap) {
    rackWrap.style.animation = 'none';
    rackWrap.style.opacity   = '0';
  }

  // ── Audio ─────────────────────────────────────────────────────────────────
  // Fetch + decode to raw PCM immediately so playback is zero-latency.
  // Paths resolve against the document base (palace/index.html) → /sfx/…
  var AC = window.AudioContext || window.webkitAudioContext;
  var audioCtx    = null;
  var audioBuffer = null;

  if (AC) { try { audioCtx = new AC(); } catch(e) {} }

  if (audioCtx) {
    fetch('../sfx/typewriter.mp3')
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
    a.src = '../sfx/typewriter.mp3';
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

  // ── Build DOM ─────────────────────────────────────────────────────────────
  // Overlay is a flex column: friend gif centered, typewriter text below.
  var overlay = document.createElement('div');
  overlay.id  = 'palace-boot-overlay';

  // Reuse the SAME asset already loaded for .friend-sprite — no duplicate path.
  var gif = document.createElement('img');
  gif.id  = 'palace-boot-gif';
  gif.src = '../go/images/friend-spin.webp';
  gif.alt = '';

  var textWrap = document.createElement('div');
  textWrap.id  = 'palace-boot-text';
  var prefix = document.createElement('span');
  prefix.textContent = '> ';
  var typed  = document.createElement('span');
  var cursor = document.createElement('span');
  cursor.id  = 'palace-boot-cursor';
  cursor.classList.add('waiting');

  textWrap.appendChild(prefix);
  textWrap.appendChild(typed);
  textWrap.appendChild(cursor);

  overlay.appendChild(gif);
  overlay.appendChild(textWrap);
  document.body.appendChild(overlay);

  var travelingGif = null; // the boot gif once detached for the FLIP

  // Fade the rack UI (banner + featured cards + music list) in. Called once the
  // friend has settled (desktop) or alongside the overlay fade (mobile).
  function revealRack() {
    if (!rackWrap) return;
    rackWrap.style.transition = 'opacity 500ms ease';
    // Double-rAF so the browser commits the opacity:0 start (with the transition
    // now set) before we flip to 1 — otherwise setting both in one tick can
    // leave the transition stuck at its start value.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        rackWrap.style.opacity = '1';
      });
    });
  }

  // ── Dismiss ───────────────────────────────────────────────────────────────
  var FLIP_MS    = 850;  // friend glide duration
  var OVERLAY_MS = 650;  // black fade — finishes a bit before the glide completes
                         // so the motion is visible against a lightening backdrop

  function dismiss() {
    // FLIP only when .friend-sprite has a real, visible resting position to
    // travel to. Below 769px it's display:none (no target) — gate on the same
    // width the mobile hide uses, and double-check computed display.
    var canFlip = friendSprite &&
                  window.innerWidth > 768 &&
                  getComputedStyle(friendSprite).display !== 'none';

    if (!canFlip) {
      // MOBILE (or no sprite): simple fade — the gif fades out with the overlay
      // while the rack fades in. No FLIP.
      overlay.style.transition = 'opacity ' + OVERLAY_MS + 'ms ease';
      overlay.classList.add('fading');
      revealRack();
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, OVERLAY_MS + 50);
      return;
    }

    // ── DESKTOP FLIP ──────────────────────────────────────────────────────
    var from = gif.getBoundingClientRect();
    var to   = friendSprite.getBoundingClientRect(); // valid even at opacity:0

    // Pin the gif where it is (fixed) and lift it above the overlay so it stays
    // visible as the black fades. Reparent to <body> so it survives overlay
    // removal.
    gif.style.position        = 'fixed';
    gif.style.margin          = '0';
    gif.style.left            = from.left   + 'px';
    gif.style.top             = from.top    + 'px';
    gif.style.width           = from.width  + 'px';
    gif.style.height          = from.height + 'px';
    gif.style.transformOrigin = 'top left';
    gif.style.transform       = 'translate(0px, 0px) scale(1)';
    gif.style.zIndex          = '10000';
    document.body.appendChild(gif);
    travelingGif = gif;

    // Fade the overlay out now (a touch faster than the glide).
    overlay.style.transition = 'opacity ' + OVERLAY_MS + 'ms ease';
    overlay.classList.add('fading');
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, OVERLAY_MS + 50);

    // FLIP delta: translate top-left from → to, scale by the width ratio
    // (same image, so width/height ratios match → uniform scale).
    var dx = to.left - from.left;
    var dy = to.top  - from.top;
    var s  = from.width ? (to.width / from.width) : 1;

    // Commit the identity transform as the starting point before transitioning.
    void gif.getBoundingClientRect();

    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      gif.removeEventListener('transitionend', onEnd);
      // Reveal the real sprite exactly where the traveler landed, then remove
      // the traveler so there's no visual doubling. (The webp keeps animating
      // on its own once visible — no src re-poke needed, and re-poking a large
      // animated webp mid-handoff risks a paint stall.)
      if (friendSprite) {
        friendSprite.style.opacity = '1';
      }
      if (travelingGif && travelingGif.parentNode) {
        travelingGif.parentNode.removeChild(travelingGif);
      }
      travelingGif = null;
      // Bring the rack UI in around the settled friend.
      revealRack();
    }
    function onEnd(e) { if (e.propertyName === 'transform') finish(); }
    gif.addEventListener('transitionend', onEnd);
    // Safety net in case transitionend never fires (e.g. no geometry change).
    setTimeout(finish, FLIP_MS + 120);

    gif.style.transition = 'transform ' + FLIP_MS + 'ms ease-in-out';
    gif.style.transform  = 'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')';
  }

  // ── bfcache: clean up on browser back-navigation restore ──────────────────
  // bfcache restores the page with the sequence's inline styles intact (overlay
  // present, rack/sprite at opacity:0). Remove the overlay/traveler AND undo the
  // opacity so the page isn't left blank.
  window.addEventListener('pageshow', function(e) {
    if (e.persisted) {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (travelingGif && travelingGif.parentNode) {
        travelingGif.parentNode.removeChild(travelingGif);
      }
      if (rackWrap)     { rackWrap.style.transition = 'none'; rackWrap.style.opacity = '1'; }
      if (friendSprite) { friendSprite.style.transition = 'none'; friendSprite.style.opacity = '1'; }
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
}());
