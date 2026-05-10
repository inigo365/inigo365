// TILE INTERACTION — cursor on hover, typewriter reveal on click/tap
(function () {
  'use strict';

  var isMobile = window.matchMedia('(pointer: coarse)').matches;

  // ── Canvas-based grain overlay ────────────────────────────────────────────
  // Generates a 200×200 random-noise PNG via Canvas and injects a fixed div
  // styled by grain.css. Canvas toDataURL() produces a valid PNG data URL in
  // every browser, sidestepping SVG feTurbulence filter-reference issues.
  (function injectGrain() {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 200;
    var ctx = canvas.getContext('2d');
    var img = ctx.createImageData(200, 200);
    var d   = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = Math.floor(Math.random() * 256);
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    var grain = document.createElement('div');
    grain.id = 'grain-overlay';
    grain.style.backgroundImage = 'url(' + canvas.toDataURL('image/png') + ')';
    document.body.appendChild(grain);
  })();

  // ── Audio ─────────────────────────────────────────────────────────────────
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

  var twAudio = [document.createElement('audio'), document.createElement('audio')];
  var twIdx   = 0;
  twAudio.forEach(function(a) {
    a.src    = 'sfx/typewriter.mp3';
    a.volume = 0.75;
    document.head.appendChild(a);
    a.load();
  });

  function sfxPlay(name) {
    if (name !== 'typewriter') return function() {};
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
    var a = twAudio[twIdx];
    twIdx = 1 - twIdx;
    a.currentTime = 0;
    a.play().catch(function() {});
    return function() { a.pause(); a.currentTime = 0; };
  }

  // ── Typewriter reveal ─────────────────────────────────────────────────────
  function typewriterReveal(element, text, onComplete) {
    element.textContent = '';
    var stopTw = sfxPlay('typewriter');
    var i = 0;
    var tw = setInterval(function() {
      element.textContent = text.slice(0, ++i);
      if (i >= text.length) {
        clearInterval(tw);
        if (stopTw) stopTw();
        if (onComplete) onComplete();
      }
    }, 80);
  }

  // ── Tile initialisation ───────────────────────────────────────────────────
  function initTiles() {
    document.querySelectorAll('a.tile').forEach(function(tile) {
      var href = tile.getAttribute('href');

      var titleText = '';
      var existingOverlay = tile.querySelector('.overlay');
      if (existingOverlay) titleText = existingOverlay.innerText.trim();

      // ── Cursor element ───────────────────────────────────────────────────
      var cursorEl   = document.createElement('div');
      cursorEl.className = 'tile-cursor';
      var cursorChar = document.createElement('span');
      cursorChar.className   = 'tile-cursor-char';
      cursorChar.textContent = '█';
      cursorEl.appendChild(cursorChar);
      tile.appendChild(cursorEl);

      // ── Label element ────────────────────────────────────────────────────
      // Inner span (.tile-label-text) holds the typewriter text so that CSS
      // text-overflow / nowrap can target a block child of the flex container.
      var labelEl   = document.createElement('div');
      labelEl.className = 'tile-label';
      var labelText = document.createElement('span');
      labelText.className = 'tile-label-text';
      labelEl.appendChild(labelText);
      tile.appendChild(labelEl);

      var isAnimating = false;

      // ── Desktop hover: show / hide cursor ────────────────────────────────
      tile.addEventListener('mouseenter', function() {
        if (isAnimating) return;
        cursorEl.classList.add('visible');
      });

      tile.addEventListener('mouseleave', function() {
        if (isAnimating) return;
        cursorEl.classList.remove('visible');
      });

      // ── Click / tap ───────────────────────────────────────────────────────
      tile.addEventListener('click', function(e) {
        e.preventDefault();
        if (isAnimating) return;

        var consoleOverlay = document.getElementById('console-overlay');
        if (consoleOverlay && consoleOverlay.style.display !== 'none') return;

        isAnimating = true;

        if (!audioCtx && AC) { try { audioCtx = new AC(); } catch(e) {} }
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(function() {});
        }

        function startTypewriter() {
          cursorEl.classList.remove('visible');
          labelEl.classList.add('visible');
          typewriterReveal(labelText, '> ' + titleText, function() {
            setTimeout(function() {
              // go/index.html is the homepage — arriving from there should
              // still show the overlay, so only set the flag for project pages.
              if (href !== 'go/index.html') {
                sessionStorage.setItem('fromProject', 'true');
              }
              window.location.href = href;
            }, 300);
          });
        }

        if (isMobile) {
          // Brief cursor flash (one blink cycle) before typewriter begins
          cursorEl.classList.add('visible');
          setTimeout(startTypewriter, 300);
        } else {
          startTypewriter();
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTiles);
  } else {
    initTiles();
  }
}());
