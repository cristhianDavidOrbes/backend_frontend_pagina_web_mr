/** Browser-independent choreography. Positions are viewport pixels at the feet. */
export type CompanionPose = "sit" | "held" | "fall" | "walk" | "jump" | "climb" | "pull" | "dance" | "look" | "stretch"
  | "tumble" | "bonk" | "dizzy" | "getup" | "tiptoe" | "run" | "drive" | "carry" | "push" | "peek" | "bow" | "wave" | "juggle" | "sleep";
export type Point = { x: number; y: number };
export type ExitEdge = "left" | "right" | "top" | "bottom";
export type RobotGeometry = { home: Point; left: number; right: number; top: number; bottom: number; width: number; height: number };
export type SceneryKind = "book" | "books" | "plant" | "crate" | "gear" | "code" | "car" | "lamp" | "ball" | "trophy" | "rocket" | "picture";
export type PlacedScenery = { id: number; kind: SceneryKind; x: number; y: number; size: number; rotation: number };
export type CompanionFrame = Point & {
  pose: CompanionPose; facing: -1 | 1; picture: number; layer: "front" | "behind";
  vehicle: "car" | null; rotation: number; effect: "impact" | "stars" | "dust" | "sparkles" | null;
  carried: SceneryKind | null; scene: string;
};
type Step = {
  to: Point; duration: number; pose: CompanionPose; arc?: number; picture?: number;
  layer?: CompanionFrame["layer"]; vehicle?: CompanionFrame["vehicle"]; rotation?: number;
  effect?: CompanionFrame["effect"]; carried?: SceneryKind; place?: PlacedScenery;
};

/** Twelve trips through four destination zones, followed by six character moments. */
export const AUTH_ROBOT_SCENES = [
  "bibliotecario", "jardinero", "mudanza", "mecanico", "programador", "piloto",
  "iluminador", "futbolista", "campeon", "astronauta", "galerista", "coleccionista",
  "saludo", "baile", "estiramiento", "curioso", "siesta", "reverencia",
] as const;
const DELIVERY_KINDS: SceneryKind[] = ["book", "plant", "crate", "gear", "code", "car", "lamp", "ball", "trophy", "rocket", "picture", "books"];
const DELIVERY_POSES: CompanionPose[] = ["carry", "tiptoe", "push", "pull", "carry", "drive", "carry", "juggle", "carry", "run", "pull", "push"];
const DELIVERY_FINALES: CompanionPose[] = ["bow", "look", "stretch", "dance", "wave", "bow", "peek", "juggle", "dance", "wave", "look", "stretch"];
const REST_POSES: CompanionPose[] = ["wave", "dance", "stretch", "peek", "sleep", "bow"];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const frameDefaults = { facing: 1 as const, picture: -1, layer: "front" as const, vehicle: null, rotation: 0, effect: null, carried: null };

export class AuthRobotMotion {
  frame: CompanionFrame = { x: 0, y: 0, pose: "sit", scene: "reposo", ...frameDefaults };
  geometry: RobotGeometry | null = null;
  scenery: readonly PlacedScenery[] = [];
  reducedMotion = false;
  private steps: Step[] = [];
  private origin: Point = { x: 0, y: 0 };
  private originRotation = 0;
  private elapsed = 0;
  private idle = 0;
  private activity = 0;
  private sceneryId = 0;
  private deposited: readonly PlacedScenery[] = [];
  private recovery = 0;

  setGeometry(next: RobotGeometry) {
    if (![next.home.x, next.home.y, next.left, next.right, next.top, next.bottom, next.width, next.height].every(Number.isFinite)
      || next.width <= 0 || next.height <= 0) return;
    const previous = this.geometry;
    this.geometry = { ...next, home: { ...next.home } };
    if (previous && this.deposited.length) this.reflowScenery();
    if (!previous || this.frame.pose === "sit") this.home();
    else if (this.frame.pose !== "held") this.returnHome();
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
    if (value && this.frame.pose !== "held") this.home();
  }

  home() {
    if (!this.geometry) return;
    Object.assign(this.frame, this.geometry.home, frameDefaults, { pose: "sit", scene: "reposo" });
    this.steps = [];
    this.elapsed = this.idle = 0;
  }

  grab() {
    if (!this.geometry) return;
    this.steps = [];
    Object.assign(this.frame, frameDefaults, { pose: "held", scene: "arrastrando" });
    this.idle = 0;
  }

  drag(point: Point) {
    if (this.frame.pose !== "held" || !Number.isFinite(point.x + point.y)) return;
    const g = this.geometry!;
    this.frame.x = clamp(point.x, -220, g.width + 220);
    this.frame.y = clamp(point.y, -220, g.height + 220);
  }

  drop(edge?: ExitEdge) {
    if (this.frame.pose !== "held") return;
    const g = this.geometry!;
    if (this.reducedMotion || (!edge && distance(this.frame, g.home) < 18)) return this.home();
    const exit = edge ?? this.exitedEdge();
    if (exit) return this.driveBack(exit);
    const floor = this.floor();
    const landing = { x: clamp(this.frame.x, 38, g.width - 38), y: floor };
    const roll = { x: clamp(landing.x + (landing.x < g.home.x ? 26 : -26), 38, g.width - 38), y: floor };
    this.frame.scene = "caida-comica";
    this.play([
      { to: landing, duration: clamp(Math.abs(floor - this.frame.y) / 700, 0.2, 0.75), pose: "fall", layer: "behind" },
      { to: landing, duration: 0.55, pose: "bonk", effect: "impact", layer: "behind" },
      { to: roll, duration: 0.65, pose: "tumble", rotation: landing.x < g.home.x ? 360 : -360, layer: "behind" },
      { to: roll, duration: 0.75, pose: "dizzy", effect: "stars", layer: "behind" },
      { to: roll, duration: 1.1, pose: "getup", layer: "behind" },
      ...this.recoveryDetour(roll),
      ...this.arriveSteps(roll),
    ]);
  }

  /** Focus loss/cancellation also recovers to the same central entrance. */
  returnHome() {
    const g = this.geometry;
    if (!g) return;
    if (this.reducedMotion || distance(this.frame, g.home) < 18) return this.home();
    const edge = this.exitedEdge();
    if (edge) return this.driveBack(edge);
    this.frame.scene = "regreso-central";
    this.play(this.arriveSteps(this.frame));
  }

  startActivity() {
    const g = this.geometry;
    if (!g || this.reducedMotion || this.frame.pose !== "sit") return;
    const turn = this.activity++ % AUTH_ROBOT_SCENES.length;
    this.frame.scene = AUTH_ROBOT_SCENES[turn];
    if (turn >= DELIVERY_KINDS.length) {
      this.play([{ to: g.home, duration: turn === 16 ? 3.2 : 2.3, pose: REST_POSES[turn - DELIVERY_KINDS.length] }]);
      return;
    }
    const kind = DELIVERY_KINDS[turn];
    const decoration = this.placement(kind, this.sceneryId);
    const direction = turn % 2 === 0 ? -1 : 1;
    const lane = decoration?.y ?? this.floor();
    const destination = decoration ? { x: decoration.x, y: lane } : { x: direction < 0 ? 48 : g.width - 48, y: lane };
    const offscreen = { x: direction < 0 ? -150 : g.width + 150, y: lane };
    const bottomCentre = this.entrance();
    const action = DELIVERY_POSES[turn];
    const picture = kind === "picture" ? Math.floor(this.activity / AUTH_ROBOT_SCENES.length) % 3 : -1;
    this.play([
      // Leave THROUGH centre-bottom; never slide sideways across the fields.
      { to: bottomCentre, duration: 1, pose: "climb", layer: "behind" },
      { to: { x: bottomCentre.x, y: lane }, duration: 0.35, pose: "jump", arc: 24, layer: "behind" },
      { to: offscreen, duration: clamp(distance(bottomCentre, offscreen) / 620, 0.6, 1.65), pose: turn % 3 === 0 ? "tiptoe" : "run", layer: "behind" },
      { to: destination, duration: clamp(distance(offscreen, destination) / 390, 0.65, 1.7), pose: action, carried: kind, picture, vehicle: action === "drive" ? "car" : null, layer: "behind", effect: action === "drive" ? "dust" : null },
      ...this.deliveryGag(kind, destination),
      { to: destination, duration: 0.6, pose: "carry", carried: kind, picture, place: decoration ?? undefined, layer: "behind" },
      { to: destination, duration: 1.35, pose: DELIVERY_FINALES[turn], effect: turn % 3 === 0 ? "sparkles" : null, layer: "behind" },
      ...this.arriveSteps(destination),
    ]);
  }

  tick(seconds: number, allowIdle = true) {
    if (!this.geometry || this.frame.pose === "held") return this.frame;
    // Tab suspension cannot fast-forward a fall or create an unbounded simulation.
    const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, 0.05);
    const step = this.steps[0];
    if (!step) {
      if (allowIdle && !this.reducedMotion) {
        this.idle += dt;
        const delay = this.activity === 0 ? 8 : 10 + this.activity % 7;
        if (this.idle >= delay) this.startActivity();
      } else this.idle = 0;
      return this.frame;
    }
    this.elapsed += dt;
    const t = Math.min(this.elapsed / step.duration, 1);
    const linear = ["walk", "run", "tiptoe", "pull", "push", "drive", "carry"].includes(step.pose);
    const progress = step.pose === "fall" ? t * t : linear ? t : t * t * (3 - 2 * t);
    this.frame.x = this.origin.x + (step.to.x - this.origin.x) * progress;
    this.frame.y = this.origin.y + (step.to.y - this.origin.y) * progress - Math.sin(t * Math.PI) * (step.arc ?? 0);
    if (step.pose === "tumble") this.frame.rotation = (step.rotation ?? 360) * t;
    else this.frame.rotation = this.originRotation + ((step.rotation ?? 0) - this.originRotation) * progress;
    if (t === 1) {
      if (step.place) this.place(step.place);
      this.steps.shift();
      if (this.steps.length) this.beginStep();
      else this.home();
    }
    return this.frame;
  }

  private deliveryGag(kind: SceneryKind, point: Point): Step[] {
    const common = { to: point, duration: 0.85, layer: "behind" as const, carried: kind };
    switch (kind) {
      case "ball": return [{ ...common, pose: "juggle", duration: 1.25 }, { ...common, pose: "jump", arc: 55 }];
      case "crate": return [{ ...common, pose: "push" }, { ...common, pose: "bonk", effect: "impact", duration: 0.55 }, { ...common, pose: "getup", duration: 1.1 }];
      case "gear": return [{ ...common, pose: "tumble", rotation: 360 }, { ...common, pose: "getup", duration: 1.1 }];
      case "car": return [{ ...common, pose: "drive", vehicle: "car", effect: "dust", to: { x: point.x + 25, y: point.y } }, { ...common, pose: "drive", vehicle: "car" }];
      case "plant": return [{ ...common, pose: "tiptoe", to: { x: point.x + 12, y: point.y } }, { ...common, pose: "look" }];
      case "trophy": return [{ ...common, pose: "dance", effect: "sparkles", duration: 1.3 }];
      case "rocket": return [{ ...common, pose: "jump", arc: 80, effect: "dust" }, { ...common, pose: "wave", effect: "sparkles" }];
      case "lamp": return [{ ...common, pose: "peek" }, { ...common, pose: "wave", effect: "sparkles" }];
      case "code": return [{ ...common, pose: "look" }, { ...common, pose: "dance", effect: "sparkles" }];
      case "picture": return [{ ...common, pose: "pull" }, { ...common, pose: "bow" }];
      case "books": return [{ ...common, pose: "push" }, { ...common, pose: "stretch" }];
      default: return [{ ...common, pose: "look" }, { ...common, pose: "bow" }];
    }
  }

  private floor() { return Math.max(140, this.geometry!.height - 24); }

  private entrance(): Point {
    const g = this.geometry!;
    // A short viewport may put this below the screen, but it must always be
    // geometrically BELOW the real card rather than inside its fields.
    return { x: g.home.x, y: g.bottom + 112 };
  }

  private arriveSteps(from: Point): Step[] {
    const g = this.geometry!;
    const centre = this.entrance();
    return [
      { to: { x: centre.x, y: from.y }, duration: clamp(Math.abs(centre.x - from.x) / 460, 0.2, 1.35), pose: "walk", layer: "behind" },
      { to: centre, duration: clamp(Math.abs(centre.y - from.y) / 800, 0.4, 0.85), pose: "jump", arc: 38, layer: "behind" },
      { to: { x: centre.x, y: g.top + 100 }, duration: clamp((g.bottom - g.top) / 390, 0.8, 1.6), pose: "climb", layer: "behind" },
      { to: g.home, duration: 0.65, pose: "jump", arc: 22, layer: "behind" },
    ];
  }

  private exitedEdge(): ExitEdge | null {
    const g = this.geometry!;
    if (this.frame.x < 12) return "left";
    if (this.frame.x > g.width - 12) return "right";
    if (this.frame.y < 16) return "top";
    if (this.frame.y > g.height + 8) return "bottom";
    return null;
  }

  private driveBack(edge: ExitEdge) {
    const g = this.geometry!;
    const left = edge === "left" || (edge !== "right" && this.frame.x < g.home.x);
    const safeX = left ? Math.max(52, g.left / 2) : Math.min(g.width - 52, (g.right + g.width) / 2);
    const parking = { x: safeX, y: this.floor() };
    const vertical = edge === "top" || edge === "bottom";
    const start = vertical ? { x: safeX, y: edge === "top" ? -180 : g.height + 180 }
      : { x: edge === "left" ? -180 : g.width + 180, y: parking.y };
    Object.assign(this.frame, start, { scene: `rescate-${edge}`, rotation: edge === "top" ? 90 : edge === "bottom" ? -90 : 0 });
    this.play([
      { to: parking, duration: 1.65, pose: "drive", vehicle: "car", rotation: this.frame.rotation, effect: "dust", layer: "behind" },
      { to: parking, duration: 0.45, pose: "drive", vehicle: "car", effect: "dust", layer: "behind" },
      { to: parking, duration: 0.65, pose: "jump", arc: 35, layer: "behind" },
      ...this.recoveryDetour(parking),
      ...this.arriveSteps(parking),
    ]);
  }

  /** Each landing earns a little adventure before the climb back to the seat. */
  private recoveryDetour(point: Point): Step[] {
    const g = this.geometry!;
    const turn = this.recovery++ % 6;
    const direction = turn % 2 === 0 ? -1 : 1;
    const aside = { x: clamp(point.x + direction * 78, 42, g.width - 42), y: point.y };
    const common = { to: point, layer: "behind" as const, duration: 0.7 };
    switch (turn) {
      case 0: return [{ ...common, pose: "look" }, { ...common, to: aside, pose: "run" }, { ...common, pose: "wave" }];
      case 1: return [{ ...common, pose: "juggle", carried: "ball", duration: 1.2 }, { ...common, pose: "jump", arc: 44 }, { ...common, pose: "bow" }];
      case 2: return [{ ...common, to: aside, pose: "tiptoe" }, { ...common, pose: "peek" }, { ...common, pose: "dance", duration: 1 }];
      case 3: return [{ ...common, pose: "push", carried: "crate", to: aside }, { ...common, pose: "stretch" }, { ...common, pose: "walk" }];
      case 4: return [{ ...common, pose: "carry", carried: "book", to: aside }, { ...common, pose: "look", carried: "book", duration: 1.2 }, { ...common, pose: "bow" }];
      default: return [{ ...common, pose: "dance", effect: "sparkles", duration: 1.2 }, { ...common, pose: "jump", arc: 52 }, { ...common, pose: "wave" }];
    }
  }

  /** Reserved slots keep artwork clear of inputs and the navigation footer. */
  private placement(kind: SceneryKind, id: number): PlacedScenery | null {
    const g = this.geometry!;
    const desktop = this.sceneryLimit() === 10;
    const slot = id % (desktop ? 10 : 4);
    if (!desktop) {
      const available = g.height - (g.bottom + 112);
      if (available < 36) return null;
      const size = clamp(Math.min(available - 8, (g.width - 48) / 4 - 10), 28, 62);
      const x = (g.width - 32) * (slot + 0.5) / 4 + 16;
      return { id, kind, x, y: g.height - 18, size, rotation: slot % 2 === 0 ? -4 : 4 };
    }
    const left = slot % 2 === 0;
    const sideWidth = left ? g.left : g.width - g.right;
    const size = Math.min(sideWidth - 44, [80, 122, 64, 100, 72][Math.floor(slot / 2)]);
    const row = [0.87, 0.24, 0.66, 0.44, 0.98][Math.floor(slot / 2)];
    const x = left ? sideWidth / 2 : g.right + sideWidth / 2;
    const y = clamp(90 + (g.height - 120) * row, 90 + size, g.height - 18);
    return { id, kind, x, y, size, rotation: id % 3 === 0 ? -5 : id % 3 === 1 ? 4 : 0 };
  }

  private place(value: PlacedScenery) {
    const next = this.placement(value.kind, this.sceneryId);
    if (!next) return;
    this.sceneryId++;
    this.deposited = [...this.deposited, next].slice(-10);
    this.reflowScenery();
  }

  private reflowScenery() {
    const limit = this.sceneryLimit();
    // Keep a bounded logical collection even if a keyboard/short viewport leaves
    // no safe visible slots. The same objects return when that space reappears.
    this.scenery = this.deposited.slice(-limit).flatMap((item) => {
      // IDs are also reserved-slot identities. Re-numbering slots on a route
      // change would let the next delivery land on a still-occupied slot.
      const next = this.placement(item.kind, item.id);
      return next ? [{ ...next, id: item.id }] : [];
    });
  }

  private sceneryLimit() {
    const g = this.geometry!;
    return g.width >= 800 && Math.min(g.left, g.width - g.right) >= 110 ? 10 : 4;
  }

  private play(steps: Step[]) {
    this.steps = steps;
    this.idle = 0;
    this.beginStep();
  }

  private beginStep() {
    const step = this.steps[0];
    this.origin = { x: this.frame.x, y: this.frame.y };
    this.originRotation = this.frame.rotation % 360;
    this.elapsed = 0;
    Object.assign(this.frame, {
      pose: step.pose, picture: step.picture ?? -1, layer: step.layer ?? "front",
      vehicle: step.vehicle ?? null, effect: step.effect ?? null, carried: step.carried ?? null,
    });
    if (Math.abs(step.to.x - this.frame.x) > 1) this.frame.facing = step.to.x > this.frame.x ? 1 : -1;
  }
}
