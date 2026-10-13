"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { RobotReaction, RobotSignal } from "./robot-stage";
import { getAuthEasterEggSnapshot, getServerAuthEasterEggSnapshot, initializeAuthEasterEgg, subscribeAuthEasterEgg } from "@/lib/auth-robot-easter-egg";

export type AuthRobotAnchor = { mascot: HTMLElement; card: HTMLElement };
type Bridge = {
  active: boolean;
  register: (anchor: AuthRobotAnchor) => () => void;
  react: (kind: RobotReaction) => void;
};
const Context = createContext<Bridge | null>(null);
const Companion = dynamic(() => import("./auth-robot-companion").then((module) => module.AuthRobotCompanion), { ssr: false });

/** Above the route template: one canvas and one motion state across login/register. */
export function AuthRobotProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === "/iniciar-sesion" || pathname === "/registrarse";
  const eerie = useSyncExternalStore(subscribeAuthEasterEgg, getAuthEasterEggSnapshot, getServerAuthEasterEggSnapshot);
  const [anchor, setAnchor] = useState<AuthRobotAnchor | null>(null);
  const [signal, setSignal] = useState<RobotSignal | null>(null);
  const sequence = useRef(0);
  const register = useCallback((next: AuthRobotAnchor) => {
    setAnchor(next);
    return () => setAnchor((current) => current === next ? null : current);
  }, []);
  const react = useCallback((kind: RobotReaction) => setSignal({ kind, id: ++sequence.current }), []);
  const bridge = useMemo(() => ({ active, register, react }), [active, register, react]);
  useEffect(() => { if (active) initializeAuthEasterEgg(); }, [active]);
  return (
    <Context.Provider value={bridge}>
      {children}
      {active ? <Companion anchor={anchor} signal={signal} eerie={eerie} /> : null}
    </Context.Provider>
  );
}

export function useAuthRobot() { return useContext(Context); }
