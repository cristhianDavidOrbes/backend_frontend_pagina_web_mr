package com.algolab.backend_werb_mr.controladores;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.algolab.backend_werb_mr.dtos.GuardarProgresoOopRequest;
import com.algolab.backend_werb_mr.dtos.ProgresoOopUsuarioDTO;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.servicios.IProgresoOopServicio;

@RestController
@RequestMapping("/api/oop/progreso")
public class ProgresoOopControlador {
    private static final Logger logger = LoggerFactory.getLogger(ProgresoOopControlador.class);
    private static final Map<Integer, Integer> PUNTAJES_POR_NIVEL = Map.of(
            1, 10,
            2, 15,
            3, 20,
            4, 25,
            5, 30,
            6, 25,
            7, 30,
            8, 50);
    private static final Set<String> LENGUAJES_PERMITIDOS = Set.of("python", "java");

    private final IProgresoOopServicio progresoOopServicio;

    public ProgresoOopControlador(IProgresoOopServicio progresoOopServicio) {
        this.progresoOopServicio = progresoOopServicio;
    }

    @GetMapping("/me")
    public ResponseEntity<?> consultarProgreso(Authentication authentication) {
        Usuario usuario = obtenerUsuario(authentication);

        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "mensaje", "Usuario autenticado no encontrado"));
        }

        ProgresoOopUsuarioDTO progreso = progresoOopServicio.consultarProgreso(usuario);
        return ResponseEntity.ok(progreso);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> guardarProgreso(@RequestBody GuardarProgresoOopRequest request,
            Authentication authentication) {
        ResponseEntity<Map<String, String>> error = validar(request);

        if (error != null) {
            return error;
        }

        Usuario usuario = obtenerUsuario(authentication);

        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "mensaje", "Usuario autenticado no encontrado"));
        }

        try {
            ProgresoOopUsuarioDTO progreso = progresoOopServicio.guardarProgreso(usuario, request);
            return ResponseEntity.ok(progreso);
        } catch (IllegalArgumentException excepcion) {
            return ResponseEntity.badRequest().body(Map.of(
                    "mensaje", excepcion.getMessage()));
        }
    }

    private Usuario obtenerUsuario(Authentication authentication) {
        if (authentication == null) {
            logger.warn("No se encontro usuario autenticado al consultar progreso OOP");
            return null;
        }

        return progresoOopServicio.buscarUsuarioAutenticado(authentication.getName()).orElse(null);
    }

    private ResponseEntity<Map<String, String>> validar(GuardarProgresoOopRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "mensaje", "Debe enviar los datos del progreso OOP"));
        }

        if (request.getNivel() == null || !PUNTAJES_POR_NIVEL.containsKey(request.getNivel())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "mensaje", "El nivel OOP debe estar entre 1 y 8"));
        }

        if (request.getPuntaje() == null || request.getPuntaje() < 0) {
            return ResponseEntity.badRequest().body(Map.of(
                    "mensaje", "El puntaje no debe ser negativo"));
        }

        if (request.getIntentos() == null || request.getIntentos() < 0) {
            return ResponseEntity.badRequest().body(Map.of(
                    "mensaje", "Los intentos deben ser mayores o iguales a 0"));
        }

        if (request.getCompletado() == null) {
            request.setCompletado(false);
        }

        String lenguaje = request.getLenguaje() == null
                ? "python"
                : request.getLenguaje().trim().toLowerCase(Locale.ROOT);
        if (!LENGUAJES_PERMITIDOS.contains(lenguaje)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "mensaje", "El lenguaje debe ser python o java"));
        }
        request.setLenguaje(lenguaje);

        int puntajeMaximo = PUNTAJES_POR_NIVEL.get(request.getNivel());
        boolean usoPista = Boolean.TRUE.equals(request.getUsoPista());
        int puntajeEsperado = usoPista ? puntajeMaximo / 2 : puntajeMaximo;
        // La solución completa permite avanzar sin regalar puntos. El servicio
        // sigue exigiendo los prerrequisitos del nivel anterior.
        if (Boolean.TRUE.equals(request.getCompletado())
                && request.getPuntaje() != 0
                && request.getPuntaje() != puntajeEsperado) {
            return ResponseEntity.badRequest().body(Map.of(
                    "mensaje", "El puntaje no corresponde al nivel y al uso de pista"));
        }
        if (!Boolean.TRUE.equals(request.getCompletado()) && request.getPuntaje() != 0) {
            return ResponseEntity.badRequest().body(Map.of(
                    "mensaje", "Un nivel incompleto no puede otorgar puntaje"));
        }

        return null;
    }
}
