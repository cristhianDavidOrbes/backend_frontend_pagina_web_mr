/** Browser-independent choreography. Positions are viewport pixels at the feet. */
export type CompanionPose = "sit" | "held" | "fall" | "walk" | "jump" | "climb" | "pull" | "dance" | "look" | "stretch"
  | "tumble" | "bonk" | "dizzy" | "getup" | "tiptoe" | "run" | "drive" | "carry" | "push" | "peek" | "bow" | "wave" | "juggle" | "sleep"
  | "ready" | "catch" | "kick" | "giggle" | "cheer" | "shrug" | "spin" | "surprised" | "worried";
export type Point = { x: number; y: number };
export type ExitEdge = "left" | "right" | "top" | "bottom";
export type RobotGeometry = { home: Point; left: number; right: number; top: number; bottom: number; width: number; height: number };
export type SceneryKind = "book" | "books" | "plant" | "crate" | "gear" | "code" | "car" | "lamp" | "ball" | "trophy" | "rocket" | "picture";
export type PlacedScenery = { id: number; kind: SceneryKind; x: number; y: number; size: number; rotation: number };
export type CompanionFrame = Point & {
  pose: CompanionPose; facing: -1 | 1; picture: number; layer: "front" | "behind";
  vehicle: "car" | null; rotation: number; effect: "impact" | "stars" | "dust" | "sparkles" | null;
  carried: SceneryKind | null; scene: string;
  /** Squash and stretch: 1 is neutral, <1 squashed (landing), >1 stretched (take-off). */
  squash: number;
};
type Restore = { id: number; kind: SceneryKind };
type Step = {
  to: Point; duration: number; pose: CompanionPose; arc?: number; picture?: number;
  layer?: CompanionFrame["layer"]; vehicle?: CompanionFrame["vehicle"]; rotation?: number;
  effect?: CompanionFrame["effect"]; carried?: SceneryKind; place?: PlacedScenery;
  /** Returns a thrown toy to its original slot. */
  restore?: Restore;
  /** Ballistic flight (px/s) used when the robot itself is thrown. */
  ballistic?: Point;
};

/* ------------------------------------------------------------------------ */
/* Toys: deposited scenery the visitor can pick up and throw.               */
/* ------------------------------------------------------------------------ */

export type ToyState = "held" | "flying" | "resting" | "carried";
export type Toy = {
  id: number; kind: SceneryKind; size: number; radius: number;
  /** Centre of the artwork in viewport pixels. */
  x: number; y: number; vx: number; vy: number;
  angle: number; spin: number; state: ToyState;
  age: number; rest: number; grounded: boolean; bounces: number;
  /** Seconds of rocket thrust left. */
  thrust: number;
  /** Seconds of self-driving left (toy car). */
  drive: number; driveDir: -1 | 1; drove: boolean;
};
export type ToyEvent = { type: "bounce" | "wall" | "rest" | "launch" | "kick" | "hit"; id: number; kind: SceneryKind; x: number; y: number; strength: number };
type ToyMaterial = { restitution: number; friction: number; drag: number; rolls: boolean; spin: number; gravity: number };

const TOY_GRAVITY = 2200;
const ROBOT_GRAVITY = 2600;
const MAX_THROW = 2600;
/** Hands are roughly this far above the feet when reaching up. */
const HAND_HEIGHT = 135;
const MATERIALS: Record<SceneryKind, ToyMaterial> = {
  ball: { restitution: 0.8, friction: 0.55, drag: 0.06, rolls: true, spin: 0, gravity: 1 },
  gear: { restitution: 0.5, friction: 0.9, drag: 0.08, rolls: true, spin: 0, gravity: 1.05 },
  crate: { restitution: 0.12, friction: 6, drag: 0.04, rolls: false, spin: 0.25, gravity: 1.35 },
  book: { restitution: 0.22, friction: 4.5, drag: 0.35, rolls: false, spin: 1.2, gravity: 1 },
  books: { restitution: 0.18, friction: 5, drag: 0.2, rolls: false, spin: 0.6, gravity: 1.2 },
  plant: { restitution: 0.2, friction: 5, drag: 0.15, rolls: false, spin: 0.5, gravity: 1.1 },
  code: { restitution: 0.25, friction: 4, drag: 0.15, rolls: false, spin: 0.6, gravity: 1.1 },
  car: { restitution: 0.35, friction: 1.2, drag: 0.08, rolls: false, spin: 0.4, gravity: 1.1 },
  lamp: { restitution: 0.3, friction: 4, drag: 0.15, rolls: false, spin: 0.8, gravity: 1 },
  trophy: { restitution: 0.35, friction: 4, drag: 0.1, rolls: false, spin: 0.7, gravity: 1.15 },
  rocket: { restitution: 0.35, friction: 3, drag: 0.1, rolls: false, spin: 0, gravity: 0.9 },
  picture: { restitution: 0.15, friction: 5, drag: 0.9, rolls: false, spin: 1.5, gravity: 0.8 },
};
const wrapDegrees = (angle: number) => ((angle % 360) + 540) % 360 - 180;
/** Reflects a coordinate between two walls, like a billiard ball. */
function reflect(value: number, min: number, max: number) {
  const span = max - min;
  if (span <= 0) return min;
  let p = (value - min) % (2 * span);
  if (p < 0) p += 2 * span;
  return min + (p > span ? 2 * span - p : p);
}

/** A tiny, deterministic 2D physics world for thrown props. */
export class ToyBox {
  toys: Toy[] = [];
  /** Changes whenever the list or a toy state changes (not on every move). */
  version = 0;
  width = 0;
  height = 0;
  private events: ToyEvent[] = [];

  get floor() { return Math.max(60, this.height - 8); }

  setBounds(width: number, height: number) {
    this.width = width;
    this.height = height;
    for (const toy of this.toys) this.contain(toy);
  }

  get(id: number) { return this.toys.find((toy) => toy.id === id); }

  /** The first toy that is out in the world and needs fetching. */
  loose() { return this.toys.find((toy) => toy.state === "flying" || toy.state === "resting"); }

  /** The toy the robot should be looking at, if any. */
  focus() { return this.toys.find((toy) => toy.state === "held") ?? this.toys.find((toy) => toy.state === "flying"); }

  add(kind: SceneryKind, id: number, size: number, center: Point): Toy {
    this.remove(id);
    const toy: Toy = {
      id, kind, size, radius: Math.max(12, size * 0.32), x: center.x, y: center.y, vx: 0, vy: 0, angle: 0, spin: 0,
      state: "held", age: 0, rest: 0, grounded: false, bounces: 0, thrust: 0, drive: 0, driveDir: 1, drove: false,
    };
    this.toys = [...this.toys, toy];
    this.contain(toy);
    this.version++;
    return toy;
  }

  hold(id: number, center?: Point) {
    const toy = this.get(id);
    if (!toy || toy.state === "carried") return;
    if (toy.state !== "held") { toy.state = "held"; this.version++; }
    toy.vx = toy.vy = toy.spin = toy.thrust = toy.drive = 0;
    if (center && Number.isFinite(center.x + center.y)) { toy.x = center.x; toy.y = center.y; this.contain(toy); }
  }

  throw(id: number, vx: number, vy: number) {
    const toy = this.get(id);
    if (!toy || toy.state !== "held") return;
    const speed = Math.hypot(vx, vy);
    const scale = Number.isFinite(speed) && speed > MAX_THROW ? MAX_THROW / speed : 1;
    toy.vx = Number.isFinite(vx) ? vx * scale : 0;
    toy.vy = Number.isFinite(vy) ? vy * scale : 0;
    toy.state = "flying";
    toy.age = toy.rest = 0;
    toy.grounded = false;
    toy.bounces = 0;
    toy.drove = false;
    const material = MATERIALS[toy.kind];
    toy.spin = toy.vx * material.spin * 0.6;
    if (toy.kind === "rocket" && speed > 150) {
      toy.thrust = 1.05;
      this.emit("launch", toy, speed);
    }
    this.version++;
  }

  /** Gives an existing toy a new impulse (kicks, bonks). */
  impulse(id: number, vx: number, vy: number, type: ToyEvent["type"] = "kick") {
    const toy = this.get(id);
    if (!toy || toy.state === "carried") return;
    toy.vx = vx;
    toy.vy = vy;
    toy.grounded = false;
    toy.rest = 0;
    if (toy.state !== "flying") { toy.state = "flying"; this.version++; }
    this.emit(type, toy, Math.hypot(vx, vy));
  }

  carry(id: number) {
    const toy = this.get(id);
    if (!toy || toy.state === "carried") return;
    toy.state = "carried";
    toy.vx = toy.vy = toy.spin = toy.thrust = toy.drive = 0;
    this.version++;
  }

  /** A carried toy slips out of the robot's hands at the given point. */
  drop(id: number, at: Point) {
    const toy = this.get(id);
    if (!toy || toy.state !== "carried") return;
    toy.state = "flying";
    toy.x = at.x;
    toy.y = at.y;
    toy.vx = 0;
    toy.vy = -260;
    toy.angle = 0;
    toy.rest = 0;
    this.contain(toy);
    this.version++;
  }

  remove(id: number) {
    if (!this.toys.some((toy) => toy.id === id)) return;
    this.toys = this.toys.filter((toy) => toy.id !== id);
    this.version++;
  }

  drain() {
    if (!this.events.length) return this.events;
    const events = this.events;
    this.events = [];
    return events;
  }

  step(seconds: number) {
    const dt = Math.max(0, Math.min(Number.isFinite(seconds) ? seconds : 0, 0.05));
    if (!dt || !this.height || !this.width) return;
    const substeps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / substeps;
    for (const toy of this.toys) {
      if (toy.state !== "flying") continue;
      for (let index = 0; index < substeps && toy.state === "flying"; index++) this.integrate(toy, h);
    }
  }

  private integrate(toy: Toy, dt: number) {
    const material = MATERIALS[toy.kind];
    toy.age += dt;
    if (toy.thrust > 0) {
      // A small rocket: thrust along its heading, biased upwards.
      const speed = Math.hypot(toy.vx, toy.vy);
      let dx = speed > 1 ? toy.vx / speed : 0;
      let dy = speed > 1 ? toy.vy / speed : -1;
      dx = dx * 0.55;
      dy = dy * 0.55 - 0.45;
      const length = Math.hypot(dx, dy) || 1;
      toy.vx += (dx / length) * 3900 * dt;
      toy.vy += (dy / length) * 3900 * dt;
      toy.thrust = Math.max(0, toy.thrust - dt);
    }
    toy.vy += TOY_GRAVITY * material.gravity * dt;
    const drag = Math.exp(-material.drag * dt);
    toy.vx *= drag;
    toy.vy *= drag;
    // Paper flutters side to side as it falls.
    if (toy.kind === "picture" && !toy.grounded) toy.vx += Math.sin(toy.age * 7) * 520 * dt;
    toy.x += toy.vx * dt;
    toy.y += toy.vy * dt;
    const r = toy.radius;
    if (toy.x - r < 0 || toy.x + r > this.width) {
      const leftWall = toy.x - r < 0;
      toy.x = leftWall ? r : this.width - r;
      if (leftWall ? toy.vx < 0 : toy.vx > 0) {
        if (Math.abs(toy.vx) > 140) this.emit("wall", toy, Math.abs(toy.vx));
        toy.vx = -toy.vx * material.restitution;
        if (toy.drive > 0) toy.driveDir = leftWall ? 1 : -1;
      }
    }
    if (toy.y - r < 0) {
      toy.y = r;
      if (toy.vy < 0) toy.vy = -toy.vy * material.restitution;
    }
    toy.grounded = false;
    const floor = this.floor;
    if (toy.y + r >= floor) {
      toy.y = floor - r;
      if (toy.vy > 0) {
        if (toy.vy > 170) {
          this.emit("bounce", toy, toy.vy);
          toy.vy = -toy.vy * material.restitution;
          toy.bounces++;
          if (!material.rolls) toy.spin *= 0.45;
        } else toy.vy = 0;
      }
      toy.grounded = toy.vy === 0;
    }
    if (toy.grounded) {
      if (toy.drive > 0) {
        toy.drive = Math.max(0, toy.drive - dt);
        toy.vx = toy.driveDir * 280;
      } else toy.vx *= Math.exp(-material.friction * dt);
      if (material.rolls) toy.spin = (toy.vx / r) * (180 / Math.PI);
      else {
        toy.spin = 0;
        // Tip back upright on the floor.
        toy.angle -= wrapDegrees(toy.angle) * Math.min(1, dt * 12);
      }
      if (Math.abs(toy.vx) < 6 && toy.drive <= 0) {
        toy.vx = 0;
        toy.rest += dt;
        if (toy.rest > 0.2) {
          if (toy.kind === "car" && !toy.drove) {
            // The toy car wakes up and drives off on its own.
            toy.drove = true;
            toy.drive = 1.4;
            toy.driveDir = toy.x < this.width / 2 ? 1 : -1;
            toy.rest = 0;
          } else {
            toy.state = "resting";
            toy.angle = material.rolls ? toy.angle : 0;
            this.version++;
            this.emit("rest", toy, 0);
          }
        }
      } else toy.rest = 0;
    } else toy.rest = 0;
    toy.angle += toy.spin * dt;
    if (toy.kind === "rocket" && !toy.grounded && Math.hypot(toy.vx, toy.vy) > 60) {
      toy.angle = Math.atan2(toy.vy, toy.vx) * (180 / Math.PI) + 90;
    }
  }

  private contain(toy: Toy) {
    if (!this.width || !this.height) return;
    toy.x = Math.max(toy.radius, Math.min(this.width - toy.radius, toy.x));
    toy.y = Math.max(toy.radius, Math.min(this.floor - toy.radius, toy.y));
  }

  private emit(type: ToyEvent["type"], toy: Toy, strength: number) {
    this.events.push({ type, id: toy.id, kind: toy.kind, x: toy.x, y: toy.y + (type === "bounce" ? toy.radius : 0), strength });
    if (this.events.length > 24) this.events.splice(0, this.events.length - 24);
  }
}

/* ------------------------------------------------------------------------ */

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
const frameDefaults = { facing: 1 as const, picture: -1, layer: "front" as const, vehicle: null, rotation: 0, effect: null, carried: null, squash: 1 };
const AIRBORNE_POSES = new Set<CompanionPose>(["jump", "fall", "catch"]);

type Chase = {
  id: number;
  /** watch: standing on the card while the toy is held. run/air: chasing on the floor. */
  phase: "watch" | "run" | "air";
  vy: number; timer: number; cooldown: number; kick: number; kicked: boolean;
};

export class AuthRobotMotion {
  frame: CompanionFrame = { x: 0, y: 0, pose: "sit", scene: "reposo", ...frameDefaults };
  geometry: RobotGeometry | null = null;
  scenery: readonly PlacedScenery[] = [];
  reducedMotion = false;
  readonly toys = new ToyBox();
  private steps: Step[] = [];
  private origin: Point = { x: 0, y: 0 };
  private originRotation = 0;
  private elapsed = 0;
  private idle = 0;
  private activity = 0;
  private sceneryId = 0;
  private deposited: readonly PlacedScenery[] = [];
  private recovery = 0;
  private pokes = 0;
  private chase: Chase | null = null;
  private squashVelocity = 0;

  setGeometry(next: RobotGeometry) {
    if (![next.home.x, next.home.y, next.left, next.right, next.top, next.bottom, next.width, next.height].every(Number.isFinite)
      || next.width <= 0 || next.height <= 0) return;
    const previous = this.geometry;
    this.geometry = { ...next, home: { ...next.home } };
    this.toys.setBounds(next.width, next.height);
    if (previous && this.deposited.length) this.reflowScenery();
    if (!previous || this.frame.pose === "sit") this.home();
    // A running game keeps going through scrolls and small layout changes.
    else if (this.chase && !this.steps.length) this.frame.x = clamp(this.frame.x, 30, next.width - 30);
    else if (this.frame.pose !== "held") this.returnHome();
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
    if (value) this.restoreAllToys();
    if (value && this.frame.pose !== "held") this.home();
  }

  home() {
    if (!this.geometry) return;
    this.dropCarried();
    Object.assign(this.frame, this.geometry.home, frameDefaults, { pose: "sit", scene: "reposo" });
    this.steps = [];
    this.chase = null;
    this.squashVelocity = 0;
    this.elapsed = this.idle = 0;
  }

  grab() {
    if (!this.geometry) return;
    this.dropCarried();
    this.steps = [];
    this.chase = null;
    this.squashVelocity = 0;
    Object.assign(this.frame, frameDefaults, { pose: "held", scene: "arrastrando" });
    this.idle = 0;
  }

  drag(point: Point) {
    if (this.frame.pose !== "held" || !Number.isFinite(point.x + point.y)) return;
    const g = this.geometry!;
    this.frame.x = clamp(point.x, -220, g.width + 220);
    this.frame.y = clamp(point.y, -220, g.height + 220);
  }

  /** `velocity` (px/s) lets a quick flick send the robot flying across the page. */
  drop(edge?: ExitEdge, velocity?: Point) {
    if (this.frame.pose !== "held") return;
    const g = this.geometry!;
    if (this.reducedMotion || (!edge && distance(this.frame, g.home) < 18)) return this.home();
    const exit = edge ?? this.exitedEdge();
    if (exit) return this.driveBack(exit);
    const speed = velocity ? Math.hypot(velocity.x, velocity.y) : 0;
    if (velocity && Number.isFinite(speed) && speed > 700) return this.fling(velocity, speed);
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

  /** A tap (no drag) on the seated robot: a rotating set of playful reactions. */
  poke() {
    const g = this.geometry;
    if (!g || this.reducedMotion || this.frame.pose !== "sit" || this.steps.length || this.chase) return;
    const at = g.home;
    const common = { to: at, layer: "front" as const };
    const variants: Step[][] = [
      [{ ...common, pose: "giggle", duration: 1.25 }],
      [{ ...common, pose: "surprised", duration: 0.55, arc: 26 }, { ...common, pose: "wave", duration: 1.1 }],
      [{ ...common, pose: "jump", duration: 0.85, arc: 72, rotation: 360, effect: "sparkles" }],
      [{ ...common, pose: "spin", duration: 1.05 }],
      [{ ...common, pose: "cheer", duration: 1.3, effect: "sparkles" }],
      [{ ...common, pose: "dance", duration: 1.6 }],
      [{ ...common, pose: "shrug", duration: 1 }],
    ];
    this.frame.scene = "cosquillas";
    this.play(variants[this.pokes++ % variants.length]);
  }

  /** Focus loss/cancellation also recovers to the same central entrance. */
  returnHome() {
    const g = this.geometry;
    if (!g) return;
    this.dropCarried();
    this.chase = null;
    if (this.reducedMotion || distance(this.frame, g.home) < 18) return this.home();
    const edge = this.exitedEdge();
    if (edge) return this.driveBack(edge);
    this.frame.scene = "regreso-central";
    this.play(this.arriveSteps(this.frame));
  }

  startActivity() {
    const g = this.geometry;
    if (!g || this.reducedMotion || this.frame.pose !== "sit" || this.toys.toys.length) return;
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

  /* ---------------- Toy interaction (called by the UI) ---------------- */

  /** Lifts a deposited prop off the page so it can be thrown. */
  pickToy(id: number): Toy | null {
    if (!this.geometry) return null;
    const item = this.scenery.find((entry) => entry.id === id);
    if (!item) return null;
    this.deposited = this.deposited.filter((entry) => entry.id !== id);
    this.reflowScenery();
    const toy = this.toys.add(item.kind, id, item.size, { x: item.x, y: item.y - item.size * 0.375 });
    this.watch(id);
    return toy;
  }

  /** Picks up a toy that is already loose on the page. */
  grabToy(id: number): Toy | null {
    const toy = this.toys.get(id);
    if (!this.geometry || !toy || toy.state === "carried") return null;
    this.toys.hold(id);
    this.watch(id);
    return toy;
  }

  moveToy(id: number, center: Point) { this.toys.hold(id, center); }

  /** Cancellation returns an object to its reserved slot, without starting a chase. */
  cancelToy(id: number) {
    const toy = this.toys.get(id);
    if (!toy) return;
    this.restore({ id, kind: toy.kind });
    if (this.chase?.id === id) this.returnHome();
  }

  throwToy(id: number, vx: number, vy: number) {
    const toy = this.toys.get(id);
    if (!toy || toy.state !== "held") return;
    if (this.reducedMotion) { this.restore({ id, kind: toy.kind }); return; }
    this.toys.throw(id, vx, vy);
    this.pursue(id);
  }

  tick(seconds: number, allowIdle = true) {
    if (!this.geometry) return this.frame;
    // Tab suspension cannot fast-forward a fall or create an unbounded simulation.
    const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, 0.05);
    this.toys.step(dt);
    if (this.frame.pose === "held") return this.frame;
    this.updateSquash(dt);
    if (this.chase && !this.steps.length) { this.tickChase(dt); return this.frame; }
    const step = this.steps[0];
    if (!step) {
      if (this.frame.pose === "sit") this.checkToyHit();
      if (this.steps.length) return this.frame;
      if (allowIdle && !this.reducedMotion) {
        this.idle += dt;
        const loose = this.toys.loose();
        if (loose) { if (this.idle >= 1.2) this.pursue(loose.id); return this.frame; }
        const delay = this.activity === 0 ? 8 : 10 + this.activity % 7;
        if (this.idle >= delay) this.startActivity();
      } else this.idle = 0;
      return this.frame;
    }
    this.elapsed += dt;
    const t = Math.min(this.elapsed / step.duration, 1);
    if (step.ballistic) {
      const g = this.geometry;
      const time = Math.min(this.elapsed, step.duration);
      this.frame.x = t === 1 ? step.to.x : reflect(this.origin.x + step.ballistic.x * time, 38, g.width - 38);
      this.frame.y = t === 1 ? step.to.y : Math.min(step.to.y, this.origin.y + step.ballistic.y * time + 0.5 * ROBOT_GRAVITY * time * time);
      this.frame.rotation = this.originRotation + ((step.rotation ?? 0) - this.originRotation) * t;
    } else {
      const linear = ["walk", "run", "tiptoe", "pull", "push", "drive", "carry"].includes(step.pose);
      const progress = step.pose === "fall" ? t * t : linear ? t : t * t * (3 - 2 * t);
      this.frame.x = this.origin.x + (step.to.x - this.origin.x) * progress;
      this.frame.y = this.origin.y + (step.to.y - this.origin.y) * progress - Math.sin(t * Math.PI) * (step.arc ?? 0);
      if (step.pose === "tumble") this.frame.rotation = (step.rotation ?? 360) * t;
      else this.frame.rotation = this.originRotation + ((step.rotation ?? 0) - this.originRotation) * progress;
    }
    if (t === 1) {
      if (step.place) this.place(step.place);
      if (step.restore) this.restore(step.restore);
      this.steps.shift();
      if (this.steps.length) this.beginStep();
      else if (this.chase) {
        if (Math.abs(this.frame.y - this.floor()) > 4) this.pursue(this.chase.id);
        else this.enterChase();
      }
      else this.home();
    }
    return this.frame;
  }

  /* ---------------- Chase & catch ---------------- */

  /** Robot stands up on the card, excited, while a toy is held. */
  private watch(id: number) {
    if (this.reducedMotion || this.frame.pose !== "sit" || this.steps.length || this.chase) return;
    this.chase = { id, phase: "watch", vy: 0, timer: 0, cooldown: 0, kick: 0, kicked: false };
    this.frame.pose = "surprised";
    this.frame.scene = "atento";
    this.impulse(1.12);
  }

  /** Jumps down from wherever the robot is and runs after a toy. */
  private pursue(id: number) {
    const g = this.geometry;
    const toy = this.toys.get(id);
    if (!g || !toy || this.frame.pose === "held" || this.reducedMotion) return;
    if (this.chase && this.chase.id === id && this.chase.phase !== "watch" && !this.steps.length && Math.abs(this.frame.y - this.floor()) < 4) return;
    this.dropCarried();
    const wasRunning = this.chase !== null && this.chase.phase !== "watch" && !this.steps.length && Math.abs(this.frame.y - this.floor()) < 4;
    this.chase = { id, phase: "run", vy: 0, timer: 0, cooldown: 0.2, kick: 0, kicked: false };
    Object.assign(this.frame, { carried: null, vehicle: null, effect: null, picture: -1, scene: `juego-${toy.kind}` });
    const floor = this.floor();
    if (wasRunning || (Math.abs(this.frame.y - floor) < 4 && !this.steps.length)) return this.enterChase();
    const atHome = distance(this.frame, g.home) < 60;
    const steps: Step[] = atHome
      ? [
        { to: { x: g.home.x, y: g.top + 90 }, duration: 0.42, pose: "jump", arc: 48, layer: "behind" },
        { to: { x: g.home.x, y: floor }, duration: clamp((floor - g.top) / 1100, 0.25, 0.8), pose: "fall", layer: "behind" },
      ]
      : [{ to: { x: clamp(this.frame.x, 30, g.width - 30), y: floor }, duration: clamp(Math.abs(floor - this.frame.y) / 900, 0.2, 0.8), pose: "fall", layer: "behind" }];
    this.play(steps);
  }

  private enterChase() {
    if (!this.chase) return;
    this.chase.phase = "run";
    this.chase.vy = 0;
    this.frame.y = this.floor();
    this.frame.rotation = 0;
    this.frame.layer = "behind";
  }

  private tickChase(dt: number) {
    const chase = this.chase!;
    const g = this.geometry!;
    const toy = this.toys.get(chase.id);
    if (!toy || toy.state === "carried") { this.chase = null; return this.returnHome(); }
    if (chase.phase === "watch") {
      if (toy.state !== "held") return this.pursue(toy.id);
      // Stand on top of the card, bouncing on the spot and tracking the toy.
      const standY = g.home.y - 34;
      this.frame.x = g.home.x;
      this.frame.y += (standY - this.frame.y) * Math.min(1, dt * 10);
      this.frame.layer = "front";
      this.setPose(this.frame.pose === "surprised" && chase.timer < 0.45 ? "surprised" : "ready");
      this.frame.facing = toy.x >= this.frame.x ? 1 : -1;
      chase.timer += dt;
      return;
    }
    chase.timer += dt;
    chase.cooldown -= dt;
    const floor = this.floor();
    Object.assign(this.frame, { layer: "behind", vehicle: null, carried: null, rotation: 0 });
    if (chase.timer > 16) {
      // Something unreachable: give up gracefully, the toy can be fetched later.
      this.chase = null;
      this.frame.scene = "me-rindo";
      const here = { x: this.frame.x, y: floor };
      return this.play([{ to: here, duration: 1, pose: "shrug", layer: "behind" }, ...this.arriveSteps(here)]);
    }
    const dx = toy.x - this.frame.x;
    const hand = { x: this.frame.x, y: this.frame.y - HAND_HEIGHT };
    const reach = toy.radius + 48;
    if (chase.phase === "air") {
      chase.vy += ROBOT_GRAVITY * dt;
      this.frame.y += chase.vy * dt;
      this.frame.x = clamp(this.frame.x + Math.sign(dx) * Math.min(Math.abs(dx) * 6, 280) * dt, 30, g.width - 30);
      this.setPose("catch");
      if (toy.state !== "held" && distance(hand, toy) < reach) return this.caught(toy, true);
      if (this.frame.y >= floor) {
        this.frame.y = floor;
        chase.vy = 0;
        chase.phase = "run";
        chase.cooldown = 0.3;
        this.impulse(0.8);
      }
      return;
    }
    this.frame.y = floor;
    if (chase.kick > 0) { chase.kick -= dt; this.setPose("kick"); return; }
    if (toy.state === "held") {
      this.setPose("ready");
      this.frame.facing = dx >= 0 ? 1 : -1;
      this.frame.effect = null;
      return;
    }
    const onGround = toy.y + toy.radius >= this.toys.floor - 10 && Math.abs(toy.vy) < 260;
    if (Math.abs(dx) < 34 + toy.radius * 0.4 && onGround) {
      if (toy.kind === "ball" && !chase.kicked) {
        // Keepy-uppy: pop the ball up, then leap to catch it.
        chase.kicked = true;
        chase.kick = 0.32;
        chase.cooldown = 0.35;
        this.setPose("kick");
        this.frame.facing = dx >= 0 ? 1 : -1;
        this.toys.impulse(toy.id, this.frame.facing * 50, -1080);
        return;
      }
      return this.caught(toy, false);
    }
    if (toy.state === "flying" && distance(hand, toy) < reach) return this.caught(toy, false);
    const above = this.frame.y - HAND_HEIGHT - toy.y;
    if (chase.cooldown <= 0 && toy.state === "flying" && Math.abs(dx) < 120 && above > 10 && above < 340 && toy.vy > -380) {
      chase.phase = "air";
      chase.vy = -Math.sqrt(2 * ROBOT_GRAVITY * (above + 28));
      this.setPose("catch");
      this.impulse(1.18);
      return;
    }
    const targetX = clamp(toy.x + (toy.state === "flying" ? toy.vx * 0.22 : 0), 30, g.width - 30);
    const gap = targetX - this.frame.x;
    if (Math.abs(gap) > 40 || (Math.abs(gap) > 6 && this.frame.pose === "run")) {
      const speed = Math.min(620, 140 + Math.abs(gap) * 3.5);
      this.frame.x += Math.sign(gap) * Math.min(Math.abs(gap), speed * dt);
      this.frame.facing = gap > 0 ? 1 : -1;
      this.setPose("run");
      this.frame.effect = speed > 430 ? "dust" : null;
    } else {
      this.setPose("ready");
      this.frame.facing = dx >= 0 ? 1 : -1;
      this.frame.effect = null;
    }
  }

  private caught(toy: Toy, airborne: boolean) {
    const g = this.geometry!;
    this.toys.carry(toy.id);
    this.chase = null;
    const floor = this.floor();
    const kind = toy.kind;
    const here = { x: clamp(this.frame.x, 40, g.width - 40), y: floor };
    const slot = this.placement(kind, toy.id);
    const destination = slot ? { x: slot.x, y: slot.y } : here;
    const index = DELIVERY_KINDS.indexOf(kind);
    const action = DELIVERY_POSES[index] ?? "carry";
    this.frame.scene = `atrapada-${kind}`;
    this.impulse(1.1);
    const steps: Step[] = [];
    if (airborne) steps.push({ to: here, duration: clamp((floor - this.frame.y) / 650 + 0.12, 0.18, 0.6), pose: "catch", carried: kind, layer: "behind" });
    steps.push(
      ...this.celebrate(kind, here),
      { to: destination, duration: clamp(distance(here, destination) / 340, 0.5, 2.2), pose: action, carried: kind, vehicle: action === "drive" ? "car" : null, effect: action === "drive" ? "dust" : null, layer: "behind" },
      { to: destination, duration: 0.5, pose: "carry", carried: kind, restore: { id: toy.id, kind }, layer: "behind" },
      { to: destination, duration: 1.05, pose: DELIVERY_FINALES[index] ?? "bow", effect: "sparkles", layer: "behind" },
      ...this.arriveSteps(destination),
    );
    this.play(steps);
  }

  /** Each prop earns its own little reaction once caught. */
  private celebrate(kind: SceneryKind, at: Point): Step[] {
    const g = this.geometry!;
    const common = { to: at, layer: "behind" as const, carried: kind, duration: 0.9 };
    switch (kind) {
      case "ball": return [{ ...common, pose: "cheer", effect: "sparkles", duration: 1.1 }, { ...common, pose: "juggle", duration: 1.1 }];
      case "trophy": return [{ ...common, pose: "cheer", effect: "sparkles" }, { ...common, pose: "dance", duration: 1.2 }];
      case "plant": return [{ ...common, pose: "worried", duration: 1.1 }, { ...common, pose: "look", duration: 0.7 }];
      case "crate": return [{ ...common, pose: "bonk", effect: "impact", duration: 0.55 }, { ...common, pose: "getup", duration: 1 }];
      case "rocket": return [{ ...common, pose: "jump", arc: 70, effect: "dust", duration: 0.8 }, { ...common, pose: "cheer", effect: "sparkles" }];
      case "gear": return [{ ...common, pose: "spin", duration: 0.95 }, { ...common, pose: "dizzy", effect: "stars", duration: 0.9 }];
      case "car": return [{ ...common, pose: "drive", vehicle: "car", effect: "dust", duration: 0.8, to: { x: clamp(at.x + (at.x < g.width / 2 ? 60 : -60), 60, g.width - 60), y: at.y } }];
      case "book": case "books": return [{ ...common, pose: "look", duration: 1.1 }, { ...common, pose: "giggle" }];
      case "code": return [{ ...common, pose: "look" }, { ...common, pose: "dance", effect: "sparkles" }];
      case "lamp": return [{ ...common, pose: "peek" }, { ...common, pose: "cheer", effect: "sparkles" }];
      case "picture": return [{ ...common, pose: "worried" }, { ...common, pose: "bow" }];
    }
  }

  /** A toy thrown at the seated robot bonks it on the head. */
  private checkToyHit() {
    const g = this.geometry!;
    const body = { x: this.frame.x, y: this.frame.y - 70 };
    for (const toy of this.toys.toys) {
      if (toy.state !== "flying" || toy.age < 0.12 || distance(body, toy) > toy.radius + 42) continue;
      const side = toy.x >= body.x ? 1 : -1;
      this.toys.impulse(toy.id, side * Math.max(260, Math.abs(toy.vx) * 0.55), -Math.max(380, Math.abs(toy.vy) * 0.45), "hit");
      this.frame.scene = "golpe-de-juguete";
      this.play([
        { to: g.home, duration: 0.5, pose: "bonk", effect: "impact", layer: "front" },
        { to: g.home, duration: 0.85, pose: "dizzy", effect: "stars", layer: "front" },
      ]);
      this.chase = { id: toy.id, phase: "run", vy: 0, timer: 0, cooldown: 0.2, kick: 0, kicked: false };
      // After the bonk, pursue() replaces the finished steps with a jump down.
      this.steps.push({ to: g.home, duration: 0.01, pose: "surprised", layer: "front" });
      return;
    }
  }

  private setPose(pose: CompanionPose) { if (this.frame.pose !== pose) this.frame.pose = pose; }

  private impulse(value: number) {
    this.frame.squash = value;
    this.squashVelocity = 0;
  }

  /** Damped spring: overshoots slightly for a cartoon wobble. */
  private updateSquash(dt: number) {
    if (!dt || (this.frame.squash === 1 && this.squashVelocity === 0)) return;
    this.squashVelocity += (1 - this.frame.squash) * 260 * dt;
    this.squashVelocity *= Math.exp(-14 * dt);
    this.frame.squash = clamp(this.frame.squash + this.squashVelocity * dt, 0.6, 1.4);
    if (Math.abs(this.frame.squash - 1) < 0.002 && Math.abs(this.squashVelocity) < 0.02) {
      this.frame.squash = 1;
      this.squashVelocity = 0;
    }
  }

  private dropCarried() {
    for (const toy of this.toys.toys) {
      if (toy.state === "carried") this.toys.drop(toy.id, { x: this.frame.x, y: this.frame.y - 70 });
    }
  }

  private restoreAllToys() {
    for (const toy of [...this.toys.toys]) if (toy.state !== "held") this.restore({ id: toy.id, kind: toy.kind });
  }

  /* ---------------- Original choreography helpers ---------------- */

  private fling(velocity: Point, speed: number) {
    const g = this.geometry!;
    const floor = this.floor();
    const scale = Math.min(1, 2200 / speed) * 0.9;
    const vx = velocity.x * scale;
    const vy = velocity.y * scale;
    const drop = Math.max(0, floor - this.frame.y);
    const time = clamp((vy + Math.sqrt(vy * vy + 2 * ROBOT_GRAVITY * drop)) / ROBOT_GRAVITY, 0.25, 2.2);
    const landing = { x: reflect(clamp(this.frame.x, 38, g.width - 38) + vx * time, 38, g.width - 38), y: floor };
    const turns = Math.max(1, Math.min(3, Math.round(speed / 1100)));
    const roll = { x: clamp(landing.x + (vx > 0 ? -26 : 26), 38, g.width - 38), y: floor };
    this.frame.x = clamp(this.frame.x, 38, g.width - 38);
    this.frame.scene = "lanzamiento";
    this.play([
      { to: landing, duration: time, pose: "fall", ballistic: { x: vx, y: vy }, rotation: (vx >= 0 ? 360 : -360) * turns, layer: "behind" },
      { to: landing, duration: 0.55, pose: "bonk", effect: "impact", layer: "behind" },
      { to: roll, duration: 0.65, pose: "tumble", rotation: vx > 0 ? -360 : 360, layer: "behind" },
      { to: roll, duration: 0.85, pose: "dizzy", effect: "stars", layer: "behind" },
      { to: roll, duration: 1.1, pose: "getup", layer: "behind" },
      ...this.recoveryDetour(roll),
      ...this.arriveSteps(roll),
    ]);
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

  /** Puts a thrown toy back into its original (reserved) slot. */
  private restore(value: Restore) {
    this.toys.remove(value.id);
    if (!this.geometry || this.deposited.some((item) => item.id === value.id)) return;
    const entry: PlacedScenery = { id: value.id, kind: value.kind, x: 0, y: 0, size: 0, rotation: 0 };
    this.deposited = [...this.deposited, entry].sort((a, b) => a.id - b.id).slice(-10);
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
    const previousPose = this.frame.pose;
    this.origin = { x: this.frame.x, y: this.frame.y };
    this.originRotation = this.frame.rotation % 360;
    this.elapsed = 0;
    Object.assign(this.frame, {
      pose: step.pose, picture: step.picture ?? -1, layer: step.layer ?? "front",
      vehicle: step.vehicle ?? null, effect: step.effect ?? null, carried: step.carried ?? null,
    });
    if (Math.abs(step.to.x - this.frame.x) > 1) this.frame.facing = step.to.x > this.frame.x ? 1 : -1;
    // Squash on landings, stretch on take-offs.
    if (step.pose === "bonk") this.impulse(0.72);
    else if (AIRBORNE_POSES.has(previousPose) && !AIRBORNE_POSES.has(step.pose)) this.impulse(0.8);
    else if (step.pose === "jump" && (step.arc ?? 0) > 20) this.impulse(1.14);
  }
}
