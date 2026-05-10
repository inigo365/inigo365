// PROJECT TEMPLATE — flanking chessmen + image carousel
(function () {
  'use strict';

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  // ── Grain overlay ─────────────────────────────────────────────────────────
  // Canvas-based random noise texture injected once per page load.
  // Matches the grain used on the home page (tile-interaction.js).
  (function injectGrain() {
    if (document.getElementById('grain-overlay')) return;
    var size = 200;
    var canvas = document.createElement('canvas');
    canvas.width  = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    var id  = ctx.createImageData(size, size);
    var d   = id.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = Math.random() * 255 | 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    var div = document.createElement('div');
    div.id = 'grain-overlay';
    div.style.cssText = [
      'position:fixed',
      'inset:0',
      'pointer-events:none',
      'z-index:9998',
      'opacity:0.12',
      'mix-blend-mode:screen',
      'background-repeat:repeat',
      'background-size:200px 200px',
      'background-image:url(' + canvas.toDataURL('image/png') + ')'
    ].join(';');
    document.body.appendChild(div);
  }());

  // ── Flanking chessmen (desktop only) ──────────────────────────────────────
  // Appended to <body> as position:fixed elements.
  // Only shown when there is at least 200px of clear margin either side
  // of the 800px content column: (window.innerWidth - 800) / 2 > 200.
  var flankerLeft  = null;
  var flankerRight = null;

  function hasFlankSpace() {
    return (window.innerWidth - 800) / 2 > 200;
  }

  function makeFlanker(filename, side) {
    var img = document.createElement('img');
    img.src = '../go/images/' + filename;
    img.className = 'pt-flanker pt-flanker-' + side;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    return img;
  }

  function showFlankers() {
    if (flankerLeft) return;
    flankerLeft  = makeFlanker('chess-spin.gif',  'left');
    flankerRight = makeFlanker('chess2-spin.gif', 'right');
    document.body.appendChild(flankerLeft);
    document.body.appendChild(flankerRight);
  }

  function hideFlankers() {
    if (flankerLeft)  { flankerLeft.parentNode.removeChild(flankerLeft);   flankerLeft  = null; }
    if (flankerRight) { flankerRight.parentNode.removeChild(flankerRight); flankerRight = null; }
  }

  function syncFlankers() {
    hasFlankSpace() ? showFlankers() : hideFlankers();
  }

  // ── Image carousel ────────────────────────────────────────────────────────
  function buildCarousel(project) {
    // Grab only direct-child <img> elements (not chessmen)
    var origImgs = Array.from(project.querySelectorAll(':scope > img'));
    if (origImgs.length === 0) return;

    // Snapshot src + alt, and record the sibling immediately after the last image
    // so the carousel can be inserted in the same position (preserving any content
    // that follows the images, e.g. interactive elements on minecraft.html).
    var slides = origImgs.map(function (img) {
      return { src: img.getAttribute('src'), alt: img.alt || '' };
    });
    var lastImg = origImgs[origImgs.length - 1];
    var insertBeforeNode = lastImg.nextSibling;

    // Remove originals from DOM
    origImgs.forEach(function (img) { img.parentNode.removeChild(img); });

    var total   = slides.length;
    var current = 0;

    // Build carousel wrapper
    var carousel = document.createElement('div');
    carousel.className = 'pt-carousel';
    carousel.setAttribute('role', 'region');
    carousel.setAttribute('aria-label', 'Image gallery');

    // Build slide images — only active one is display:block
    var carouselImgs = slides.map(function (slide, i) {
      var img = document.createElement('img');
      img.src       = slide.src;
      img.alt       = slide.alt;
      img.className = 'pt-carousel-img' + (i === 0 ? ' active' : '');
      img.loading   = i === 0 ? 'eager' : 'lazy';
      carousel.appendChild(img);
      return img;
    });

    // Previous button
    var prevBtn = document.createElement('button');
    prevBtn.className   = 'pt-carousel-btn pt-carousel-prev';
    prevBtn.textContent = '<';
    prevBtn.setAttribute('aria-label', 'Previous image');
    carousel.appendChild(prevBtn);

    // Next button
    var nextBtn = document.createElement('button');
    nextBtn.className   = 'pt-carousel-btn pt-carousel-next';
    nextBtn.textContent = '>';
    nextBtn.setAttribute('aria-label', 'Next image');
    carousel.appendChild(nextBtn);

    // Counter
    var counter = document.createElement('div');
    counter.className = 'pt-carousel-counter';
    carousel.appendChild(counter);

    // Insert carousel where the images were — before whatever followed them.
    // Falls back to appendChild if nothing followed (all other project pages).
    if (insertBeforeNode && insertBeforeNode.parentNode === project) {
      project.insertBefore(carousel, insertBeforeNode);
    } else {
      project.appendChild(carousel);
    }

    // Navigation
    function updateCounter() {
      counter.textContent = pad(current + 1) + ' / ' + pad(total);
    }

    function goTo(idx) {
      var target = ((idx % total) + total) % total;
      if (target === current) return;
      carouselImgs[current].classList.remove('active');
      current = target;
      carouselImgs[current].classList.add('active');
      updateCounter();
    }

    function prev() { goTo(current - 1); }
    function next() { goTo(current + 1); }

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    // Keyboard support
    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    });

    // Touch swipe
    var touchStartX = 0;
    carousel.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    carousel.addEventListener('touchend', function (e) {
      var delta = e.changedTouches[0].clientX - touchStartX;
      if      (delta >  50) prev();
      else if (delta < -50) next();
    }, { passive: true });

    updateCounter();
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    var project = document.querySelector('.project');
    if (!project) return;

    syncFlankers();
    window.addEventListener('resize', syncFlankers);
    buildCarousel(project);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
