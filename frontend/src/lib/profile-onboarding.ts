import type { UsuarioSesion } from "@/lib/use-auth-session";

// Los datos del servidor, no una marca de este navegador, determinan si el
// perfil necesita las preguntas iniciales. Así también funciona en otro equipo.
export function necesitaCompletarPerfil(usuario: UsuarioSesion): boolean {
  return usuario.rol === "ESTUDIANTE" && (
    !usuario.nombreUsuario?.trim() ||
    !usuario.institucion?.trim() ||
    !usuario.programa?.trim()
  );
}
