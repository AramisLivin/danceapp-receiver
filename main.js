// Wires the tablet's messages and the remote's keys to the screens; loaded last, then starts the receiver
context.addCustomMessageListener(NAMESPACE, event => {
  const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
  if (msg.type === 'level') {
    report({ type: 'ack', of: 'level', players: msg.players.length, cues: msg.players.map(p => p.cues.length) });
  }
  switch (msg.type) {
    case 'level': stopPreview(); startLevel(msg); break;
    case 'judgement': showJudgement(msg); break;
    case 'lobby': updateLobby(msg); break;
    case 'countdown': showCountdown(msg.n); break;
    case 'go': go(); break;
    case 'roster': updateRoster(msg); break;
    case 'results': showResults(msg); break;
    case 'clear': clearGame(); resumeMenu(); break;
    case 'calibration': stopPreview(); showCaption(msg.text); break;
    case 'menu': showMenu(msg); break;
  }
});

context.addEventListener(cast.framework.system.EventType.SENDER_CONNECTED, () => {
  report({ type: 'hello', screen: innerWidth + 'x' + innerHeight, dpr: devicePixelRatio, ua: navigator.userAgent });
});
playerManager.addEventListener(cast.framework.events.EventType.ERROR, e => {
  report({ type: 'error', detailedErrorCode: e.detailedErrorCode, error: String(e.error && (e.error.message || e.error)) });
});

// The remote's D-pad and OK arrive as plain key presses (checked on the SHIELD)
document.addEventListener('keydown', e => onKey(e.key));

// Stay up between songs: the tablet decides when the session ends
const options = new cast.framework.CastReceiverOptions();
options.disableIdleTimeout = true;
options.customNamespaces = { [NAMESPACE]: cast.framework.system.MessageType.JSON };
context.start(options);
