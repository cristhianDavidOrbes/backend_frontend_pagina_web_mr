"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  mode: "login" | "register";
};

const pillars = [
  { symbol: "▣", label: "Encapsular", color: "from-emerald-300 to-emerald-600" },
  { symbol: "◇", label: "Abstraer", color: "from-cyan-300 to-sky-600" },
  { symbol: "⌘", label: "Heredar", color: "from-violet-300 to-violet-600" },
  { symbol: "△", label: "Polimorfismo", color: "from-amber-200 to-orange-500" },
] as const;

function DiagramCard({ mode }: { mode: Props["mode"] }) {
  return (
    <div className="w-44 rounded-[1.4rem] border border-slate-900/15 bg-[#e8eee9] p-3 text-[#101915] shadow-[0_24px_70px_rgba(0,0,0,.45),9px_10px_0_rgba(28,208,147,.13)]">
      <div className="flex items-center justify-between border-b-2 border-slate-900/70 pb-2">
        <strong className="font-mono text-sm">{mode === "login" ? "Usuario" : "Estudiante"}</strong>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[8px] text-emerald-800">CLASE</span>
      </div>
      <div className="space-y-1.5 border-b border-slate-900/30 py-2 font-mono text-[10px]">
        <p>− progreso</p>
        <p>− identidad</p>
      </div>
      <div className="space-y-1.5 pt-2 font-mono text-[10px]">
        <p>+ continuar()</p>
        <p>+ aprender()</p>
      </div>
    </div>
  );
}

function PhysicalBook({ mode }: { mode: Props["mode"] }) {
  return (
    <div className="relative h-44 w-32 [transform-style:preserve-3d]">
      <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-r-2xl border border-amber-100/20 bg-amber-950 shadow-2xl" />
      <div className="absolute inset-0 overflow-hidden rounded-r-2xl border border-amber-100/20 bg-gradient-to-br from-[#183c34] via-[#0f2b26] to-[#071511] p-4 shadow-[0_24px_60px_rgba(0,0,0,.5)]">
        <span className="font-mono text-[8px] tracking-[.2em] text-emerald-300/70">ALGOLAB // 01</span>
        <div className="mt-8 grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 font-mono text-xl text-emerald-200">
          {mode === "login" ? "↻" : "+"}
        </div>
        <strong className="mt-4 block text-sm leading-tight text-white">{mode === "login" ? "Ruta guardada" : "Nueva ruta"}</strong>
        <small className="mt-1 block text-[9px] text-slate-400">Objetos que enseñan</small>
      </div>
      <div className="absolute bottom-2 right-[-7px] top-2 w-3 rounded-r bg-gradient-to-r from-amber-50 to-amber-200/70" />
    </div>
  );
}

export function AuthWorld({ children, mode }: Props) {
  const reduceMotion = useReducedMotion();
  const login = mode === "login";

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#030807] text-slate-100
        [&_.auth-shell]:!z-10 [&_.auth-shell]:!bg-none [&_.auth-shell]:before:!hidden
        [&_.auth-brand]:!left-5 [&_.auth-brand]:!top-5 [&_.auth-brand]:!rounded-2xl [&_.auth-brand]:!border [&_.auth-brand]:!border-white/10 [&_.auth-brand]:!bg-[#071411]/80 [&_.auth-brand]:!px-3 [&_.auth-brand]:!py-2 [&_.auth-brand]:!shadow-2xl [&_.auth-brand]:!backdrop-blur-xl sm:[&_.auth-brand]:!left-8 sm:[&_.auth-brand]:!top-7
        [&_.auth-layout]:!max-w-[1280px] [&_.auth-layout]:!gap-10 [&_.auth-layout]:!px-5 [&_.auth-layout]:!pb-10 [&_.auth-layout]:!pt-28 md:[&_.auth-layout]:!px-8 lg:[&_.auth-layout]:!grid-cols-[minmax(0,1.08fr)_minmax(390px,500px)]
        [&_.auth-story]:relative [&_.auth-story]:!z-10 [&_.auth-story_h1]:!max-w-[680px] [&_.auth-story_h1]:!text-[clamp(2.75rem,6.2vw,5.75rem)] [&_.auth-story_h1]:!font-semibold [&_.auth-story_h1]:!leading-[.91] [&_.auth-story_h1]:!tracking-[-.065em]
        [&_.auth-story>p:not(.section-kicker)]:!max-w-[570px] [&_.auth-story>p:not(.section-kicker)]:!text-[15px] [&_.auth-story>p:not(.section-kicker)]:!leading-7 [&_.auth-story>p:not(.section-kicker)]:!text-slate-300/65
        [&_.auth-code]:!max-w-[500px] [&_.auth-code]:!rounded-[1.35rem] [&_.auth-code]:!border-emerald-300/15 [&_.auth-code]:!bg-[#06110f]/75 [&_.auth-code]:!px-5 [&_.auth-code]:!py-4 [&_.auth-code]:!shadow-[0_24px_70px_rgba(0,0,0,.32)] [&_.auth-code]:!backdrop-blur-xl
        [&_.auth-card]:!relative [&_.auth-card]:!z-20 [&_.auth-card]:!max-w-[500px] [&_.auth-card]:!rounded-[2rem] [&_.auth-card]:!border-white/15 [&_.auth-card]:!bg-[#071411]/90 [&_.auth-card]:!p-6 [&_.auth-card]:!shadow-[0_45px_140px_rgba(0,0,0,.55),0_0_80px_rgba(34,218,151,.07)] [&_.auth-card]:!backdrop-blur-2xl sm:[&_.auth-card]:!p-8
        [&_.auth-card]:before:absolute [&_.auth-card]:before:inset-x-8 [&_.auth-card]:before:top-0 [&_.auth-card]:before:h-px [&_.auth-card]:before:bg-gradient-to-r [&_.auth-card]:before:from-transparent [&_.auth-card]:before:via-emerald-200/70 [&_.auth-card]:before:to-transparent
        [&_.auth-card_h2]:!mt-2 [&_.auth-card_h2]:!text-3xl [&_.auth-card_h2]:!tracking-[-.035em]
        [&_.auth-copy]:!mt-3 [&_.auth-copy]:!text-sm [&_.auth-copy]:!leading-6 [&_.auth-copy]:!text-slate-400
        [&_.field-input]:!min-h-[52px] [&_.field-input]:!rounded-2xl [&_.field-input]:!border-white/10 [&_.field-input]:!bg-black/25 [&_.field-input]:!px-4 [&_.field-input]:focus:!border-emerald-300/55 [&_.field-input]:focus:!shadow-[0_0_0_4px_rgba(52,232,166,.08)]
        [&_.primary-button]:!min-h-[52px] [&_.primary-button]:!rounded-2xl [&_.primary-button]:!shadow-[0_18px_45px_rgba(36,205,143,.2)] [&_.primary-button]:!transition [&_.primary-button]:hover:!-translate-y-0.5 [&_.primary-button]:disabled:!opacity-60
        [&_.auth-switch]:!mt-6 [&_.auth-switch]:!border-t [&_.auth-switch]:!border-white/10 [&_.auth-switch]:!pt-5"
      data-auth-mode={mode}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(35,225,157,.18),transparent_25rem),radial-gradient(circle_at_88%_76%,rgba(50,100,255,.13),transparent_30rem),linear-gradient(145deg,#04100d_0%,#050b0a_48%,#020504_100%)]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(115,255,203,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(115,255,203,.045)_1px,transparent_1px)] [background-size:54px_54px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />
        <div className="absolute -bottom-[46%] left-1/2 h-[75%] w-[145%] -translate-x-1/2 [background-image:linear-gradient(rgba(86,241,183,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(86,241,183,.1)_1px,transparent_1px)] [background-size:55px_55px] [transform:perspective(720px)_rotateX(63deg)] [transform-origin:center_top] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,.9),transparent_75%)]" />
        <div className="absolute left-[8%] top-[20%] h-72 w-72 rounded-full border border-emerald-300/10 shadow-[0_0_120px_rgba(40,222,154,.13),inset_0_0_80px_rgba(40,222,154,.04)]" />
        <div className="absolute left-[calc(8%+3rem)] top-[calc(20%+3rem)] h-48 w-48 rounded-full border border-dashed border-cyan-200/10" />

        <motion.div
          animate={reduceMotion ? undefined : { y: [0, -12, 0], rotate: [-8, -5, -8] }}
          className="absolute -left-6 top-[58%] hidden opacity-60 lg:block xl:left-[3%]"
          initial={false}
          transition={{ duration: 5.8, ease: "easeInOut", repeat: Infinity }}
        >
          <PhysicalBook mode={mode} />
        </motion.div>

        <motion.div
          animate={reduceMotion ? undefined : { y: [0, 9, 0], rotate: [7, 4, 7] }}
          className="absolute right-[2%] top-[17%] hidden opacity-50 xl:block"
          initial={false}
          transition={{ delay: 0.5, duration: 6.4, ease: "easeInOut", repeat: Infinity }}
        >
          <DiagramCard mode={mode} />
        </motion.div>

        <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-end gap-3 opacity-35 2xl:flex">
          {pillars.map((pillar, index) => (
            <motion.div
              animate={reduceMotion ? undefined : { y: [0, index % 2 ? -5 : -9, 0] }}
              className="flex w-24 flex-col items-center"
              key={pillar.label}
              transition={{ delay: index * 0.22, duration: 4.4, ease: "easeInOut", repeat: Infinity }}
            >
              <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${pillar.color} font-mono text-lg text-slate-950 shadow-lg`}>
                {pillar.symbol}
              </div>
              <div className="mt-1 h-16 w-11 rounded-t-lg border border-white/10 bg-gradient-to-b from-slate-300/25 to-slate-900/40" />
              <span className="mt-2 font-mono text-[8px] uppercase tracking-wider text-slate-400">{pillar.label}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          animate={reduceMotion ? undefined : { opacity: [0.25, 0.7, 0.25] }}
          className="absolute right-6 top-7 hidden items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.04] px-3 py-2 font-mono text-[9px] uppercase tracking-[.18em] text-emerald-200/70 sm:flex"
          transition={{ duration: 2.8, repeat: Infinity }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" />
          {login ? "Progreso enlazado" : "Perfil listo para enlazar"}
        </motion.div>
      </div>

      {children}
    </div>
  );
}
