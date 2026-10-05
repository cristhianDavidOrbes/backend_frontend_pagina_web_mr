"use client";

import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import styles from "./perfil-inicial.module.css";
import { apiRequest } from "@/lib/client-api";
import { saveAuthUser, useAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";

export default function BienvenidaEstudiantePage() {
  const { hydrated, token, usuario } = useAuthSession();
  if (!hydrated || !token || !usuario) {
    return <div className="loading-card">Preparando tu perfil…</div>;
  }
  return <PerfilInicial token={token} usuario={usuario} />;
}

function PerfilInicial({ token, usuario }: { token: string; usuario: UsuarioSesion }) {
  const router = useRouter();
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [alias, setAlias] = useState(usuario?.nombreUsuario ?? "");
  const [institucion, setInstitucion] = useState(usuario?.institucion ?? "");
  const [programa, setPrograma] = useState(usuario?.programa ?? "");
  const [biografia, setBiografia] = useState(usuario?.biografia ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function continuar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const limpio = alias.trim();
    if (!nombre.trim()) return setError("Cuéntanos tu nombre para continuar.");
    if (!/^[A-Za-z0-9._-]{3,30}$/.test(limpio)) {
      return setError("El alias necesita de 3 a 30 caracteres, sin espacios.");
    }
    setError("");
    setPaso(2);
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!institucion.trim() || !programa.trim()) {
      return setError("Completa tu institución y programa para continuar.");
    }
    setGuardando(true);
    setError("");
    try {
      const actualizado = await apiRequest<UsuarioSesion>("/api/perfil", token, {
        method: "PUT",
        body: JSON.stringify({
          nombre: nombre.trim(),
          nombreUsuario: alias.trim(),
          institucion: institucion.trim(),
          programa: programa.trim(),
          biografia: biografia.trim(),
          avatar: usuario.avatar ?? "orbita",
        }),
      });
      saveAuthUser(actualizado);
      localStorage.setItem(`algolab_onboarding:${actualizado.id}`, "completado");
      router.replace("/estudiante");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos guardar tu perfil.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Tu primera visita</span>
        <h1>Antes de empezar, cuéntanos sobre ti.</h1>
        <p>Estos datos aparecerán en tu perfil y ayudarán a reconocerte en la web y las gafas. Podrás cambiarlos después.</p>
      </header>

      <div className={styles.progress} aria-label={`Paso ${paso} de 2`}>
        <span className={paso === 1 ? styles.current : styles.done}><b>1</b> Tu identidad</span>
        <i aria-hidden="true" />
        <span className={paso === 2 ? styles.current : ""}><b>2</b> Tu formación</span>
      </div>

      <section className={styles.card} aria-live="polite">
        <div className={styles.cardHeader}>
          <span>Paso {paso} de 2</span>
          <h2>{paso === 1 ? "¿Cómo quieres aparecer?" : "¿Dónde estás aprendiendo?"}</h2>
          <p>{paso === 1 ? "Usaremos tu nombre y un alias para identificar tu progreso." : "Así completamos tu perfil de estudiante."}</p>
        </div>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        {paso === 1 ? (
          <form className={styles.form} onSubmit={continuar}>
            <label>
              <span>Nombre completo</span>
              <input autoComplete="name" maxLength={100} required value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Tu nombre y apellido" />
            </label>
            <label>
              <span>Alias público</span>
              <input autoComplete="nickname" maxLength={30} required value={alias} onChange={(event) => setAlias(event.target.value)} placeholder="Por ejemplo, cristian_dev" />
              <small>Entre 3 y 30 caracteres. Puedes usar letras, números, punto, guion y guion bajo.</small>
            </label>
            <div className={styles.actions}>
              <button className={styles.primary} type="submit">Continuar <ArrowRight size={17} /></button>
              <button className={styles.skip} type="button" onClick={() => router.replace("/estudiante")}>Completar después</button>
            </div>
          </form>
        ) : (
          <form className={styles.form} onSubmit={guardar}>
            <label>
              <span>Institución</span>
              <input maxLength={120} required value={institucion} onChange={(event) => setInstitucion(event.target.value)} placeholder="Universidad o centro de formación" />
            </label>
            <label>
              <span>Programa académico</span>
              <input maxLength={120} required value={programa} onChange={(event) => setPrograma(event.target.value)} placeholder="Por ejemplo, Ingeniería de Software" />
            </label>
            <label>
              <span>Sobre ti <em>(opcional)</em></span>
              <textarea maxLength={300} rows={3} value={biografia} onChange={(event) => setBiografia(event.target.value)} placeholder="¿Qué te gustaría aprender en AlgoLab?" />
            </label>
            <div className={styles.actions}>
              <button className={styles.primary} disabled={guardando} type="submit">
                {guardando ? <><LoaderCircle className="animate-spin" size={17} /> Guardando…</> : <><Check size={17} /> Guardar y empezar</>}
              </button>
              <button className={styles.back} type="button" onClick={() => { setError(""); setPaso(1); }}><ArrowLeft size={16} /> Volver</button>
            </div>
          </form>
        )}
      </section>
      <p className={styles.note}>La foto de perfil también puede añadirse más tarde desde <strong>Mi perfil</strong>.</p>
    </main>
  );
}
