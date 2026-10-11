// ---------- Menu, as on the tablet: song list with a silent preview, then line-up posters ----------
// The tablet sends everything ready to draw (colors, difficulty, record, poses, preview stretch); the remote
// moves around here, and OK on a poster sends the pick back.
let menu = null;
const listEl = $('list'), lineupsEl = $('lineups'), hintEl = idle.querySelector('.hint');
const previewEl = $('preview'), previewVideo = $('preview-video');

// ---------- Disco hall: the tablet's DanceBackground, as elements ----------
(function buildDisco() {
  // Seeded, so the hall is the same every time
  let seed = 7;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const colors = ['#FF4081', '#00E5FF', '#FFD740', '#B388FF'];
  const disco = $('disco');
  for (let i = 0; i < 18; i++) {
    const light = document.createElement('div');
    light.className = 'light';
    const r = 1.2 + random() * 5.5, c = colors[i % 4];
    light.style.cssText = `left:${random() * 100 - r}vw;top:${random() * 100}vh;width:${2 * r}vw;height:${2 * r}vw;margin-top:${-r}vw;` +
      `background:radial-gradient(circle,${rgba(c, .33)},${rgba(c, .06)} 55%,transparent 70%);` +
      `--period:${6 + random() * 4}s;--delay:${-random() * 8}s;--dx:${random() * 2 - 1}vw;--dy:${random() * 2 - 1}vw`;
    disco.appendChild(light);
  }
  const ball = document.createElement('div');
  ball.className = 'ball';
  for (let i = 0; i < 30; i++) {
    const x = random() * 100, y = random() * 100, period = 2 + random() * 4, delay = -random() * 5;
    for (const copy of [0, 100]) {
      const s = document.createElement('div');
      s.className = 'sparkle';
      s.style.cssText = `left:${(x + copy) / 2}%;top:${y}%;--period:${period}s;--delay:${delay}s`;
      ball.appendChild(s);
    }
  }
  disco.appendChild(ball);
})();

// ---------- Small pieces, as in the tablet's MenuParts ----------
let figureIds = 0;

// Poses side by side, filling a box: two dancers overlap a little, as they stand on a poster
function figures(box, poses, aspect, tints) {
  const w = box.clientWidth, h = box.clientHeight;
  const n = poses.length;
  if (!n) return;
  const size = Math.min(h, w / (1 + 0.55 * (n - 1)));
  const step = n > 1 ? (w - size) / (n - 1) : 0;
  const left = n > 1 ? 0 : (w - size) / 2;
  poses.forEach((pose, i) => {
    const svg = figureSvg(pose.p, pose.f, aspect, tints[Math.min(i, tints.length - 1)], 'menu-figure-' + figureIds++);
    // The figure keeps a 6% margin inside its square, like the cue cards
    const inset = size * 0.06;
    svg.style.cssText = `left:${left + i * step + inset}px;top:${(h - size) / 2 + inset}px;width:${size - 2 * inset}px;height:${size - 2 * inset}px`;
    box.appendChild(svg);
  });
}

function people(count) {
  return '<span class="people">' +
    '<svg viewBox="0 0 7.2 10"><circle cx="3.6" cy="1.9" r="1.75"/><path d="M.7 10Q.7 4.2 3.6 4.2T6.5 10Z"/></svg>'.repeat(count) + '</span>';
}

function stars(count) {
  return '<span class="stars"><b>' + '★'.repeat(count) + '</b>' + '★'.repeat(5 - count) + '</span>';
}

function songColors(el, color) {
  el.style.setProperty('--c', color);
  el.style.setProperty('--soft', rgba(color, .26));
  el.style.setProperty('--soft2', rgba(color, .45));
  el.style.setProperty('--glow', rgba(color, .35));
}

const escapeHtml = text => String(text).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const posterPoses = (song, dancers) => dancers.map(i => song.posters[i]).filter(Boolean);

// ---------- Screens ----------
function showMenu(msg) {
  const previous = menu && menu.songs[menu.selected];
  menu = { songs: msg.songs, selected: 0, screen: 'list', focus: 0 };
  // The same song stays chosen, on the same screen, when the tablet sends the list again
  const again = previous ? msg.songs.findIndex(s => s.id === previous.id) : -1;
  if (again >= 0) {
    menu.selected = again;
    menu.screen = previousScreen;
  }
  idle.classList.toggle('empty', !msg.songs.length);
  $('status').textContent = msg.songs.length ? '' : 'На планшете нет песен';
  buildList();
  if (menu.screen === 'setup') openSetup(menu.songs[menu.selected].selectedOption || 0); else openList();
}

let previousScreen = 'list';

function buildList() {
  listEl.innerHTML = '';
  menu.songs.forEach(song => {
    const row = document.createElement('div');
    row.className = 'row';
    songColors(row, song.color);
    row.innerHTML = '<div class="icon"></div><div><div class="name"></div><div class="meta"><span></span>' + people(song.dancers) +
      (song.record ? stars(song.record.stars) : '') + '</div></div>';
    row.querySelector('.name').textContent = song.title;
    row.querySelector('.meta span').textContent = song.duration;
    listEl.appendChild(row);
    song.rowEl = row;
  });
  // Figures are sized from the laid-out boxes
  requestAnimationFrame(() => menu.songs.forEach(song =>
    figures(song.rowEl.querySelector('.icon'), posterPoses(song, [0]), song.aspectRatio, [song.tint])));
}

function openList() {
  menu.screen = previousScreen = 'list';
  idle.classList.remove('setup');
  hintEl.innerHTML = '<span><span class="key">▲▼</span>песня</span><span><span class="key">OK</span>танцевать</span>';
  renderList();
}

function renderList() {
  menu.songs.forEach((song, i) => song.rowEl.classList.toggle('selected', i === menu.selected));
  const song = menu.songs[menu.selected];
  songColors(previewEl, song.color);
  previewEl.querySelector('h2').textContent = song.title;
  const bars = [1, 2, 3].map(i => `<i${i <= song.difficulty ? ' class="on"' : ''}></i>`).join('');
  previewEl.querySelector('.facts').innerHTML = `<span>${escapeHtml(song.duration)}</span>` +
    `<span><span class="bars">${bars}</span>${escapeHtml(song.about)}</span>` +
    (song.record ? `<span class="record">Рекорд ${song.record.points} ${stars(song.record.stars)}</span>` : '<span class="none">Ещё не танцевали</span>');
  schedulePreview(song);
}

function openSetup(focus) {
  const song = menu.songs[menu.selected];
  menu.screen = previousScreen = 'setup';
  menu.focus = focus;
  idle.classList.add('setup');
  idle.querySelector('header .title').textContent = song.title;
  hintEl.innerHTML = '<span><span class="key">◀▶</span>кто танцует</span><span><span class="key">OK</span>начать</span><span><span class="key">▲</span>назад</span>';
  stopPreview();
  lineupsEl.innerHTML = '';
  song.options.forEach(option => {
    const poster = document.createElement('div');
    poster.className = 'poster';
    const [c1, c2] = option.colors;
    songColors(poster, c1);
    poster.style.setProperty('--ring', c2 ? `linear-gradient(90deg,${c1},${c2})` : c1);
    poster.style.setProperty('--shadow', c2 ? `-3vh 0 6vh ${rgba(c1, .35)}, 3vh 0 6vh ${rgba(c2, .35)}` : `0 0 6vh ${rgba(c1, .35)}`);
    poster.innerHTML = '<div class="figure"></div><div class="words"><b></b><span></span></div>';
    poster.querySelector('b').textContent = option.title;
    poster.querySelector('.words span').textContent = option.subtitle;
    lineupsEl.appendChild(poster);
    requestAnimationFrame(() => figures(poster.querySelector('.figure'), posterPoses(song, option.dancers), song.aspectRatio, option.tints));
  });
  renderSetup();
}

// Focus: a poster's index, or -1 for the back button
function renderSetup() {
  lineupsEl.querySelectorAll('.poster').forEach((p, i) => p.classList.toggle('focus', i === menu.focus));
  idle.querySelector('.back').classList.toggle('focus', menu.focus < 0);
}

// ---------- Preview: the song's busiest stretch, looping without sound ----------
let previewTimer = 0, previewSong = null;

// Waits a moment, so scrolling through the list doesn't start loading every song on the way
function schedulePreview(song) {
  clearTimeout(previewTimer);
  if (previewSong === song.id && !previewVideo.paused) return;
  previewVideo.classList.remove('playing');
  previewTimer = setTimeout(() => playPreview(song), 350);
}

function playPreview(song) {
  stopPreview();
  if (!song.preview || idle.style.display === 'none') return;
  previewSong = song.id;
  previewVideo.dataset.start = song.preview.startMs / 1000;
  previewVideo.dataset.end = song.preview.endMs / 1000;
  previewVideo.src = song.preview.url + '#t=' + song.preview.startMs / 1000;
  previewVideo.play().catch(e => report({ type: 'error', where: 'preview', error: String(e) }));
}

function stopPreview() {
  clearTimeout(previewTimer);
  previewSong = null;
  previewVideo.classList.remove('playing');
  if (!previewVideo.getAttribute('src')) return;
  previewVideo.pause();
  // Frees the TV's video decoder for the game
  previewVideo.removeAttribute('src');
  previewVideo.load();
}

// Back on the menu after a game or calibration
function resumeMenu() {
  if (!menu || !menu.songs.length) return;
  if (menu.screen === 'list') schedulePreview(menu.songs[menu.selected]);
  // Fresh posters: the chosen one flew off when the song started
  else openSetup(menu.focus);
}

previewVideo.addEventListener('playing', () => previewVideo.classList.add('playing'));
previewVideo.addEventListener('timeupdate', () => {
  if (previewVideo.currentTime >= Number(previewVideo.dataset.end)) previewVideo.currentTime = Number(previewVideo.dataset.start);
});

// ---------- Remote ----------
const BACK_KEYS = ['Escape', 'Backspace', 'GoBack', 'BrowserBack'];

function onKey(key) {
  if (resultsEl.style.display === 'flex') {
    if (key === 'ArrowLeft' || key === 'ArrowRight') { resultsChoice = 1 - resultsChoice; renderResultsChoice(); }
    if (key === 'Enter') {
      // "К списку" comes back to the song list; "Ещё раз" keeps the posters
      if (resultsChoice === 1) previousScreen = 'list';
      report({ type: resultsChoice === 0 ? 'again' : 'menu' });
    }
    return;
  }
  // In the lobby, OK starts the song with whoever is in view
  if (game && game.lobby) { if (key === 'Enter') report({ type: 'go' }); return; }
  if (game || !menu || !menu.songs.length || idle.style.display === 'none') return;
  const n = menu.songs.length;
  if (menu.screen === 'list') {
    if (key === 'ArrowDown') menu.selected = (menu.selected + 1) % n;
    else if (key === 'ArrowUp') menu.selected = (menu.selected + n - 1) % n;
    else if (key === 'Enter' || key === 'ArrowRight') { openSetup(menu.songs[menu.selected].selectedOption || 0); return; }
    else return;
    renderList();
    return;
  }
  const options = menu.songs[menu.selected].options.length;
  const back = menu.focus < 0;
  if (BACK_KEYS.includes(key) || (key === 'Enter' && back)) { openList(); return; }
  if (key === 'Enter') {
    stopPreview();
    // The chosen poster grows and fades while the others fly off to the sides; the lobby follows
    lineupsEl.querySelectorAll('.poster').forEach((p, i) =>
      p.classList.add(i === menu.focus ? 'chosen' : i < menu.focus ? 'gone-left' : 'gone-right'));
    report({ type: 'start', id: menu.songs[menu.selected].id, option: menu.focus });
    return;
  }
  if (key === 'ArrowUp') menu.focus = -1;
  else if (key === 'ArrowDown' && back) menu.focus = menu.songs[menu.selected].selectedOption || 0;
  else if (key === 'ArrowRight' && !back) menu.focus = Math.min(options - 1, menu.focus + 1);
  else if (key === 'ArrowLeft' && !back) menu.focus = Math.max(0, menu.focus - 1);
  renderSetup();
}
