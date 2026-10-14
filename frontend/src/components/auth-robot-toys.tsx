"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import type { AuthRobotMotion, PlacedScenery, Toy } from "@/lib/auth-robot-motion";
import { PointerVelocity } from "@/lib/auth-robot-pointer";
import { RobotProp } from "./auth-robot-props";
import styles from "./auth-robot-companion.module.css";

const names = { book: "libro", books: "libros", plant: "planta", crate: "caja", gear: "engranaje", code: "código", car: "carro", lamp: "lámpara", ball: "pelota", trophy: "trofeo", rocket: "cohete", picture: "imagen" };
type Snapshot = { scenery: readonly PlacedScenery[]; toys: Toy[]; version: number };
type Grab = { id: number; pointer: number; target: HTMLButtonElement; dx: number; dy: number; velocity: PointerVelocity };

/** Existing artwork becomes interactive; positions stay outside the form's protected area. */
export function AuthRobotToys({ motion, onUpdate, paused }: { motion: AuthRobotMotion; onUpdate: () => void; paused: boolean }) {
  const [nodes] = useState(() => new Map<number, HTMLButtonElement>());
  const grab = useRef<Grab | null>(null);
  const previous = useRef({ scenery: motion.scenery, version: motion.toys.version });
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({ scenery: motion.scenery, toys: [], version: motion.toys.version }));

  const paint = useCallback(() => {
    for (const toy of motion.toys.toys) {
      const node = nodes.get(toy.id);
      if (!node) continue;
      node.style.transform = `translate3d(${toy.x - toy.size / 2}px, ${toy.y - toy.size * 0.625}px, 0) rotate(${toy.angle}deg)`;
      node.dataset.toyState = toy.state;
      node.hidden = toy.state === "carried";
      node.setAttribute("aria-pressed", String(toy.state === "held"));
    }
    if (previous.current.scenery !== motion.scenery || previous.current.version !== motion.toys.version) {
      previous.current = { scenery: motion.scenery, version: motion.toys.version };
      setSnapshot({ scenery: motion.scenery, toys: motion.toys.toys.map((toy) => ({ ...toy })), version: motion.toys.version });
    }
    // These bounded events are already represented by the robot's existing effects.
    motion.toys.drain();
  }, [motion, nodes]);

  const finish = useCallback((cancelled: boolean) => {
    const held = grab.current;
    if (!held) return;
    grab.current = null;
    if (held.target.hasPointerCapture(held.pointer)) held.target.releasePointerCapture(held.pointer);
    if (cancelled) motion.cancelToy(held.id);
    else {
      const velocity = held.velocity.value();
      motion.throwToy(held.id, velocity.x, velocity.y);
    }
    paint();
    onUpdate();
  }, [motion, onUpdate, paint]);

  useEffect(() => {
    let frame = 0;
    const animate = () => { paint(); frame = requestAnimationFrame(animate); };
    const suspend = () => {
      cancelAnimationFrame(frame);
      if (document.hidden || paused) finish(true);
      else frame = requestAnimationFrame(animate);
    };
    const blur = () => finish(true);
    suspend();
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", suspend);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", suspend);
      finish(true);
    };
  }, [finish, paint, paused]);

  function start(event: PointerEvent<HTMLButtonElement>) {
    const id = Number(event.currentTarget.dataset.toyId);
    if (paused || !event.isPrimary || event.button !== 0 || grab.current) return;
    const toy = motion.grabToy(id) ?? motion.pickToy(id);
    if (!toy) return;
    event.preventDefault();
    const velocity = new PointerVelocity();
    velocity.sample(event.clientX, event.clientY, event.timeStamp);
    grab.current = { id, pointer: event.pointerId, target: event.currentTarget, dx: event.clientX - toy.x, dy: event.clientY - toy.y, velocity };
    event.currentTarget.setPointerCapture(event.pointerId);
    paint();
    onUpdate();
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const held = grab.current;
    if (!held || held.pointer !== event.pointerId) return;
    held.velocity.sample(event.clientX, event.clientY, event.timeStamp);
    motion.moveToy(held.id, { x: event.clientX - held.dx, y: event.clientY - held.dy });
    paint();
    onUpdate();
  }

  function end(event: PointerEvent<HTMLButtonElement>) {
    if (grab.current?.pointer === event.pointerId) { move(event); finish(false); }
  }

  function cancel(event: PointerEvent<HTMLButtonElement>) {
    if (grab.current?.pointer === event.pointerId) finish(true);
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") { event.preventDefault(); finish(true); }
  }

  function click(event: MouseEvent<HTMLButtonElement>) {
    if (paused || event.detail !== 0 || grab.current) return;
    const id = Number(event.currentTarget.dataset.toyId);
    const toy = motion.grabToy(id) ?? motion.pickToy(id);
    if (toy) { motion.throwToy(id, toy.x < innerWidth / 2 ? 380 : -380, -900); paint(); onUpdate(); }
  }

  // The same keyed button survives the transition scenery → held toy, preserving capture.
  const items = [
    ...snapshot.scenery.map((item) => ({ ...item, state: "deposited", tx: item.x - item.size / 2, ty: item.y - item.size })),
    ...snapshot.toys.map((toy) => ({ ...toy, rotation: toy.angle, tx: toy.x - toy.size / 2, ty: toy.y - toy.size * 0.625 })),
  ];
  return items.map((item) => (
    <button key={item.id} type="button" className={`${styles.sceneryItem} ${styles.toy}`} data-scenery-kind={item.kind} data-toy-id={item.id} data-toy-state={item.state}
      ref={(node) => { if (node) nodes.set(item.id, node); else nodes.delete(item.id); }}
      aria-label={`Lanzar ${names[item.kind]}`} aria-pressed={item.state === "held"} title="Arrastra y suelta; con teclado pulsa Intro para lanzar"
      hidden={paused || item.state === "carried"} disabled={paused || item.state === "carried"}
      style={{ width: item.size, height: item.size, transform: `translate3d(${item.tx}px, ${item.ty}px, 0) rotate(${item.rotation}deg)` }}
      onPointerDown={start} onPointerMove={move} onPointerUp={end}
      onPointerCancel={cancel} onLostPointerCapture={cancel}
      onKeyDown={keyDown} onClick={click}>
      <RobotProp kind={item.kind} size={item.size} />
    </button>
  ));
}
