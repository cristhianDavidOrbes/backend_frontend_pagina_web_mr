/** A winning scene stays latched until authentication or its full scare sequence. */
const SESSION_KEY = "algolab.auth-robot.easter-egg.session.v1";
const ACTIVE_KEY = "algolab.auth-robot.easter-egg.active.v1";
const DRAWN = "drawn";
const COMPLETED = "completed";
const ACTIVE = "active";
const TICKETS = 100_000;
const WINNING_TICKETS = 333;
const RANDOM_RANGE = 0x1_0000_0000;
const ACCEPT_BELOW = Math.floor(RANDOM_RANGE / TICKETS) * TICKETS;

type RandomSource = Pick<Crypto, "getRandomValues">;
let initialized = false;
let active = false;
const listeners = new Set<() => void>();

/** Exactly 333 of 100000 equiprobable tickets win, without modulo bias. */
export function drawAuthEasterEgg(random: RandomSource): boolean {
  const sample = new Uint32Array(1);
  // The bound only matters for a broken source; each real draw rejects <0.002%.
  for (let attempt = 0; attempt < 32; attempt++) {
    random.getRandomValues(sample);
    if (sample[0] < ACCEPT_BELOW) return sample[0] % TICKETS < WINNING_TICKETS;
  }
  return false;
}

function read(storage: "sessionStorage" | "localStorage", key: string): string | null {
  try { return window[storage].getItem(key); } catch { return null; }
}

function write(storage: "sessionStorage" | "localStorage", key: string, value: string) {
  try { window[storage].setItem(key, value); } catch { /* Private browsing may deny storage. Keep the in-memory state. */ }
}

function removeActiveLatch() {
  try { window.localStorage.removeItem(ACTIVE_KEY); } catch { /* Never let cosmetic state interrupt a successful login. */ }
}

function publish(next: boolean) {
  if (active === next) return;
  active = next;
  for (const listener of listeners) listener();
}

export function initializeAuthEasterEgg(): void {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;
  const session = read("sessionStorage", SESSION_KEY);
  if (session === COMPLETED) {
    removeActiveLatch();
    publish(false);
    return;
  }
  if (read("localStorage", ACTIVE_KEY) === ACTIVE) {
    write("sessionStorage", SESSION_KEY, DRAWN);
    publish(true);
    return;
  }
  if (session === DRAWN) return;
  // Mark first so route changes, remounts and refreshes cannot redraw this session.
  write("sessionStorage", SESSION_KEY, DRAWN);
  let won = false;
  try { won = drawAuthEasterEgg(window.crypto); } catch { /* A missing secure source means no event, never an auth failure. */ }
  if (won) write("localStorage", ACTIVE_KEY, ACTIVE);
  publish(won);
}

/** Complete after the full audio + silence sequence, never on early dismissal. */
export function finishAuthEasterEgg(): void {
  if (typeof window === "undefined") return;
  initialized = true;
  write("sessionStorage", SESSION_KEY, COMPLETED);
  removeActiveLatch();
  publish(false);
}

/** A validated login, including registration autologin, also ends the scene. */
export function completeAuthEasterEgg(): void { finishAuthEasterEgg(); }

function onStorage(event: StorageEvent) {
  if (event.key !== ACTIVE_KEY && event.key !== null) return;
  // Completion in another tab clears the visual here as well. No re-draw follows.
  if (event.newValue === null) {
    write("sessionStorage", SESSION_KEY, COMPLETED);
    publish(false);
  } else if (event.newValue === ACTIVE) {
    initialized = true;
    write("sessionStorage", SESSION_KEY, DRAWN);
    publish(true);
  }
}

export function subscribeAuthEasterEgg(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined" && listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined" && listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function getAuthEasterEggSnapshot(): boolean { return active; }
export function getServerAuthEasterEggSnapshot(): false { return false; }
