// ---------- A round: replaced by each "level" message ----------
let game = null;

function resetOverlay() {
  document.querySelectorAll('.popup, .presence, .join, .strip, .spark, .goword, .shut, .finish').forEach(e => e.remove());
  lobbyEl.style.display = 'none';
  scoresEl.innerHTML = '';
  scoresEl.style.display = 'none';
  progressEl.style.display = 'none';
  resultsEl.style.display = 'none';
  intro.classList.remove('show');
}

function startLevel(msg) {
  resetOverlay();
  caption.style.display = 'none';
  const solo = msg.players.length === 1;
  game = {
    durationMs: msg.durationMs || 0,
    players: msg.players.map(p => {
      // A lone player is gold; two players wear their side's color
      const color = solo ? '#FFD740' : p.color;
      const card = document.createElement('div');
      card.className = 'scorecard';
      card.style.color = color;
      card.innerHTML = '<div class="points">0</div><div class="combo"></div><div class="badge"></div>';
      scoresEl.appendChild(card);
      const popup = document.createElement('div');
      popup.className = 'popup ' + (solo ? 'solo' : p.side.toLowerCase());
      document.body.appendChild(popup);
      const presence = document.createElement('div');
      presence.className = 'presence';
      presence.style.left = solo ? '25%' : (p.side === 'LEFT' ? '0' : '50%');
      presence.innerHTML = '<span></span>';
      presence.querySelector('span').textContent = solo ? 'Встаньте в кадр' : p.label + ': встаньте в кадр';
      document.body.appendChild(presence);
      // A dropped-out player's way back in: raise a hand
      const join = document.createElement('div');
      join.className = 'join ' + p.side.toLowerCase();
      join.style.setProperty('--c', p.color);
      join.innerHTML = '<div class="ring"><span>✋</span></div><div><b>Поднимите руку,</b><br>чтобы танцевать вдвоём</div>';
      document.body.appendChild(join);
      // With a lobby, nobody dances until they've raised a hand there
      return { ...p, solo, color, active: !msg.lobby, judged: {}, cardEl: card, popupEl: popup, presenceEl: presence, joinEl: join };
    }),
    title: msg.title || '',
    lobby: !!msg.lobby,
    // This TV shows the picture about this much after its clock says: cues follow the picture, not the clock
    cueDelayMs: msg.cueDelayMs || 0,
  };
  game.players.forEach(p => buildCues(p, msg.aspectRatio));
  // After the lobby's entrance, so the two don't compete for the same frames
  setTimeout(() => buildFigures(game), msg.lobby ? 700 : 0);
  idle.style.display = 'none';
  if (game.lobby) showLobby(msg); else go();
}

// The song starts: the lobby gives way to the game
function go() {
  if (!game) return;
  const fromLobby = game.lobby;
  game.lobby = false;
  if (fromLobby) openLobby(); else lobbyEl.style.display = 'none';
  scoresEl.style.display = 'flex';
  progressEl.style.display = 'block';
  layout();
  const dancing = game.players.filter(p => p.active);
  intro.querySelector('h1').textContent = game.title;
  intro.querySelector('p').textContent = dancing.length > 1 ? dancing.map(p => p.label).join('   ·   ') : '';
  replay(intro, 'show');
}

// Dancing players, or everyone when nobody is in: what the screen is laid out for
function dancing() { return game.players.filter(p => p.active).length ? game.players.filter(p => p.active) : game.players; }

// Two players down to one: the other's card folds away and their cues go; back to two, they return
function layout() {
  const shown = dancing();
  for (const p of game.players) {
    const on = shown.includes(p);
    p.cardEl.classList.toggle('away', !on);
    p.stripEl.style.opacity = on ? '1' : '0';
  }
}

// From the tablet ten times a second while playing: who's in, and anyone raising a hand to join
function updateRoster(msg) {
  if (!game || game.lobby) return;
  let changed = false;
  const anyone = msg.players.some(s => s.active);
  for (const s of msg.players) {
    const p = player(s.side);
    if (!p) continue;
    if (p.active !== s.active) { p.active = s.active; changed = true; }
    p.live = s.live || null;
    // "Stand in frame" is for someone dancing who has gone out of view
    p.presenceEl.style.display = s.active && !s.inView ? 'block' : 'none';
    const joining = !p.solo && !s.active && s.inView && anyone;
    p.joinEl.classList.toggle('show', joining);
    if (joining) p.joinEl.style.setProperty('--p', s.progress);
  }
  if (changed) layout();
}

// ---------- Lobby: players take their places and raise a hand; the tablet counts down and says go ----------
const lobbyEl = $('lobby');

function showLobby(msg) {
  const solo = msg.players.length === 1;
  lobbyEl.querySelector('h1').textContent = msg.title || '';
  lobbyEl.querySelector('p').textContent = solo ? 'Встаньте в кадр и поднимите руку' : 'Встаньте каждый на свою половину и поднимите руку';
  lobbyEl.classList.toggle('duo', !solo);
  const places = lobbyEl.querySelector('.places');
  places.innerHTML = '';
  for (const p of game.players) {
    const place = document.createElement('div');
    place.className = 'place';
    place.style.setProperty('--c', p.color);
    place.innerHTML = '<div class="live"></div><div class="card"><div class="dancer"></div><div class="words">' +
      (solo ? '' : '<b class="who"></b>') + '<span class="follow"></span><strong class="status">Встаньте сюда</strong></div>' +
      '<div class="ring"><span>✋</span></div></div>';
    if (!solo) place.querySelector('.who').textContent = p.side === 'LEFT' ? 'Игрок слева' : 'Игрок справа';
    place.querySelector('.follow').textContent = 'за танцора ' + (p.dancer || '').toLowerCase();
    places.appendChild(place);
    p.placeEl = place;
    if (p.poster) {
      const svg = figureSvg(p.poster.p, p.poster.f, msg.aspectRatio, p.tint || TINTS.solo, 'lobby-dancer-' + p.side);
      place.querySelector('.dancer').appendChild(svg);
    }
  }
  lobbyEl.querySelector('.count').textContent = '';
  lobbyEl.style.display = 'block';
  game.lobbyShownAt = performance.now();
  // Coming in: the hall fades up, the players' cards slide out from the middle to their halves
  replay(lobbyEl, 'enter');
}

function updateLobby(msg) {
  if (!game || !game.lobby) return;
  for (const s of msg.players) {
    const p = player(s.side);
    if (!p || !p.placeEl) continue;
    p.active = s.active;
    const place = p.placeEl;
    place.classList.toggle('ready', s.active);
    place.classList.toggle('here', s.inView);
    const status = s.active ? 'Готов!' : s.inView ? 'Поднимите руку' : 'Встаньте сюда';
    const statusEl = place.querySelector('.status');
    if (statusEl.textContent !== status) statusEl.textContent = status;
    place.style.setProperty('--p', s.active ? 1 : s.progress);
    // The player's own figure, live: rebuilt five times a second at most, and not while the lobby comes in
    const now = performance.now();
    if (now - game.lobbyShownAt < 700 || now - (p.liveAt || 0) < 200) continue;
    p.liveAt = now;
    const live = place.querySelector('.live');
    live.innerHTML = '';
    if (s.pose) live.appendChild(figureSvg(s.pose.p, s.pose.f, msg.aspectRatio, p.tint || TINTS.solo, 'lobby-live-' + p.side));
  }
}

// Each number in its own color, as on the tablet: cyan, lilac, pink
const COUNT_COLORS = { 3: '#00E5FF', 2: '#B388FF', 1: '#FF4081' };

function showCountdown(n) {
  if (!game || !game.lobby) return;
  const count = lobbyEl.querySelector('.count');
  count.textContent = n;
  lobbyEl.style.setProperty('--beat', COUNT_COLORS[n] || '#FFD740');
  replay(count, 'show');
  replay(lobbyEl.querySelector('.ripple'), 'show');
  replay(lobbyEl.querySelector('.flash'), 'show');
}

// The lobby fades away onto the video under a big "Танцуем!"
function openLobby() {
  lobbyEl.querySelector('.count').classList.remove('show');
  const word = document.createElement('div');
  word.className = 'goword';
  word.textContent = 'Танцуем!';
  word.addEventListener('animationend', () => word.remove());
  document.body.appendChild(word);
  replay(lobbyEl, 'leaving');
  setTimeout(() => { lobbyEl.style.display = 'none'; lobbyEl.classList.remove('leaving'); }, 850);
}

function player(side) { return game && game.players.find(p => p.side === side); }

// Stars flying out of a PERFECT
function burst(p, color) {
  const rect = p.popupEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  for (let i = 0; i < SPARKS; i++) {
    const spark = document.createElement('div');
    spark.className = 'spark';
    spark.textContent = i % 3 ? '✦' : '★';
    const angle = (i / SPARKS) * 2 * Math.PI + Math.random() * .3;
    const dist = innerHeight * (.14 + Math.random() * .12);
    spark.style.cssText = `left:${cx}px;top:${cy}px;--c:${color};--dx:${Math.cos(angle) * dist}px;--dy:${Math.sin(angle) * dist}px;` +
      `--r:${Math.round(Math.random() * 360)}deg`;
    spark.addEventListener('animationend', () => spark.remove());
    document.body.appendChild(spark);
  }
}

function showJudgement(msg) {
  const p = player(msg.side);
  if (!p) return;
  const color = COLORS[msg.judgement];
  p.judged[msg.t] = msg.judgement;

  countTo(p.cardEl.querySelector('.points'), msg.points);
  replay(p.cardEl, 'bump');
  const combo = msg.combo || 0;
  const comboEl = p.cardEl.querySelector('.combo');
  comboEl.textContent = 'COMBO ' + combo;
  comboEl.classList.toggle('on', combo >= 3);

  p.popupEl.innerHTML = '<span></span>';
  p.popupEl.firstChild.textContent = LABELS[msg.judgement];
  p.popupEl.style.setProperty('--c', color);
  p.popupEl.classList.toggle('miss', msg.judgement === 'MISS');
  replay(p.popupEl, 'show');

  p.targetEl.style.setProperty('--flash', color);
  replay(p.targetEl, 'flash');

  if (msg.judgement === 'PERFECT') burst(p, color);
  // Two dancing celebrate on their own cards; one alone gets the big flash
  const together = dancing().length > 1;
  if (combo > 0 && combo % COMBO_MILESTONE === 0 && together) {
    p.cardEl.querySelector('.badge').textContent = 'COMBO ' + combo + '!';
    replay(p.cardEl, 'milestone');
  } else if (combo > 0 && combo % COMBO_MILESTONE === 0) {
    comboFlash.innerHTML = '<span></span>';
    comboFlash.firstChild.textContent = 'COMBO ' + combo + '!';
    replay(comboFlash, 'show');
    edge.style.setProperty('--c', p.solo ? '#FFD740' : p.color);
    replay(edge, 'show');
  }
}

function showResults(msg) {
  // The round is over: only the results stay on screen
  game = null;
  // The game's overlays go once the veil covers them
  setTimeout(() => {
    document.querySelectorAll('.popup, .presence, .join, .strip, .spark').forEach(e => e.remove());
    scoresEl.style.display = 'none';
    progressEl.style.display = 'none';
  }, 550);
  lobbyEl.style.display = 'none';
  const solo = msg.players.length === 1;
  const best = Math.max(...msg.players.map(r => r.points));
  const winners = msg.players.filter(r => r.points === best).length;
  resultsEl.innerHTML = '<h2></h2><div class="players"></div>';
  resultsEl.querySelector('h2').textContent = msg.title;
  const row = resultsEl.querySelector('.players');
  for (const r of msg.players) {
    const el = document.createElement('div');
    el.className = 'player';
    const crown = !solo && winners === 1 && r.points === best;
    el.innerHTML = (crown ? '<div class="crown">👑</div>' : '') + (solo ? '' : '<div class="who"></div>') +
      '<div class="stars"></div><div class="points">0</div><div class="max"></div><div class="chips"></div><div class="extra"></div>';
    if (!solo) { el.querySelector('.who').textContent = r.label; el.querySelector('.who').style.color = r.color; }
    const stars = el.querySelector('.stars');
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.className = 'star' + (i < r.stars ? ' on' : '');
      s.textContent = '★';
      s.style.animationDelay = (0.5 + i * 0.25) + 's';
      stars.appendChild(s);
    }
    el.querySelector('.max').textContent = 'из ' + r.maxPoints;
    const chips = el.querySelector('.chips');
    for (const name of Object.keys(LABELS)) {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.style.setProperty('--c', COLORS[name]);
      chip.innerHTML = '<b></b> ';
      chip.firstChild.textContent = (r.counts && r.counts[name]) || 0;
      chip.appendChild(document.createTextNode(LABELS[name].replace('!', '')));
      chips.appendChild(chip);
    }
    el.querySelector('.extra').textContent = 'Лучшее комбо: ' + (r.bestCombo || 0) + (r.hint ? '   ·   ' + r.hint : '');
    row.appendChild(el);
    setTimeout(() => countTo(el.querySelector('.points'), r.points, 1400), 300);
  }
  const buttons = document.createElement('div');
  buttons.className = 'buttons';
  buttons.innerHTML = '<div class="button">Ещё раз</div><div class="button">К списку</div>';
  resultsEl.appendChild(buttons);
  resultsChoice = 0;
  renderResultsChoice();
  // The finale first: a dark veil over the video, "Финиш!", then it fades onto the results
  const veil = document.createElement('div');
  veil.className = 'shut';
  document.body.appendChild(veil);
  const word = document.createElement('div');
  word.className = 'finish';
  word.textContent = 'Финиш!';
  document.body.appendChild(word);
  setTimeout(() => {
    // Results go in under the veil, so their own animations start as it fades
    resultsEl.style.display = 'flex';
    [veil, word].forEach(e => e.classList.add('gone'));
    setTimeout(() => [veil, word].forEach(e => e.remove()), 600);
  }, 1350);
}

let resultsChoice = 0;
function renderResultsChoice() {
  resultsEl.querySelectorAll('.button').forEach((b, i) => b.classList.toggle('selected', i === resultsChoice));
}

function clearGame() {
  game = null;
  resetOverlay();
  caption.style.display = 'none';
  idle.style.display = '';
}

// ---------- Latency calibration: the video is a metronome ----------
function showCaption(text) {
  idle.style.display = 'none';
  caption.textContent = text;
  caption.style.display = 'block';
}

// Gradient tint per player, matching the tablet
const TINTS = { solo: '#ffe9a8', LEFT: '#c8f7ff', RIGHT: '#ffd0e2' };

function buildCues(p, aspect) {
  const strip = document.createElement('div');
  strip.className = 'strip';
  const target = document.createElement('div');
  target.className = 'target';
  strip.appendChild(target);
  // Cards now, figures a few at a time (buildFigures): a whole song's at once froze the TV for a quarter second
  for (const c of p.cues) {
    c.el = document.createElement('div');
    c.el.className = 'cue';
    strip.appendChild(c.el);
  }
  p.aspect = aspect;
  document.body.appendChild(strip);
  p.targetEl = target;
  p.stripEl = strip;
}

function buildFigure(p, c) {
  if (c.built) return;
  c.built = true;
  const key = p.solo ? 'solo' : p.side;
  // Each figure carries its own gradient under its own id: a shared id resolves to the first cue's, and once
  // that cue is hidden (display: none) its gradient stops drawing and every later figure goes dark
  c.el.appendChild(figureSvg(c.p, c.f, p.aspect, TINTS[key], 'skin-' + key + '-' + c.t));
}

// Builds the round's cue figures in song order, a handful per tick, while the players get ready in the lobby
function buildFigures(round) {
  const queue = round.players.flatMap(p => p.cues.map(c => [p, c])).sort((a, b) => a[1].t - b[1].t);
  (function next() {
    if (game !== round) return;
    for (let i = 0; i < 4 && queue.length; i++) { const [p, c] = queue.shift(); buildFigure(p, c); }
    if (queue.length) setTimeout(next, 40);
  })();
}

let reportedDraw = false;
function frame() {
  try { draw(); } catch (e) { report({ type: 'error', where: 'draw', error: String(e && e.stack || e) }); game = null; }
  requestAnimationFrame(frame);
}

// Live match at which a cue starts to glow, and where it's fully lit (about OK and Perfect); as on the tablet
const LIVE_FROM = 0.45, LIVE_FULL = 0.8;

function draw() {
  // In the lobby the video waits at the start: nothing moves yet
  if (!game || game.lobby) return;
  // Only forwards: when the video ends the TV resets its time to zero before the results arrive, which would
  // bring the song's first cue back up the strip
  const now = game.now = Math.max(game.now || -Infinity, video.currentTime * 1000 - game.cueDelayMs);
  const duration = game.durationMs || (video.duration * 1000) || 0;
  if (duration > 0) progressEl.firstChild.style.width = Math.min(100, 100 * now / duration) + '%';
  const cue = innerHeight * 0.17;
  const stripTop = innerHeight * 0.075, stripHeight = innerHeight * 0.85;
  const targetTop = stripTop + cue * 0.25;
  const pxPerMs = (stripTop + stripHeight - targetTop) / LEAD_MS;
  for (const p of game.players) {
    const left = p.solo || p.side === 'LEFT' ? innerWidth * 0.02 : innerWidth * 0.98 - cue;
    const box = `left:${left}px;width:${cue}px;height:${cue}px;border-radius:${cue * 0.12}px;`;
    if (p.targetBox !== box) {
      // Style the target only when the layout changes, so its flash animation isn't reset every frame
      p.targetBox = box;
      p.targetEl.style.cssText = box + `top:${targetTop}px;border-width:${cue * 0.03}px;border-color:${p.color};`;
    }
    for (const c of p.cues) {
      const dt = c.t - now;
      if (dt > LEAD_MS || dt < -LINGER_MS) {
        if (c.shown) { c.el.style.display = 'none'; c.shown = false; }
        continue;
      }
      // Size and place once (and on resize); per frame only transform, opacity and color change
      if (c.box !== box) {
        c.box = box;
        // Dark card glowing in the player's color at the center, as on the tablet
        c.el.style.cssText = box + `top:${targetTop}px;background:radial-gradient(circle at 50% 40%,${rgba(p.color, .35)},rgba(5,4,15,.78) 70%);`;
      }
      if (!reportedDraw) {
        reportedDraw = true;
        report({ type: 'drawn', now: Math.round(now), cueAt: c.t });
      }
      const judged = p.judged[c.t];
      // Cues grow a little as they near the target, as if coming at the player
      const grow = dt > 0 ? 0.85 + 0.15 * (1 - dt / LEAD_MS) : 1;
      const style = c.el.style;
      if (!c.shown) { buildFigure(p, c); style.display = 'block'; c.shown = true; }
      style.transform = `translate3d(0, ${(dt * pxPerMs).toFixed(1)}px, 0) scale(${grow.toFixed(3)})`;
      style.opacity = dt < 0 ? 1 + dt / LINGER_MS : 1;
      // Once judged, the card's ring takes the judgement's color; before that it glows gold as the player's
      // pose gets close to it (live match from the tablet), in a few steps so it isn't repainted every frame
      let ring = judged ? COLORS[judged] : null;
      let shadow = ring ? `inset 0 0 0 .5vh ${ring}, 0 0 2.5vh ${ring}` : '';
      if (!judged && p.live && p.live.t === c.t) {
        const glow = Math.round(4 * Math.min(1, Math.max(0, (p.live.s - LIVE_FROM) / (LIVE_FULL - LIVE_FROM)))) / 4;
        if (glow > 0) shadow = `inset 0 0 0 ${(.2 + .4 * glow).toFixed(2)}vh rgba(255,236,160,${glow}), 0 0 ${(3 * glow).toFixed(2)}vh rgba(255,215,64,${glow})`;
      }
      if (c.ring !== shadow) { style.boxShadow = shadow; c.ring = shadow; }
    }
  }
}
requestAnimationFrame(frame);
