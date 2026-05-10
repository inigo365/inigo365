// FOOTER — console-aesthetic links
(function () {
  'use strict';

  // ── DOM setup ─────────────────────────────────────────────────────────────
  function init() {
    var footer = document.querySelector('.simple-footer');
    if (!footer) return;

    // Collect existing link anchors before modifying the DOM
    var links = Array.from(footer.querySelectorAll('.simple-footer-link'));

    // Rebuild as a single centred row: link · link · link · link · link
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
