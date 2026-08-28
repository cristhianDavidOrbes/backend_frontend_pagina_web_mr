import type { UsuarioSesion } from "@/lib/use-auth-session";

export type { UsuarioSesion };

export type Nivel = {
  id: number;
  nombre: string;
  descripcion: string;
  objetivo?: string;
  nivel: number;
  activo?: boolean;
};

export type ProgresoNivel = {
  nivel: number;
  completado: boolean;
  puntaje: number;
  tiempoRestante: number;
  intentos: number;
};

export type ProgresoUsuario = {
  usuarioId: number;
  nivelActual: number;
  puntajeTotal: number;
  niveles: ProgresoNivel[];
};

export type ReporteNivel = {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  nivel: number;
  tituloNivel: string;
  puntaje: number;
  tiempoRestante: number;
  intentos: number;
  completado: boolean;
  dominio: number;
  resumen: string;
  fortalezas: string[];
  aspectosMejora: string[];
  recomendaciones: string[];
  evidencias: string[];
  proximoEjercicio: string;
  generadoPorIa: boolean;
  fechaGeneracion: string;
};

export type RankingItem = {
  posicion: number;
  usuarioId: number;
  nombre: string;
  nombreUsuario?: string;
  nivelActual: number;
  puntaje: number;
};

export type Ranking = { total: number; estudiantes: RankingItem[] };
