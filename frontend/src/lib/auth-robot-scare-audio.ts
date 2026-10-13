export const AUTH_SCARE_AUDIO_URL = "/algolab/auth-rare-female-scream.mp3";
export const AUTH_SCARE_GAIN = 0.45;

/** Cosmetic, gesture-unlocked audio. Never lets a late request surprise a user. */
export class AuthScareAudio {
  private context: AudioContext | null = null;
  private request = new AbortController();
  private bytes: Promise<ArrayBuffer | null> | null = null;
  private buffer: Promise<AudioBuffer | null> | null = null;
  private resumed: Promise<void> | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private generation = 0;
  private armed = false;
  private revealed = false;
  private disposed = false;

  prepare() {
    if (this.disposed) return Promise.resolve(null);
    this.bytes ??= fetch(AUTH_SCARE_AUDIO_URL, { signal: this.request.signal })
      .then((response) => response.ok ? response.arrayBuffer() : null)
      .catch(() => null)
      .then((bytes) => { if (!bytes) this.bytes = null; return bytes; });
    return this.bytes;
  }

  /** Must be called synchronously inside the robot's explicit click handler. */
  arm() {
    if (this.disposed) return;
    this.stop();
    try {
      this.context ??= new AudioContext();
      const context = this.context;
      this.resumed = context.resume().catch(() => undefined);
      this.buffer ??= this.prepare()
        .then((bytes) => bytes && !this.disposed ? context.decodeAudioData(bytes.slice(0)) : null)
        .catch(() => null)
        .then((buffer) => {
          // A transient preload/decode failure can recover on the next gesture.
          if (!buffer) { this.buffer = null; this.bytes = null; }
          return buffer;
        });
      this.armed = true;
    } catch {
      // Unsupported/blocked audio must not affect the image or authentication.
    }
  }

  /** Called when the image is visible, never on hover, focus, or page load. */
  async reveal(onEnded?: () => void): Promise<boolean> {
    if (!this.armed || this.revealed || this.disposed) return false;
    this.revealed = true;
    const generation = this.generation;
    const deadline = performance.now() + 250;
    const [buffer] = await Promise.all([this.buffer, this.resumed]);
    const context = this.context;
    if (!buffer || !context || context.state !== "running" || !this.armed ||
      this.disposed || generation !== this.generation || document.hidden || performance.now() > deadline) return false;
    try {
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.loop = false;
      // Play the selected recording in full, with moderate gain and edge fades.
      const duration = buffer.duration;
      const now = context.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(AUTH_SCARE_GAIN, now + 0.008);
      gain.gain.setValueAtTime(AUTH_SCARE_GAIN, now + Math.max(0.008, duration - 0.025));
      gain.gain.linearRampToValueAtTime(0, now + duration);
      source.connect(gain);
      gain.connect(context.destination);
      this.source = source;
      this.gain = gain;
      source.onended = () => {
        if (this.source !== source) return;
        source.onended = null;
        source.disconnect();
        gain.disconnect();
        this.source = null;
        this.gain = null;
        if (this.armed && !this.disposed && generation === this.generation) {
          this.armed = false;
          onEnded?.();
        }
      };
      source.start(now, 0, duration);
      return true;
    } catch {
      this.stop();
      return false;
    }
  }

  stop() {
    this.generation++;
    this.armed = false;
    this.revealed = false;
    const source = this.source;
    this.source = null;
    if (source) {
      source.onended = null;
      try { source.stop(); } catch { /* Already ended. */ }
      source.disconnect();
    }
    this.gain?.disconnect();
    this.gain = null;
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.request.abort();
    if (this.context && this.context.state !== "closed") void this.context.close().catch(() => undefined);
    this.context = null;
    this.bytes = null;
    this.buffer = null;
  }
}
