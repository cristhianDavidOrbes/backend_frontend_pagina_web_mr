"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import styles from "./perfil-inicial.module.css";
import { AuthLayout } from "@/components/auth-layout";
import { Swap } from "@/components/reveal";
import { AnimatedNotice, Spinner } from "@/components/ui";
import { apiRequest } from "@/lib/client-api";
import { saveAuthUser, useAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";

const ALIAS = /^[A-Za-z0-9._-]{3,30}$/;

export default function BienvenidaEstudiantePage() {
  const { hydrated, token, usuario } = useAuthSession();
  if (!hydrated || !token || !usuario) {
    return <div className="loading-card mx-auto mt-10 max-w-md">Preparando tu perfil…</div>;
  }
  return <PerfilInicial token={token} usuario={usuario} />;
}

type Errores = Partial<Record<"nombre" | "alias" | "institucion" | "programa", string>>;

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
  const [errores, setErrores] = useState<Errores>({});

  const aliasLimpio = alias.trim();
  const aliasValido = ALIAS.test(aliasLimpio);

  function continuar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nuevos: Errores = {
      nombre: nombre.trim() ? undefined : "Cuéntanos tu nombre para continuar.",
      alias: aliasValido ? undefined : "El alias necesita de 3 a 30 caracteres, sin espacios.",
    };
    setErrores(nuevos);
    if (nuevos.nombre || nuevos.alias) return;
    setError("");
    setPaso(2);
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nuevos: Errores = {
      institucion: institucion.trim() ? undefined : "Escribe tu institución.",
      programa: programa.trim() ? undefined : "Escribe tu programa académico.",
    };
    setErrores(nuevos);
    if (nuevos.institucion || nuevos.programa) return;
    setGuardando(true);
    setError("");
    try {
      const actualizado = await apiRequest<UsuarioSesion>("/api/perfil", token, {
        method: "PUT",
        body: JSON.stringify({
          nombre: nombre.trim(),
          nombreUsuario: aliasLimpio,
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

  const campo = (clave: keyof Errores) => ({
    "aria-invalid": Boolean(errores[clave]),
    "aria-describedby": errores[clave] ? `${clave}-error` : undefined,
  });
  const limpiar = (clave: keyof Errores) => errores[clave] && setErrores((e) => ({ ...e, [clave]: undefined }));
  const mensaje = (clave: keyof Errores) =>
    errores[clave] ? <p className="field-error" id={`${clave}-error`}>{errores[clave]}</p> : null;

  return (
    <AuthLayout
      footer={<>Tu foto puede añadirse después desde <strong>Mi perfil</strong>.</>}
      intro={paso === 1 ? "Así te verán en el ranking y en las gafas." : "Último paso. Puedes cambiarlo cuando quieras."}
      steps={{ current: paso + 1, total: 3 }}
      title={paso === 1 ? <>¿Cómo quieres <em>aparecer?</em></> : <>¿Dónde <em>estudias?</em></>}
    >
      <div className="mt-6">
        <AnimatedNotice className="mb-5" message={error} tone="error" />
        <Swap direction={paso === 2 ? 1 : -1} swapKey={paso}>
          {paso === 1 ? (
            <form className={styles.form} noValidate onSubmit={continuar}>
              <div className="field">
                <label className="field-label" htmlFor="ob-nombre">Nombre completo</label>
                <input {...campo("nombre")} autoComplete="name" className="field-input" id="ob-nombre" maxLength={100} onChange={(event) => { setNombre(event.target.value); limpiar("nombre"); }} placeholder="Tu nombre y apellido" value={nombre} />
                {mensaje("nombre")}
              </div>
              <div className="field">
                <label className="field-label" htmlFor="ob-alias">Alias público</label>
                <input {...campo("alias")} autoComplete="nickname" className="field-input" id="ob-alias" maxLength={30} onChange={(event) => { setAlias(event.target.value); limpiar("alias"); }} placeholder="Por ejemplo, cristian_dev" value={alias} />
                {mensaje("alias") ?? (
                  <p className="field-help">
                    {aliasLimpio && aliasValido ? "Perfecto: así aparecerás en el ranking." : "De 3 a 30 caracteres: letras, números, punto, guion o guion bajo."}
                  </p>
                )}
              </div>
              <div className={styles.actions}>
                <button className="btn btn-primary btn-lg" type="submit">Continuar <ArrowRight className="icon-shift" size={18} /></button>
                <button className="btn btn-ghost" onClick={() => router.replace("/estudiante")} type="button">Completar después</button>
              </div>
            </form>
          ) : (
            <form className={styles.form} noValidate onSubmit={guardar}>
              <div className="field">
                <label className="field-label" htmlFor="ob-institucion">Institución</label>
                <input {...campo("institucion")} className="field-input" id="ob-institucion" maxLength={120} onChange={(event) => { setInstitucion(event.target.value); limpiar("institucion"); }} placeholder="Universidad o centro de formación" value={institucion} />
                {mensaje("institucion")}
              </div>
              <div className="field">
                <label className="field-label" htmlFor="ob-programa">Programa académico</label>
                <input {...campo("programa")} className="field-input" id="ob-programa" maxLength={120} onChange={(event) => { setPrograma(event.target.value); limpiar("programa"); }} placeholder="Por ejemplo, Ingeniería de Software" value={programa} />
                {mensaje("programa")}
              </div>
              <div className="field">
                <label className="field-label" htmlFor="ob-bio">Sobre ti <span className="subtle font-normal">(opcional)</span></label>
                <textarea className="field-input" id="ob-bio" maxLength={300} onChange={(event) => setBiografia(event.target.value)} placeholder="¿Qué te gustaría aprender en AlgoLab?" rows={3} value={biografia} />
                <p className="field-help">{biografia.length}/300</p>
              </div>
              <div className={styles.actions}>
                <button className="btn btn-primary btn-lg" disabled={guardando} type="submit">
                  {guardando ? <><Spinner size={18} /> Guardando…</> : <><Check size={18} /> Guardar y empezar</>}
                </button>
                <button className="btn btn-ghost" disabled={guardando} onClick={() => { setError(""); setErrores({}); setPaso(1); }} type="button"><ArrowLeft size={16} /> Volver</button>
              </div>
            </form>
          )}
        </Swap>
      </div>
    </AuthLayout>
  );
}
