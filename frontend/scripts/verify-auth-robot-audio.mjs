import assert from "node:assert/strict";
import test from "node:test";
import { AuthScareAudio, AUTH_SCARE_AUDIO_URL, AUTH_SCARE_GAIN } from "../src/lib/auth-robot-scare-audio.ts";

// No browser, network, wall-clock sleeps, or actual sound. Each case restores
// the browser globals it replaces; node:test also detects unhandled rejections.
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function flush() {
  // Settle fetch -> arrayBuffer -> prepare -> decode -> reveal promise chains.
  for (let index = 0; index < 12; index++) await Promise.resolve();
}

function browser(t, options = {}) {
  const calls = { fetch: [], contexts: [], sources: [], gains: [], decode: [], starts: [] };
  const bytes = new ArrayBuffer(12);
  const buffer = { duration: options.duration ?? 8.174 };
  let milliseconds = 100;
  const document = { hidden: false };
  const originals = new Map();
  function replace(key, value) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }

  class AudioContextMock {
    constructor() {
      if (options.contextError) throw new Error("AudioContext denied");
      this.state = "suspended";
      this.currentTime = 7;
      this.destination = {};
      this.resumes = 0;
      this.closes = 0;
      calls.contexts.push(this);
    }
    resume() {
      this.resumes++;
      if (options.resumeError) return Promise.reject(new Error("resume denied"));
      return Promise.resolve(options.resumeGate?.promise).then(() => {
        if (this.state !== "closed") this.state = "running";
      });
    }
    decodeAudioData(input) {
      calls.decode.push(input);
      if (options.decodeError) return Promise.reject(new Error("invalid audio"));
      if (options.decodeThrows) throw new Error("decoder unavailable");
      return options.decodeGate?.promise ?? Promise.resolve(buffer);
    }
    createBufferSource() {
      if (options.sourceError) throw new Error("source unavailable");
      const source = {
        buffer: null, loop: true, onended: null, connections: [], stops: 0, disconnects: 0,
        connect(target) { this.connections.push(target); },
        disconnect() { this.disconnects++; },
        start(...args) {
          if (options.startError) throw new Error("start denied");
          calls.starts.push({ source: this, args });
        },
        stop() {
          this.stops++;
          if (options.stopError) throw new Error("already ended");
        },
      };
      calls.sources.push(source);
      return source;
    }
    createGain() {
      const gain = {
        connections: [], disconnects: 0,
        gain: {
          events: [],
          setValueAtTime(value, time) { this.events.push(["set", value, time]); },
          linearRampToValueAtTime(value, time) { this.events.push(["ramp", value, time]); },
        },
        connect(target) { this.connections.push(target); },
        disconnect() { this.disconnects++; },
      };
      calls.gains.push(gain);
      return gain;
    }
    close() {
      this.closes++;
      this.state = "closed";
      return options.closeError ? Promise.reject(new Error("close denied")) : Promise.resolve();
    }
  }

  const response = {
    ok: options.httpOk !== false,
    arrayBuffer: () => options.bodyError ? Promise.reject(new Error("body failed")) : Promise.resolve(bytes),
  };
  replace("AudioContext", AudioContextMock);
  replace("document", document);
  replace("performance", { now: () => milliseconds });
  replace("fetch", (url, init) => {
    calls.fetch.push({ url, ...init });
    if (options.fetchError) return Promise.reject(new Error("offline"));
    // A pending request deliberately ignores AbortSignal: guards must also stop
    // already-delivered work or transports that settle after cancellation.
    return options.fetchGate?.promise ?? Promise.resolve(response);
  });
  const audio = new AuthScareAudio();
  t.after(() => {
    try { audio.dispose(); } finally {
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    }
  });
  return { audio, calls, bytes, buffer, response, document, advance: (ms) => { milliseconds += ms; } };
}

test("prepare deduplicates the fetch without creating or playing audio", async (t) => {
  const h = browser(t);
  const first = h.audio.prepare();
  assert.equal(h.audio.prepare(), first);
  assert.equal(await first, h.bytes);
  assert.equal(await h.audio.reveal(), false);
  assert.equal(h.calls.fetch.length, 1);
  assert.equal(h.calls.fetch[0].url, AUTH_SCARE_AUDIO_URL);
  assert.equal(h.calls.fetch[0].signal.aborted, false);
  assert.equal(h.calls.contexts.length, 0);
  assert.equal(h.calls.starts.length, 0);
});

test("arm unlocks synchronously but only reveal starts a single non-looping source", async (t) => {
  const h = browser(t);
  h.audio.arm();
  assert.equal(h.calls.contexts.length, 1);
  assert.equal(h.calls.contexts[0].resumes, 1);
  await flush();
  assert.equal(h.calls.starts.length, 0);
  assert.notEqual(h.calls.decode[0], h.bytes, "decode receives an owned copy");
  assert.equal(h.calls.decode[0].byteLength, h.bytes.byteLength);
  assert.deepEqual(await Promise.all([h.audio.reveal(), h.audio.reveal(), h.audio.reveal()]), [true, false, false]);
  assert.equal(await h.audio.reveal(), false);
  assert.equal(h.calls.starts.length, 1);
  const source = h.calls.sources[0];
  const gain = h.calls.gains[0];
  assert.equal(source.buffer, h.buffer);
  assert.equal(source.loop, false);
  assert.deepEqual(source.connections, [gain]);
  assert.deepEqual(gain.connections, [h.calls.contexts[0].destination]);
  assert.equal(AUTH_SCARE_GAIN, 0.45);
  assert.deepEqual(gain.gain.events, [["set", 0, 7], ["ramp", 0.45, 7.008], ["set", 0.45, 7 + (h.buffer.duration - 0.025)], ["ramp", 0, 7 + h.buffer.duration]]);
  assert.deepEqual(h.calls.starts[0].args, [7, 0, 8.174], "the selected female scream plays to its natural end, without the old two-second cap");
});

test("short clips keep their own duration and fade at the end", async (t) => {
  const h = browser(t, { duration: 0.6 });
  h.audio.arm();
  assert.equal(await h.audio.reveal(), true);
  assert.deepEqual(h.calls.starts[0].args, [7, 0, 0.6]);
  assert.deepEqual(h.calls.gains[0].gain.events.at(-1), ["ramp", 0, 7.6]);
});

test("reveal without arm cannot fetch, create a context, or play", async (t) => {
  const h = browser(t);
  assert.equal(await h.audio.reveal(), false);
  assert.equal(h.calls.fetch.length, 0);
  assert.equal(h.calls.contexts.length, 0);
  assert.equal(h.calls.starts.length, 0);
});

for (const phase of ["fetch", "decode", "resume"]) {
  for (const operation of ["stop", "dispose"]) {
    test(`${operation} cancels a reveal pending ${phase}, even if it resolves later`, async (t) => {
      const gate = deferred();
      const h = browser(t, { [`${phase}Gate`]: gate });
      let ended = 0;
      h.audio.arm();
      const reveal = h.audio.reveal(() => ended++);
      await flush();
      assert.equal(h.calls.starts.length, 0);
      if (phase === "decode") assert.equal(h.calls.decode.length, 1);
      h.audio[operation]();
      gate.resolve(phase === "fetch" ? h.response : phase === "decode" ? h.buffer : undefined);
      assert.equal(await reveal, false);
      assert.equal(await h.audio.reveal(() => ended++), false);
      assert.equal(h.calls.starts.length, 0);
      assert.equal(ended, 0, "cancellation is not natural completion");
      if (operation === "dispose") {
        assert.equal(h.calls.fetch[0].signal.aborted, true);
        assert.equal(h.calls.contexts[0].closes, 1);
        h.audio.arm();
        assert.equal(await h.audio.prepare(), null);
        await h.audio.reveal();
        assert.equal(h.calls.contexts.length, 1, "disposed instances cannot re-arm");
      }
    });
  }
}

for (const phase of ["fetch", "decode", "resume"]) {
  test(`new arm cancels the previous generation pending ${phase}`, async (t) => {
    const gate = deferred();
    const h = browser(t, { [`${phase}Gate`]: gate });
    let previousEnded = 0;
    let currentEnded = 0;
    h.audio.arm();
    const previous = h.audio.reveal(() => previousEnded++);
    await flush();
    h.audio.arm();
    const current = h.audio.reveal(() => currentEnded++);
    gate.resolve(phase === "fetch" ? h.response : phase === "decode" ? h.buffer : undefined);
    assert.deepEqual(await Promise.all([previous, current]), [false, true]);
    assert.equal(h.calls.starts.length, 1, "only the newly armed generation may play");
    assert.equal(h.calls.contexts.length, 1);
    assert.equal(h.calls.fetch.length, 1);
    assert.equal(previousEnded, 0);
    assert.equal(currentEnded, 0, "starting does not announce completion");
    h.calls.sources[0].onended();
    assert.equal(previousEnded, 0);
    assert.equal(currentEnded, 1);
  });
}

test("stop disconnects playing audio, is idempotent, and allows a fresh arm", async (t) => {
  const h = browser(t);
  h.audio.arm();
  await h.audio.reveal();
  const source = h.calls.sources[0];
  const gain = h.calls.gains[0];
  h.audio.stop();
  h.audio.stop();
  assert.equal(source.stops, 1);
  assert.equal(source.disconnects, 1);
  assert.equal(source.onended, null);
  assert.equal(gain.disconnects, 1);
  await h.audio.reveal();
  assert.equal(h.calls.starts.length, 1);
  h.audio.arm();
  await h.audio.reveal();
  assert.equal(h.calls.starts.length, 2);
});

test("re-arming playing audio stops its source before the next reveal", async (t) => {
  const h = browser(t);
  h.audio.arm();
  await h.audio.reveal();
  const first = h.calls.sources[0];
  h.audio.arm();
  assert.equal(first.stops, 1);
  assert.equal(first.disconnects, 1);
  assert.equal(h.calls.starts.length, 1);
  await h.audio.reveal();
  assert.equal(h.calls.starts.length, 2);
});

test("natural completion releases nodes and reports completion exactly once", async (t) => {
  const h = browser(t);
  let ended = 0;
  h.audio.arm();
  assert.equal(await h.audio.reveal(() => ended++), true);
  const source = h.calls.sources[0];
  const onended = source.onended;
  assert.equal(ended, 0, "the three-second silence must wait for natural completion");
  onended();
  onended();
  assert.equal(ended, 1, "a queued duplicate event must not restart the silence timer");
  assert.equal(source.disconnects, 1);
  assert.equal(h.calls.gains[0].disconnects, 1);
  h.audio.stop();
  assert.equal(source.stops, 0);
  assert.equal(ended, 1);
});

for (const operation of ["stop", "dispose", "arm"]) {
  test(`${operation} silences playback without invoking a stale natural-end callback`, async (t) => {
    const h = browser(t);
    let firstEnded = 0;
    let secondEnded = 0;
    h.audio.arm();
    assert.equal(await h.audio.reveal(() => firstEnded++), true);
    const first = h.calls.sources[0];
    const staleEnd = first.onended;
    h.audio[operation]();
    assert.equal(first.onended, null);
    assert.equal(first.stops, 1);
    staleEnd();
    assert.equal(firstEnded, 0, "an interrupted scream must not complete the rare scene");
    if (operation === "arm") {
      assert.equal(await h.audio.reveal(() => secondEnded++), true);
      const current = h.calls.sources[1];
      staleEnd();
      assert.equal(current.stops, 0, "the obsolete event cannot stop the new playback");
      assert.equal(current.disconnects, 0);
      current.onended();
      assert.equal(firstEnded, 0);
      assert.equal(secondEnded, 1);
    }
  });
}

test("dispose stops playback, aborts requests, closes once, and stays inert", async (t) => {
  const h = browser(t);
  h.audio.arm();
  await h.audio.reveal();
  h.audio.dispose();
  h.audio.dispose();
  assert.equal(h.calls.sources[0].stops, 1);
  assert.equal(h.calls.gains[0].disconnects, 1);
  assert.equal(h.calls.fetch[0].signal.aborted, true);
  assert.equal(h.calls.contexts[0].closes, 1);
  h.audio.arm();
  await h.audio.reveal();
  assert.equal(await h.audio.prepare(), null);
  assert.equal(h.calls.starts.length, 1);
});

test("a hidden document never starts a pending reveal", async (t) => {
  const gate = deferred();
  const h = browser(t, { decodeGate: gate });
  h.audio.arm();
  const reveal = h.audio.reveal();
  await flush();
  h.document.hidden = true;
  gate.resolve(h.buffer);
  await reveal;
  h.document.hidden = false;
  await h.audio.reveal();
  assert.equal(h.calls.starts.length, 0, "returning to the tab cannot resurrect the reveal");
});

for (const phase of ["fetch", "decode", "resume"]) {
  test(`a ${phase} result beyond the reveal deadline is silently discarded`, async (t) => {
    const gate = deferred();
    const h = browser(t, { [`${phase}Gate`]: gate });
    h.audio.arm();
    const reveal = h.audio.reveal();
    await flush();
    h.advance(251);
    gate.resolve(phase === "fetch" ? h.response : phase === "decode" ? h.buffer : undefined);
    await reveal;
    assert.equal(h.calls.starts.length, 0);
    await h.audio.reveal();
    assert.equal(h.calls.starts.length, 0);
  });
}

for (const [name, options] of [
  ["fetch rejection", { fetchError: true }],
  ["HTTP failure", { httpOk: false }],
  ["response body rejection", { bodyError: true }],
  ["decoder rejection", { decodeError: true }],
  ["decoder synchronous failure", { decodeThrows: true }],
  ["AudioContext constructor failure", { contextError: true }],
  ["resume rejection", { resumeError: true }],
  ["source creation failure", { sourceError: true }],
  ["source start failure", { startError: true }],
]) {
  test(`${name} cannot reject reveal or start sound`, async (t) => {
    const h = browser(t, options);
    assert.doesNotThrow(() => h.audio.arm());
    let ended = 0;
    assert.equal(await h.audio.reveal(() => ended++), false);
    assert.equal(h.calls.starts.length, 0);
    assert.equal(ended, 0);
    assert.doesNotThrow(() => h.audio.dispose());
    await flush();
  });
}

test("unsupported AudioContext remains silent without rejecting", async (t) => {
  const h = browser(t);
  delete globalThis.AudioContext;
  assert.doesNotThrow(() => h.audio.arm());
  await assert.doesNotReject(h.audio.reveal());
  assert.equal(h.calls.contexts.length, 0);
  assert.equal(h.calls.starts.length, 0);
});

for (const failure of ["fetchError", "decodeError"]) {
  test(`a transient ${failure} retries on the next explicit gesture`, async (t) => {
    const options = { [failure]: true };
    const h = browser(t, options);
    await h.audio.prepare();
    h.audio.arm();
    await h.audio.reveal();
    assert.equal(h.calls.starts.length, 0);
    options[failure] = false;
    h.audio.arm();
    await h.audio.reveal();
    assert.equal(h.calls.starts.length, 1);
    assert.ok(h.calls.fetch.length >= 2);
  });
}

test("close rejection and an already-ended stop do not escape cleanup", async (t) => {
  const h = browser(t, { closeError: true, stopError: true });
  h.audio.arm();
  await h.audio.reveal();
  assert.doesNotThrow(() => h.audio.dispose());
  await flush();
  assert.equal(h.calls.sources[0].stops, 1);
  assert.equal(h.calls.sources[0].disconnects, 1);
  assert.equal(h.calls.contexts[0].closes, 1);
});

for (const phase of ["fetch", "decode", "resume"]) {
  test(`a rejected ${phase} after disposal is absorbed without late sound`, async (t) => {
    const gate = deferred();
    const h = browser(t, { [`${phase}Gate`]: gate });
    h.audio.arm();
    const reveal = h.audio.reveal();
    await flush();
    h.audio.dispose();
    gate.reject(new Error("settled after close"));
    await assert.doesNotReject(reveal);
    assert.equal(h.calls.starts.length, 0);
  });
}
