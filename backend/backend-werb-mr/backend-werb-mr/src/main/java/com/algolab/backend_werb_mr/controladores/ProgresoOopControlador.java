package com.algolab.backend_werb_mr.controladores;

import java.util.Map;

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

        ProgresoOopUsuarioDTO progreso = progresoOopServicio.guardarProgreso(usuario, request);
        return ResponseEntity.ok(progreso);
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

        if (request.getNivel() == null || request.getNivel() < 1) {
            return ResponseEntity.badRequest().body(Map.of(
                    "mensaje", "El nivel debe ser mayor o igual a 1"));
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

        return null;
    }
}
