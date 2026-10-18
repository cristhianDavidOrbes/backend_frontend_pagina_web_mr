export type IntroPreference = "once" | "always" | "never";

// Device-local, not user-scoped: signing out or switching accounts must not
// replay the introduction. Do not version the seen key when changing the film.
export const INTRO_PREFERENCE_KEY = "algolab:intro:preference";
export const INTRO_SEEN_KEY = "algolab:intro:seen";
const CHANGE_EVENT = "algolab:intro:change";

export function readIntroState(storage: Pick<Storage, "getItem">) {
  try {
    const saved = storage.getItem(INTRO_PREFERENCE_KEY);
    const preference: IntroPreference = saved === "always" || saved === "never" ? saved : "once";
    return { preference, seen: storage.getItem(INTRO_SEEN_KEY) === "1", available: true };
  } catch {
    // With persistent storage denied, never force a twenty-second intro at
    // every visit. The explicit preview is still available.
    return { preference: "once" as IntroPreference, seen: true, available: false };
  }
}

export function shouldShowIntro({ preference, seen, reducedMotion, saveData = false, preview = false }: {
  preference: IntroPreference;
  seen: boolean;
  reducedMotion: boolean;
  saveData?: boolean;
  preview?: boolean;
}) {
  if (reducedMotion || (saveData && !preview)) return false;
  if (preview) return true;
  return preference === "always" || (preference === "once" && !seen);
}

export function getIntroPreference(): IntroPreference {
  try { return readIntroState(window.localStorage).preference; } catch { return "once"; }
}

export function saveIntroPreference(preference: IntroPreference) {
  try {
    window.localStorage.setItem(INTRO_PREFERENCE_KEY, preference);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch { return false; }
}

export function markIntroSeen() {
  try {
    window.localStorage.setItem(INTRO_SEEN_KEY, "1");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch { /* Optional enhancement; never block access to the landing. */ }
}

export function subscribeIntroPreference(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === INTRO_PREFERENCE_KEY || event.key === null) notify();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, notify);
  };
}
