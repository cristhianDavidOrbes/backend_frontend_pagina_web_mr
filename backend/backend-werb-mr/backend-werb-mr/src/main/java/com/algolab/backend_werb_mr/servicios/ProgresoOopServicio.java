package com.algolab.backend_werb_mr.servicios;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.algolab.backend_werb_mr.dtos.GuardarProgresoOopRequest;
import com.algolab.backend_werb_mr.dtos.ProgresoOopDTO;
import com.algolab.backend_werb_mr.dtos.ProgresoOopUsuarioDTO;
import com.algolab.backend_werb_mr.modelos.ProgresoNivel;
import com.algolab.backend_werb_mr.modelos.ProgresoOop;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.IProgresoNivelRepositorio;
import com.algolab.backend_werb_mr.repositorio.IProgresoOopRepositorio;

@Service
public class ProgresoOopServicio implements IProgresoOopServicio {
    private static final Logger logger = LoggerFactory.getLogger(ProgresoOopServicio.class);

    private final IProgresoOopRepositorio progresoOopRepositorio;
    private final IProgresoNivelRepositorio progresoNivelRepositorio;
    private final IUsuarioServicio usuarioServicio;

    @Autowired
    public ProgresoOopServicio(
            IProgresoOopRepositorio progresoOopRepositorio,
            IProgresoNivelRepositorio progresoNivelRepositorio,
            IUsuarioServicio usuarioServicio) {
        this.progresoOopRepositorio = progresoOopRepositorio;
        this.progresoNivelRepositorio = progresoNivelRepositorio;
        this.usuarioServicio = usuarioServicio;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Usuario> buscarUsuarioAutenticado(String correo) {
        return usuarioServicio.buscarPorCorreo(correo);
    }

    @Override
    @Transactional(readOnly = true)
    public ProgresoOopUsuarioDTO consultarProgreso(Usuario usuario) {
        logger.info("Consultando progreso OOP del usuario {}", usuario.getId());
        List<ProgresoOop> progresos = progresoOopRepositorio.findByUsuarioOrderByNivelAsc(usuario);
        return construirRespuesta(usuario, progresos);
    }

    @Override
    @Transactional
    public ProgresoOopUsuarioDTO guardarProgreso(Usuario usuario, GuardarProgresoOopRequest request) {
        logger.info("Guardando progreso OOP del usuario {} en nivel {}", usuario.getId(), request.getNivel());

        ProgresoOop progreso = progresoOopRepositorio
                .findByUsuarioAndNivel(usuario, request.getNivel())
                .orElseGet(() -> crearProgreso(usuario, request.getNivel()));

        boolean yaCompletado = Boolean.TRUE.equals(progreso.getCompletado());
        boolean completadoNuevo = Boolean.TRUE.equals(request.getCompletado());

        progreso.setCompletado(yaCompletado || completadoNuevo);
        progreso.setPuntaje(Math.max(progreso.getPuntaje(), request.getPuntaje() == null ? 0 : request.getPuntaje()));
        progreso.setIntentos(calcularIntentos(progreso.getIntentos(), request.getIntentos()));
        if (request.getUsoPista() != null && request.getUsoPista()) {
            progreso.setUsoPista(true);
        }
        if (request.getLenguaje() != null && !request.getLenguaje().isBlank()) {
            progreso.setLenguaje(request.getLenguaje());
        }
        progreso.setFechaUltimoIntento(LocalDateTime.now());

        if (!yaCompletado && completadoNuevo) {
            progreso.setFechaCompletado(LocalDateTime.now());
        }

        progresoOopRepositorio.save(progreso);

        // Recalcular puntaje global sumando niveles principales + OOP
        List<ProgresoOop> progresosOop = progresoOopRepositorio.findByUsuarioOrderByNivelAsc(usuario);
        int puntajeOopTotal = calcularPuntajeTotalOop(progresosOop);

        List<ProgresoNivel> progresosPrincipales = progresoNivelRepositorio.findByUsuarioOrderByNivelAsc(usuario);
        int puntajePrincipalTotal = progresosPrincipales.stream()
                .filter(p -> Boolean.TRUE.equals(p.getCompletado()))
                .mapToInt(ProgresoNivel::getPuntaje)
                .sum();

        int puntajeGlobal = puntajePrincipalTotal + puntajeOopTotal;
        usuario.setPuntaje(puntajeGlobal);
        usuarioServicio.actualizar(usuario);

        return construirRespuesta(usuario, progresosOop);
    }

    @Override
    @Transactional(readOnly = true)
    public int obtenerPuntajeOopTotal(Usuario usuario) {
        return progresoOopRepositorio.calcularPuntajeTotalOop(usuario);
    }

    private ProgresoOop crearProgreso(Usuario usuario, Integer nivel) {
        ProgresoOop progreso = new ProgresoOop();
        progreso.setUsuario(usuario);
        progreso.setNivel(nivel);
        return progreso;
    }

    private int calcularIntentos(Integer intentosActuales, Integer intentosRequest) {
        int actuales = intentosActuales == null ? 0 : intentosActuales;
        int enviados = intentosRequest == null ? 0 : intentosRequest;

        if (actuales == 0) {
            return enviados;
        }

        return Math.max(actuales + 1, enviados);
    }

    private int calcularPuntajeTotalOop(List<ProgresoOop> progresos) {
        return progresos.stream()
                .filter(progreso -> Boolean.TRUE.equals(progreso.getCompletado()))
                .mapToInt(ProgresoOop::getPuntaje)
                .sum();
    }

    private ProgresoOopUsuarioDTO construirRespuesta(Usuario usuario, List<ProgresoOop> progresos) {
        List<ProgresoOopDTO> niveles = progresos.stream()
                .map(ProgresoOopDTO::desdeModelo)
                .toList();

        int puntajeOop = calcularPuntajeTotalOop(progresos);

        return new ProgresoOopUsuarioDTO(
                usuario.getId(),
                puntajeOop,
                usuario.getPuntaje(),
                niveles);
    }
}
