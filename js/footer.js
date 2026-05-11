// FOOTER — console-aesthetic links
(function () {
  'use strict';

  // ── DOM setup ─────────────────────────────────────────────────────────────
  function init() {
    var footer = document.querySelector('.simple-footer');
    if (!footer) return;

    var isMobile = !window.matchMedia('(min-width: 768px)').matches;

    // On mobile, filter out links marked data-desktop-only (WhatsApp, Instagram)
    var links = Array.from(footer.querySelectorAll('.simple-footer-link'))
      .filter(function(link) {
        return !isMobile || link.getAttribute('data-desktop-only') !== 'true';
      });

    // Rebuild as a single centred row: link · link · …
    footer.innerHTML = '';

    links.forEach(function(link, idx) {
      if (idx > 0) {
        var sep = document.createElement('span');
        sep.className   = 'footer-sep';
        sep.textContent = '·';
        footer.appendChild(sep);
      }
      footer.appendChild(link);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
