package com.algolab.backend_werb_mr.servicios;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.algolab.backend_werb_mr.dtos.GuardarProgresoRequest;
import com.algolab.backend_werb_mr.dtos.ProgresoNivelDTO;
import com.algolab.backend_werb_mr.dtos.ProgresoUsuarioDTO;
import com.algolab.backend_werb_mr.modelos.DescripcionNivel;
import com.algolab.backend_werb_mr.modelos.ProgresoNivel;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.IProgresoNivelRepositorio;

@Service
public class ProgresoServicio implements IProgresoServicio {
    private static final Logger logger = LoggerFactory.getLogger(ProgresoServicio.class);
    private static final Map<Integer, Integer> PUNTAJE_MAXIMO_POR_NIVEL = Map.of(
            1, 80,
            2, 240,
            3, 100,
            4, 255,
            5, 300,
            6, 300);
    private static final Map<Integer, Integer> TIEMPO_MAXIMO_POR_NIVEL = Map.of(
            1, 80,
            2, 240,
            3, 300,
            4, 300,
            5, 600,
            6, 600);
    private static final int INTENTOS_MAXIMOS = 10_000;

    private final IProgresoNivelRepositorio progresoNivelRepositorio;
    private final IUsuarioServicio usuarioServicio;
    private final IDescripcionNivelServicio descripcionNivelServicio;
    private final ReporteNivelServicio reporteNivelServicio;
    private final com.algolab.backend_werb_mr.repositorio.IProgresoOopRepositorio progresoOopRepositorio;

    @Autowired
    public ProgresoServicio(
            IProgresoNivelRepositorio progresoNivelRepositorio,
            IUsuarioServicio usuarioServicio,
            IDescripcionNivelServicio descripcionNivelServicio,
            ReporteNivelServicio reporteNivelServicio,
            com.algolab.backend_werb_mr.repositorio.IProgresoOopRepositorio progresoOopRepositorio) {
        this.progresoNivelRepositorio = progresoNivelRepositorio;
        this.usuarioServicio = usuarioServicio;
        this.descripcionNivelServicio = descripcionNivelServicio;
        this.reporteNivelServicio = reporteNivelServicio;
        this.progresoOopRepositorio = progresoOopRepositorio;
    }

    public ProgresoServicio(
            IProgresoNivelRepositorio progresoNivelRepositorio,
            IUsuarioServicio usuarioServicio,
            IDescripcionNivelServicio descripcionNivelServicio) {
        this(progresoNivelRepositorio, usuarioServicio, descripcionNivelServicio, null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Usuario> buscarUsuarioAutenticado(String correo) {
        Optional<Usuario> usuario = usuarioServicio.buscarPorCorreo(correo);

        if (usuario.isEmpty()) {
            logger.warn("No se encontro usuario autenticado con correo {}", correo);
        }

        return usuario;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Usuario> buscarUsuarioPorId(Long id) {
        return usuarioServicio.buscarPorId(id);
    }

    @Override
    @Transactional(readOnly = true)
    public ProgresoUsuarioDTO consultarProgreso(Usuario usuario) {
        logger.info("Consultando progreso del usuario {}", usuario.getId());
        List<ProgresoNivel> progresos = progresoNivelRepositorio.findByUsuarioOrderByNivelAsc(usuario);
        return construirRespuesta(usuario, progresos);
    }

    @Override
    @Transactional
    public ProgresoUsuarioDTO guardarProgreso(Usuario usuario, GuardarProgresoRequest request) {
        validarProgresoRecibido(usuario, request);
        logger.info("Guardando progreso del usuario {} en nivel {}", usuario.getId(), request.getNivel());

        Optional<ProgresoNivel> progresoExistente = progresoNivelRepositorio
                .findByUsuarioAndNivel(usuario, request.getNivel());

        boolean yaCompletado = progresoExistente
                .map(ProgresoNivel::getCompletado)
                .map(Boolean.TRUE::equals)
                .orElse(false);
        validarPrerequisito(usuario, request, yaCompletado);

        ProgresoNivel progreso = progresoExistente
                .orElseGet(() -> crearProgreso(usuario, request.getNivel()));

        boolean completadoNuevo = Boolean.TRUE.equals(request.getCompletado());

        progreso.setCompletado(yaCompletado || completadoNuevo);
        progreso.setPuntaje(Math.max(progreso.getPuntaje(), request.getPuntaje()));
        progreso.setTiempoRestante(Math.max(progreso.getTiempoRestante(), request.getTiempoRestante()));
        progreso.setIntentos(calcularIntentos(progreso.getIntentos(), request.getIntentos()));
        progreso.setFechaUltimoIntento(LocalDateTime.now());

        if (!yaCompletado && completadoNuevo) {
            progreso.setFechaCompletado(LocalDateTime.now());
        }

        progresoNivelRepositorio.save(progreso);

        List<ProgresoNivel> progresos = progresoNivelRepositorio.findByUsuarioOrderByNivelAsc(usuario);
        int puntajePrincipal = calcularPuntajeTotal(progresos);
        int puntajeOop = progresoOopRepositorio != null ? progresoOopRepositorio.calcularPuntajeTotalOop(usuario) : 0;
        int puntajeTotal = puntajePrincipal + puntajeOop;
        usuario.setPuntaje(puntajeTotal);

        if (completadoNuevo) {
            actualizarNivelActual(usuario, request.getNivel());
        }

        usuarioServicio.actualizar(usuario);
        if (reporteNivelServicio != null) {
            reporteNivelServicio.sincronizarDesdeProgreso(usuario, progreso);
        }
        return construirRespuesta(usuario, progresos);
    }

    private void validarProgresoRecibido(Usuario usuario, GuardarProgresoRequest request) {
        if (usuario == null) {
            throw new IllegalArgumentException("Usuario no válido");
        }
        if (request == null || request.getNivel() == null
                || request.getNivel() < 1 || request.getNivel() > 6) {
            throw new IllegalArgumentException("El nivel debe estar entre 1 y 6");
        }

        int nivel = request.getNivel();
        Integer puntaje = request.getPuntaje();
        Integer tiempo = request.getTiempoRestante();
        Integer intentos = request.getIntentos();
        int puntajeMaximo = PUNTAJE_MAXIMO_POR_NIVEL.get(nivel);
        int tiempoMaximo = TIEMPO_MAXIMO_POR_NIVEL.get(nivel);

        if (puntaje == null || puntaje < 0 || puntaje > puntajeMaximo) {
            throw new IllegalArgumentException(
                    "El puntaje del nivel " + nivel + " debe estar entre 0 y " + puntajeMaximo);
        }
        if (tiempo == null || tiempo < 0 || tiempo > tiempoMaximo) {
            throw new IllegalArgumentException(
                    "El tiempo restante del nivel " + nivel + " debe estar entre 0 y " + tiempoMaximo);
        }
        if (intentos == null || intentos < 0 || intentos > INTENTOS_MAXIMOS) {
            throw new IllegalArgumentException(
                    "Los intentos deben estar entre 0 y " + INTENTOS_MAXIMOS);
        }
        if (request.getCompletado() == null) {
            request.setCompletado(false);
        }
    }

    private void validarPrerequisito(Usuario usuario, GuardarProgresoRequest request, boolean yaCompletado) {
        if (!Boolean.TRUE.equals(request.getCompletado()) || yaCompletado || request.getNivel() <= 1) {
            return;
        }

        int nivelAnterior = request.getNivel() - 1;
        boolean anteriorCompletado = progresoNivelRepositorio
                .findByUsuarioAndNivel(usuario, nivelAnterior)
                .map(ProgresoNivel::getCompletado)
                .map(Boolean.TRUE::equals)
                .orElse(false);

        if (!anteriorCompletado) {
            throw new IllegalArgumentException(
                    "Debes completar el nivel " + nivelAnterior + " antes de completar el nivel "
                            + request.getNivel());
        }
    }

    private ProgresoNivel crearProgreso(Usuario usuario, Integer nivel) {
        ProgresoNivel progreso = new ProgresoNivel();
        progreso.setUsuario(usuario);
        progreso.setNivel(nivel);
        return progreso;
    }

    private int calcularIntentos(Integer intentosActuales, Integer intentosRequest) {
        int actuales = intentosActuales == null ? 0 : intentosActuales;
        int enviados = intentosRequest == null ? 0 : intentosRequest;
        // El cliente envía el contador absoluto. Reenviar el mismo resultado no
        // constituye un intento nuevo y no debe crear una falsa deficiencia.
        return Math.max(actuales, enviados);
    }

    private int calcularPuntajeTotal(List<ProgresoNivel> progresos) {
        return progresos.stream()
                .filter(progreso -> Boolean.TRUE.equals(progreso.getCompletado()))
                .mapToInt(ProgresoNivel::getPuntaje)
                .sum();
    }

    private void actualizarNivelActual(Usuario usuario, Integer nivelCompletado) {
        int nivelSiguiente = nivelCompletado + 1;
        int maximoNivel = descripcionNivelServicio.listar().stream()
                .map(DescripcionNivel::getNivel)
                .filter(nivel -> nivel != null && nivel >= 1)
                .mapToInt(Integer::intValue)
                .max()
                .orElse(nivelSiguiente);

        int nuevoNivelActual = Math.min(nivelSiguiente, maximoNivel);

        if (nuevoNivelActual > usuario.getNivelActual()) {
            logger.info("Actualizando nivelActual del usuario {} de {} a {}",
                    usuario.getId(),
                    usuario.getNivelActual(),
                    nuevoNivelActual);
            usuario.setNivelActual(nuevoNivelActual);
        }
    }

    private ProgresoUsuarioDTO construirRespuesta(Usuario usuario, List<ProgresoNivel> progresos) {
        List<ProgresoNivelDTO> niveles = progresos.stream()
                .map(ProgresoNivelDTO::desdeModelo)
                .toList();

        int puntajePrincipal = calcularPuntajeTotal(progresos);
        int puntajeOop = progresoOopRepositorio != null ? progresoOopRepositorio.calcularPuntajeTotalOop(usuario) : 0;

        return new ProgresoUsuarioDTO(
                usuario.getId(),
                usuario.getNivelActual(),
                puntajePrincipal + puntajeOop,
                niveles);
    }
}
