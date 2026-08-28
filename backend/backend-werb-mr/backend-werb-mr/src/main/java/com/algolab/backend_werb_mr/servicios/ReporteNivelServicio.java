package com.algolab.backend_werb_mr.servicios;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.algolab.backend_werb_mr.dtos.ActualizarReporteIaRequest;
import com.algolab.backend_werb_mr.dtos.ReporteNivelDTO;
import com.algolab.backend_werb_mr.modelos.ProgresoNivel;
import com.algolab.backend_werb_mr.modelos.ReporteNivel;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.IReporteNivelRepositorio;

@Service
public class ReporteNivelServicio {
    private final IReporteNivelRepositorio repositorio;
    private final ConfiguracionTutorNivelServicio configuracionTutor;

    public ReporteNivelServicio(IReporteNivelRepositorio repositorio,
            ConfiguracionTutorNivelServicio configuracionTutor) {
        this.repositorio = repositorio;
        this.configuracionTutor = configuracionTutor;
    }

    @Transactional
    public ReporteNivelDTO sincronizarDesdeProgreso(Usuario usuario, ProgresoNivel progreso) {
        Optional<ReporteNivel> existente = repositorio.findByUsuarioAndNivel(usuario, progreso.getNivel());

        int puntaje = Math.max(0, progreso.getPuntaje());
        int intentos = Math.max(1, progreso.getIntentos());
        var config = configuracionTutor.buscarModelo(progreso.getNivel());
        int puntajeMaximo = config == null ? 100 : config.getPuntajeMaximo();
        int dominio = Math.max(0, Math.min(100,
                Math.round((puntaje * 100f) / Math.max(1, puntajeMaximo))));
        boolean completado = Boolean.TRUE.equals(progreso.getCompletado());
        int tiempoRestante = Math.max(0, progreso.getTiempoRestante());

        // Unity puede reenviar el mismo progreso al cerrar o recuperar conexión.
        // Una sincronización idéntica no debe borrar un informe ya enriquecido por IA.
        if (existente.isPresent()
                && Boolean.TRUE.equals(existente.get().getGeneradoPorIa())
                && mismasMetricas(existente.get(), puntaje, tiempoRestante, intentos, completado)) {
            return ReporteNivelDTO.desdeModelo(existente.get());
        }

        ReporteNivel reporte = existente.orElseGet(ReporteNivel::new);

        reporte.setUsuario(usuario);
        reporte.setNivel(progreso.getNivel());
        reporte.setTituloNivel(tituloNivel(progreso.getNivel()));
        reporte.setPuntaje(puntaje);
        reporte.setTiempoRestante(tiempoRestante);
        reporte.setIntentos(intentos);
        reporte.setCompletado(completado);
        reporte.setDominio(dominio);
        reporte.setResumen(resumenBase(completado, dominio, progreso.getNivel()));
        reporte.setFortalezas(String.join("\n", fortalezasBase(completado, dominio, intentos)));
        reporte.setAspectosMejora(String.join("\n", mejorasBase(completado, dominio, intentos)));
        reporte.setRecomendaciones(String.join("\n", recomendacionesBase(progreso.getNivel(), dominio)));
        reporte.setEvidencias(String.join("\n", evidenciasBase(puntaje, puntajeMaximo, tiempoRestante, intentos, completado)));
        reporte.setProximoEjercicio(config == null ? proximoEjercicioBase(progreso.getNivel()) : config.getProximoEjercicio());
        reporte.setGeneradoPorIa(false);
        reporte.setFechaGeneracion(LocalDateTime.now());
        return ReporteNivelDTO.desdeModelo(repositorio.save(reporte));
    }

    @Transactional
    public ReporteNivelDTO actualizarConIa(Usuario usuario, Integer nivel, ActualizarReporteIaRequest request) {
        ReporteNivel reporte = repositorio.findByUsuarioAndNivel(usuario, nivel)
                .orElseThrow(() -> new IllegalArgumentException("Primero debe guardarse el progreso del nivel"));

        validarVersionMetricas(reporte, request);

        if (request.getDominio() != null) {
            reporte.setDominio(Math.max(0, Math.min(100, request.getDominio())));
        }
        if (textoValido(request.getResumen())) reporte.setResumen(limitar(request.getResumen(), 2000));
        if (listaValida(request.getFortalezas())) reporte.setFortalezas(unir(request.getFortalezas()));
        // Una lista vacía es una respuesta válida: significa que no hay evidencia
        // de deficiencias. No se conserva una debilidad genérica del reporte base.
        if (request.getAspectosMejora() != null) reporte.setAspectosMejora(unir(request.getAspectosMejora()));
        if (listaValida(request.getRecomendaciones())) reporte.setRecomendaciones(unir(request.getRecomendaciones()));
        if (listaValida(request.getEvidencias())) reporte.setEvidencias(unir(request.getEvidencias()));
        if (textoValido(request.getProximoEjercicio())) reporte.setProximoEjercicio(limitar(request.getProximoEjercicio(), 1000));
        reporte.setGeneradoPorIa(true);
        reporte.setFechaGeneracion(LocalDateTime.now());
        return ReporteNivelDTO.desdeModelo(repositorio.save(reporte));
    }

    private static void validarVersionMetricas(ReporteNivel reporte, ActualizarReporteIaRequest request) {
        if (request.getPuntajeBase() == null
                || request.getTiempoRestanteBase() == null
                || request.getIntentosBase() == null
                || request.getCompletadoBase() == null) {
            throw new IllegalArgumentException("Las métricas base del reporte son obligatorias");
        }

        if (!Objects.equals(reporte.getPuntaje(), request.getPuntajeBase())
                || !Objects.equals(reporte.getTiempoRestante(), request.getTiempoRestanteBase())
                || !Objects.equals(reporte.getIntentos(), request.getIntentosBase())
                || !Objects.equals(reporte.getCompletado(), request.getCompletadoBase())) {
            throw new IllegalArgumentException(
                    "El progreso cambió mientras se generaba el informe; genere nuevamente el reporte");
        }
    }

    @Transactional(readOnly = true)
    public List<ReporteNivelDTO> listarUsuario(Usuario usuario) {
        return repositorio.findByUsuarioOrderByNivelAsc(usuario).stream()
                .map(ReporteNivelDTO::desdeModelo).toList();
    }

    @Transactional(readOnly = true)
    public List<ReporteNivelDTO> listarTodos() {
        return repositorio.findAllByOrderByFechaGeneracionDesc().stream()
                .map(ReporteNivelDTO::desdeModelo).toList();
    }

    private static String unir(List<String> valores) {
        return valores.stream().filter(ReporteNivelServicio::textoValido)
                .map(valor -> limitar(valor, 400)).distinct().limit(5)
                .reduce((a, b) -> a + "\n" + b).orElse("");
    }

    private static String limitar(String valor, int maximo) {
        String limpio = valor == null ? "" : valor.trim().replaceAll("\\s+", " ");
        return limpio.length() <= maximo ? limpio : limpio.substring(0, maximo);
    }

    private static boolean textoValido(String valor) {
        return valor != null && !valor.isBlank();
    }

    private static boolean listaValida(List<String> valores) {
        return valores != null && valores.stream().anyMatch(ReporteNivelServicio::textoValido);
    }

    private static boolean mismasMetricas(ReporteNivel reporte, int puntaje, int tiempoRestante,
            int intentos, boolean completado) {
        return Objects.equals(reporte.getPuntaje(), puntaje)
                && Objects.equals(reporte.getTiempoRestante(), tiempoRestante)
                && Objects.equals(reporte.getIntentos(), intentos)
                && Objects.equals(reporte.getCompletado(), completado);
    }

    private static String tituloNivel(int nivel) {
        return switch (nivel) {
            case 1 -> "Clases y objetos";
            case 2 -> "Atributos y métodos";
            case 3 -> "Encapsulamiento";
            case 4 -> "Abstracción";
            case 5 -> "Herencia";
            case 6 -> "Polimorfismo";
            default -> "Programación orientada a objetos";
        };
    }

    private static String resumenBase(boolean completado, int dominio, int nivel) {
        if (!completado) return "El intento del nivel " + nivel + " quedó incompleto. Conviene repetir la práctica con calma.";
        if (dominio >= 85) return "Completó el nivel con un dominio sólido y decisiones consistentes.";
        if (dominio >= 65) return "Completó el nivel y comprende la idea principal, aunque todavía puede ganar precisión.";
        return "Completó el nivel, pero necesita reforzar el concepto antes de avanzar con confianza.";
    }

    private static List<String> fortalezasBase(boolean completado, int dominio, int intentos) {
        if (!completado) return List.of("Persistencia para intentar resolver el reto");
        if (dominio >= 85 && intentos <= 1) return List.of("Comprensión conceptual", "Resolución eficiente", "Buena toma de decisiones");
        if (dominio >= 65) return List.of("Reconoce los elementos principales", "Logró completar la práctica");
        return List.of("Persistencia", "Capacidad para completar el reto");
    }

    private static List<String> mejorasBase(boolean completado, int dominio, int intentos) {
        if (!completado) return List.of("Completar la secuencia del reto", "Revisar la explicación del nivel");
        if (dominio >= 85 && intentos <= 1) return List.of();
        if (intentos > 2) return List.of("Reducir intentos mediante una estrategia previa", "Distinguir mejor las opciones del escenario");
        return dominio < 65
                ? List.of("Diferenciar conceptos similares", "Justificar cada acción antes de ejecutarla")
                : List.of("Mejorar precisión y tiempo de respuesta");
    }

    private static List<String> recomendacionesBase(int nivel, int dominio) {
        String concepto = tituloNivel(nivel).toLowerCase();
        if (dominio >= 85) return List.of("Explica " + concepto + " con un ejemplo propio", "Intenta el siguiente nivel sin ayudas");
        return List.of("Repite el tema de " + concepto, "Describe en voz alta por qué cada acción es correcta", "Vuelve a intentar el reto buscando menos errores");
    }

    private static List<String> evidenciasBase(int puntaje, int maximo, int tiempo, int intentos, boolean completado) {
        return List.of(
                completado ? "Completó la práctica" : "La práctica quedó incompleta",
                "Obtuvo " + puntaje + " de " + maximo + " puntos",
                "Realizó " + intentos + (intentos == 1 ? " intento" : " intentos"),
                "Terminó con " + tiempo + " segundos disponibles");
    }

    private static String proximoEjercicioBase(int nivel) {
        return "Resuelve una situación nueva de " + tituloNivel(nivel).toLowerCase()
                + " y explica qué evidencia demuestra que tu decisión es correcta.";
    }
}
