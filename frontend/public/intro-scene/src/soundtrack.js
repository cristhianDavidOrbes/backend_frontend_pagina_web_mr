export function createSoundtrack(button, duration, readState) {
  const url = new URL('../assets/audio/algolab-soundtrack-objects-20s.mp3', import.meta.url).href;
  let enabled = true;
  let failed = false;
  let encodedReady = false;
  let context;
  let buffer;
  let decoding;
  let source;
  let request = 0;
  let offset = 0;
  let startedAt = 0;
  let ended = false;

  function updateButton() {
    button.textContent = failed ? 'Audio no disponible' : enabled ? 'Sonido: sí' : 'Sonido: no';
    button.setAttribute('aria-pressed', String(enabled && !failed));
    button.disabled = failed;
    button.title = 'Música y efectos de ElevenLabs sincronizados con la animación';
  }

  function fail() {
    failed = true;
    stop();
    updateButton();
  }

  // Decode the full short track: local servers need not support byte-range seeking.
  const encoded = fetch(url).then(response => {
    if (!response.ok) throw new Error(`Soundtrack: HTTP ${response.status}`);
    return response.arrayBuffer();
  }).then(bytes => {
    encodedReady = true;
    return bytes;
  }).catch(() => { fail(); return null; });

  function stop() {
    request++;
    ended = false;
    if (source) {
      const previous = source;
      source = undefined;
      previous.stop();
      previous.disconnect();
    }
  }

  function sync(forceSeek = false) {
    const state = readState();
    const shouldPlay = enabled && !failed && state.playing && state.time < duration;
    if (!shouldPlay || forceSeek) stop();
    if (!shouldPlay || source) return;
    const token = ++request;
    // Start context creation/resume inside the user's gesture, before awaiting data.
    context ??= new AudioContext();
    const resumed = context.resume();
    decoding ??= encoded.then(bytes => bytes ? context.decodeAudioData(bytes) : null).then(decoded => {
      buffer = decoded;
      return decoded;
    });
    Promise.all([resumed, decoding]).then(([, decoded]) => {
      const current = readState();
      if (!decoded || token !== request || !enabled || !current.playing || current.time >= duration) return;
      offset = Math.max(0, Math.min(current.time, decoded.duration));
      startedAt = context.currentTime;
      const track = context.createBufferSource();
      const gain = context.createGain();
      gain.gain.value = .85;
      track.buffer = decoded;
      track.connect(gain).connect(context.destination);
      track.onended = () => {
        gain.disconnect();
        if (source !== track) return;
        source = undefined;
        ended = true;
      };
      source = track;
      ended = false;
      track.start(0, offset);
    }).catch(error => {
      if (token !== request) return;
      if (error.name === 'NotAllowedError') {
        enabled = false;
        updateButton();
        button.textContent = 'Activar sonido';
      } else fail();
    });
  }

  function clock() {
    return Math.min(duration, offset + Math.max(0, context.currentTime - startedAt));
  }

  button.addEventListener('click', () => {
    enabled = !enabled;
    updateButton();
    sync(true);
  });
  updateButton();

  return {
    sync,
    time(fallback) {
      if (enabled && !failed && source && context.state === 'running') return clock();
      if (enabled && ended) return duration;
      return fallback;
    },
    diagnostics: () => ({
      enabled, failed, clockReady: !!source && context?.state === 'running', seeking: false,
      paused: !source, currentTime: source ? clock() : readState().time,
      duration: buffer?.duration ?? duration, source: url, readyState: buffer ? 4 : encodedReady ? 2 : 0,
    }),
  };
}
