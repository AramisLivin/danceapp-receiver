// Shared by the receiver's scripts: the Cast context, element lookups and small animation helpers
const NAMESPACE = 'urn:x-cast:com.dezesar.dance';
// Matches ?v= in index.html; reported in hello, to tell which version a TV actually loaded
const VERSION = 13;
const LEAD_MS = 3000, LINGER_MS = 600;
const COLORS = { PERFECT: '#76FF03', GOOD: '#00E5FF', OK: '#FFD740', MISS: '#FF5252' };
const LABELS = { PERFECT: 'PERFECT!', GOOD: 'GOOD', OK: 'OK', MISS: 'MISS' };
// Cue figures come as 13 points (nose, shoulders, elbows, wrists, hips, knees, ankles; left before right)
// plus 4 for the feet (heels, toes)
// Every this many hits in a row gets a big "COMBO n!"
const COMBO_MILESTONE = 5;
// Enough for a burst; each is a layer the TV has to composite
const SPARKS = 12;

const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const video = document.getElementById('video');
playerManager.setMediaElement(video);
window.addEventListener('error', e => report({ type: 'error', where: 'window', error: e.message + ' @' + e.lineno }));

const $ = id => document.getElementById(id);
const idle = $('idle'), scoresEl = $('scores'), resultsEl = $('results'), progressEl = $('progress');
const toast = $('toast');
const comboFlash = $('comboflash'), edge = $('edge'), intro = $('intro'), caption = $('caption');

// Restarts a CSS animation by toggling its class
function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

// Counts a number up to its new value instead of jumping
function countTo(el, to, ms = 450) {
  const from = Number(el.dataset.value || 0);
  el.dataset.value = to;
  const start = performance.now();
  const step = now => {
    const f = Math.min(1, (now - start) / ms);
    el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - f, 3)));
    if (f < 1 && Number(el.dataset.value) === to) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Report back to the tablet, which logs it: the only window into the TV when debugging
function report(message) {
  try { context.sendCustomMessage(NAMESPACE, undefined, message); } catch (e) { /* no sender yet */ }
}

function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}
