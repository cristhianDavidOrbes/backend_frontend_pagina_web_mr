"use client";

import { ScanLine, Sparkles, Gamepad2, BrainCircuit, ShieldCheck, Box } from "lucide-react";

const MARQUEE_ITEMS = [
  { text: "OBJETOS FÍSICOS EN 3D", icon: Box },
  { text: "DIAGRAMAS UML EN VIVO", icon: ScanLine },
  { text: "MENTOR PEDAGÓGICO IA", icon: BrainCircuit },
  { text: "ENCAPSULAMIENTO & HERENCIA", icon: ShieldCheck },
  { text: "META QUEST REALIDAD MIXTA", icon: Gamepad2 },
  { text: "PROGRESO EN TIEMPO REAL", icon: Sparkles },
];

export function SignalMarquee() {
  return (
    <div className="signal-marquee relative z-10 w-full overflow-hidden border-y border-emerald-400/20 bg-slate-950/70 py-3.5 backdrop-blur-md">
      <div className="signal-marquee-track flex w-max animate-marquee gap-8">
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, index) => {
          const Icon = item.icon;
          return (
            <div className="signal-marquee-item flex items-center gap-3 whitespace-nowrap font-mono text-xs font-semibold tracking-[.18em] text-slate-300 transition duration-300 hover:text-emerald-300" key={index}>
              <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-400/10 text-emerald-300">
                <Icon size={13} />
              </span>
              <span>{item.text}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/60" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
