"use client";

import Link from "next/link";
import { Activity, BookOpen, GraduationCap, ShieldCheck, UserCog, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthSession } from "@/lib/use-auth-session";
import { apiRequest } from "@/lib/client-api";

type Rol = "ESTUDIANTE" | "DOCENTE" | "ADMINISTRADOR";

type Usuario = {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  nivelActual: number;
  puntaje: number;
};

type Nivel = {
  id: number;
  nombre: string;
  descripcion: string;
  nivel: number;
  objetivo?: string;
  activo?: boolean;
};

const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-45";

export default function AdministradorPage() {
  const { hydrated, token } = useAuthSession();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [datosCargados, setDatosCargados] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!hydrated || !token) return;

    async function cargarDatosIniciales() {
      try {
        const [usuariosDatos, nivelesDatos] = await Promise.all([
          apiRequest<Usuario[]>("/api/usuarios", token as string),
          apiRequest<Nivel[]>("/api/niveles", token as string),
        ]);

        setUsuarios(usuariosDatos);
        setNiveles(nivelesDatos);
      } catch (error) {
        setMensaje(error instanceof Error ? error.message : "Error al cargar datos.");
      } finally {
        setDatosCargados(true);
      }
    }

    void cargarDatosIniciales();
  }, [hydrated, token]);

  const estudiantes = usuarios.filter((usuario) => usuario.rol === "ESTUDIANTE").length;
  const docentes = usuarios.filter((usuario) => usuario.rol === "DOCENTE").length;
  const administradores = usuarios.filter((usuario) => usuario.rol === "ADMINISTRADOR").length;
  const nivelesActivos = niveles.filter((nivel) => nivel.activo !== false).length;

  return (
    <>
      {mensaje ? (
        <div
          aria-live="polite"
          className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300" />
          {mensaje}
        </div>
      ) : null}

      <section className="hero-dashboard lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[.18em] text-emerald-300">
            <Activity className="animate-pulse" size={15} /> Sistema operativo
          </div>
          <h2 className="mt-4 max-w-3xl text-2xl font-semibold leading-tight sm:text-3xl">
            Controla la ruta pedagógica que vive dentro de las gafas.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Administra identidades, roles, puntajes y experiencias de programación orientada a
            objetos desde una consola conectada en tiempo real con AlgoLab.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className={`${buttonClass} bg-emerald-300 text-slate-950 shadow-[0_12px_34px_rgba(52,211,153,.18)] hover:-translate-y-0.5 hover:bg-emerald-200`}
              href="/administrador/usuarios"
            >
              <Users size={16} /> Gestionar usuarios
            </Link>
            <Link
              className={`${buttonClass} border border-white/10 bg-white/[.04] text-slate-200 hover:border-emerald-300/25 hover:bg-emerald-300/10`}
              href="/administrador/niveles"
            >
              <BookOpen size={16} /> Gestionar niveles
            </Link>
            <Link
              className={`${buttonClass} border border-white/10 bg-white/[.04] text-slate-200 hover:border-emerald-300/25 hover:bg-emerald-300/10`}
              href="/administrador/perfil"
            >
              <UserCog size={16} /> Mi perfil
            </Link>
          </div>
        </div>

        <div className="relative z-10 hidden min-h-48 place-items-center lg:grid">
          <div className="absolute h-40 w-40 animate-[spin_18s_linear_infinite] rounded-full border border-dashed border-emerald-300/25" />
          <div className="absolute h-28 w-28 animate-[spin_12s_linear_infinite_reverse] rounded-full border border-cyan-300/20" />
          <div className="grid h-20 w-20 place-items-center rounded-3xl border border-emerald-300/30 bg-emerald-300/10 shadow-[0_0_60px_rgba(52,211,153,.16)]">
            <ShieldCheck className="text-emerald-200" size={34} />
          </div>
          <span className="absolute bottom-1 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[.16em] text-slate-400">
            permisos verificados
          </span>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          icon={<GraduationCap size={18} />}
          label="Estudiantes"
          note="Explorando la ruta POO"
          value={datosCargados ? estudiantes : 0}
        />
        <MetricTile
          icon={<Users size={18} />}
          label="Docentes"
          note="Acompañamiento activo"
          value={datosCargados ? docentes : 0}
        />
        <MetricTile
          icon={<BookOpen size={18} />}
          label="Niveles activos"
          note={datosCargados ? `${niveles.length} experiencias configuradas` : "Cargando..."}
          value={datosCargados ? nivelesActivos : 0}
        />
        <MetricTile
          icon={<ShieldCheck size={18} />}
          label="Administradores"
          note={datosCargados ? `${usuarios.length} identidades sincronizadas` : "Cargando..."}
          value={datosCargados ? administradores : 0}
        />
      </section>
    </>
  );
}

function MetricTile({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <article className="metric-card group transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/20">
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-300/[.08] text-emerald-200 transition group-hover:bg-emerald-300/[.14]">
          {icon}
        </span>
      </span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
