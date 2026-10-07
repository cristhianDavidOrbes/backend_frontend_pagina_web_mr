/** Refresh data, not the page: no animations, layout or scroll are reset. */
export function startVisibleRefresh(refresh: () => Promise<unknown>, interval = 15_000): () => void {
  let stopped = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastStarted = 0;
  async function run() {
    if (stopped || running || document.visibilityState === "hidden") return;
    if (Date.now() - lastStarted < 3_000) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, 3_000 - (Date.now() - lastStarted));
      return;
    }
    running = true;
    lastStarted = Date.now();
    if (timer) clearTimeout(timer);
    try { await refresh(); }
    catch { /* The caller renders the error; keep the next retry scheduled. */ }
    finally {
      running = false;
      if (!stopped) timer = setTimeout(run, interval);
    }
  }
  const resume = () => { void run(); };
  window.addEventListener("focus", resume);
  window.addEventListener("online", resume);
  document.addEventListener("visibilitychange", resume);
  void run();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    window.removeEventListener("focus", resume);
    window.removeEventListener("online", resume);
    document.removeEventListener("visibilitychange", resume);
  };
}
