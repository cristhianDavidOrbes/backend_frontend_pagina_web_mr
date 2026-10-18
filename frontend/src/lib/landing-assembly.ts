export type LandingAnchors = Record<string, [number, number]>;

type Piece = {
  element: HTMLDivElement; target: DOMRect; key: string; start: number; end: number;
  scale: number; angle: number; arc: number;
  settled: boolean;
};
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const p = clamp(value); return p * p * (3 - 2 * p); };

/** Replays the approved film's assembly, using the live page's actual layout. */
export function createLandingAssembly(content: HTMLElement, layer: HTMLElement) {
  const pieces: Piece[] = [];
  const fragment = document.createDocumentFragment();
  const measurements = new Map<HTMLElement, { box: DOMRect; typography: CSSStyleDeclaration }>();
  function measure(original: HTMLElement) {
    let result = measurements.get(original);
    if (!result) { result = { box: original.getBoundingClientRect(), typography: getComputedStyle(original) }; measurements.set(original, result); }
    return result;
  }
  function add(original: HTMLElement, key: string, start: number, end: number, scale: number, angle: number, arc: number, slice?: [number, number]) {
    const { box, typography } = measure(original);
    const target = new DOMRect(box.x, box.y + (slice?.[0] ?? 0), box.width, slice ? slice[1] - slice[0] : box.height);
    const element = document.createElement("div");
    Object.assign(element.style, { position: "absolute", left: "0", top: "0", width: `${target.width}px`, height: `${target.height}px`, transformOrigin: "center", opacity: "0", overflow: slice ? "hidden" : "visible", pointerEvents: "none", willChange: "transform, opacity" });
    if (key === "brand") { element.classList.add("landing-nav"); element.style.padding = "0"; }
    const clone = original.cloneNode(true) as HTMLElement;
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
    Object.assign(clone.style, { position: "relative", inset: "auto", left: "0", top: "0", translate: "none", margin: "0", width: `${box.width}px`, height: `${box.height}px`, maxWidth: "none", minHeight: "0", transform: slice ? `translateY(-${slice[0]}px)` : "none", opacity: "1" });
    Object.assign(clone.style, { fontFamily: typography.fontFamily, fontSize: typography.fontSize, fontWeight: typography.fontWeight, lineHeight: typography.lineHeight, letterSpacing: typography.letterSpacing, textAlign: typography.textAlign, display: typography.display, boxSizing: typography.boxSizing, padding: typography.padding, whiteSpace: typography.whiteSpace, transition: "none", animation: "none" });
    element.appendChild(clone); fragment.appendChild(element);
    pieces.push({ element, target, key, start, end, scale, angle, arc, settled: false });
  }
  const find = (selector: string) => content.querySelector<HTMLElement>(selector);
  const nav = find(".landing-nav-pill"), speech = find(".hero-speech"), badge = find(".hero-copy .badge"), title = find(".hero-copy h1"), description = find(".hero-copy .lead");
  if (nav) add(nav, "brand", 18.05, 19.30, .16, -.12, -160);
  if (speech) add(speech, "robot", 18.35, 19.40, .62, -.06, -50);
  if (badge) add(badge, "door", 18.36, 19.36, .48, -.13, -95);
  if (title) {
    // Measure real text lines, rather than hard-coding desktop line breaks.
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    const rows: number[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width && !rows.some(y => Math.abs(y - rect.y) < 3)) rows.push(rect.y);
      }
    }
    rows.sort((a, b) => a - b);
    const { box } = measure(title);
    const count = Math.max(1, rows.length);
    const boundaries = Array.from({ length: count + 1 }, (_, index) => box.height * index / count);
    for (let i = 0; i < boundaries.length - 1; i++) {
      if (boundaries[i + 1] - boundaries[i] < 2) continue;
      add(title, "code", 17.64 + i * .12, 19.12 + i * .12, .32, .10 - i * .02, -115 + i * 25, [boundaries[i], boundaries[i + 1]]);
    }
  }
  if (description) add(description, "code", 18.13, 19.45, .45, .04, -40);
  content.querySelectorAll<HTMLElement>(".hero-ctas > a").forEach((button, i) => add(button, "book", 18.30 + i * .14, 19.55 + i * .13, .38, i ? .14 : -.14, 75 + i * 35));
  layer.appendChild(fragment);
  return {
    update(time: number, anchors: LandingAnchors) {
      for (const piece of pieces) {
        if (piece.settled && time >= piece.end) continue;
        piece.settled = false;
        if (time < piece.start) { piece.element.style.opacity = "0"; continue; }
        const raw = clamp((time - piece.start) / (piece.end - piece.start)), p = smooth(raw);
        const origin = anchors[piece.key] ?? [.5, .5];
        const sx = origin[0] * innerWidth, sy = origin[1] * innerHeight;
        const x = sx + (piece.target.x + piece.target.width / 2 - sx) * p;
        const y = sy + (piece.target.y + piece.target.height / 2 - sy) * p + Math.sin(Math.PI * p) * piece.arc * Math.min(1, innerWidth / 1200);
        const scale = piece.scale + (1 - piece.scale) * p;
        piece.element.style.opacity = String(smooth(raw / .24));
        piece.element.style.transform = `translate3d(${x - piece.target.width / 2}px, ${y - piece.target.height / 2}px, 0) rotate(${piece.angle * (1 - p)}rad) scale(${scale * (.82 + .18 * p)}, ${scale})`;
        piece.settled = raw === 1;
      }
    },
    dispose() { pieces.forEach(piece => piece.element.remove()); },
  };
}
