/* click-sfx.js — lightweight click.mp3 player for portfolio pages
   Include with: <script src="js/click-sfx.js"></script> (or ../js/click-sfx.js from /projects)
   Then call: clickSFX.play()  */
const clickSFX = (() => {
  let pool = null;
  let idx = 0;
  const POOL_SIZE = 4;
  const VOLUME = 0.55;

  function getBase() {
    const s = document.querySelector('script[src*="click-sfx"]');
    if (!s) return '';
    return s.src.replace(/js\/click-sfx\.js.*$/, '');
  }

  function ensurePool() {
    if (pool) return;
    const base = getBase();
    const src = base + 'go/sounds/click.mp3';
    pool = Array.from({ length: POOL_SIZE }, () => {
      const a = new Audio(src);
      a.preload = 'auto';
      a.volume = VOLUME;
      return a;
    });
  }

  function play() {
    ensurePool();
    const a = pool[idx];
    idx = (idx + 1) % POOL_SIZE;
    try {
      a.pause();
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {}
  }

  return { play };
})();
