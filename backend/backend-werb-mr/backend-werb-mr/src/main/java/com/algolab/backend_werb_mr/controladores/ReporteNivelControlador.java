package com.algolab.backend_werb_mr.controladores;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.algolab.backend_werb_mr.dtos.ActualizarReporteIaRequest;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.servicios.IUsuarioServicio;
import com.algolab.backend_werb_mr.servicios.ReporteNivelServicio;

@RestController
@RequestMapping("/api/reportes-nivel")
public class ReporteNivelControlador {
    private final ReporteNivelServicio reporteServicio;
    private final IUsuarioServicio usuarioServicio;

    public ReporteNivelControlador(ReporteNivelServicio reporteServicio, IUsuarioServicio usuarioServicio) {
        this.reporteServicio = reporteServicio;
        this.usuarioServicio = usuarioServicio;
    }

    @GetMapping("/me")
    public ResponseEntity<?> listarPropios(Authentication authentication) {
        Usuario usuario = usuarioAutenticado(authentication);
        if (usuario == null) return noAutorizado();
        return ResponseEntity.ok(reporteServicio.listarUsuario(usuario));
    }

    @GetMapping
    public ResponseEntity<?> listarTodos(Authentication authentication) {
        if (!esDocenteOAdministrador(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("mensaje", "Solo docentes y administradores pueden consultar todos los reportes"));
        }
        return ResponseEntity.ok(reporteServicio.listarTodos());
    }

    @GetMapping("/usuario/{usuarioId}")
    public ResponseEntity<?> listarUsuario(@PathVariable Long usuarioId, Authentication authentication) {
        Usuario solicitado = usuarioServicio.buscarPorId(usuarioId).orElse(null);
        if (solicitado == null) return ResponseEntity.notFound().build();
        Usuario actual = usuarioAutenticado(authentication);
        if (!esDocenteOAdministrador(authentication) && (actual == null || !actual.getId().equals(usuarioId))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("mensaje", "No puede consultar los reportes de otro usuario"));
        }
        return ResponseEntity.ok(reporteServicio.listarUsuario(solicitado));
    }

    @PutMapping(value = "/{nivel}/ia", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> actualizarConIa(@PathVariable Integer nivel,
            @RequestBody ActualizarReporteIaRequest request, Authentication authentication) {
        Usuario usuario = usuarioAutenticado(authentication);
        if (usuario == null) return noAutorizado();
        if (nivel == null || nivel < 1 || nivel > 6 || request == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "mensaje", "El reporte es obligatorio y el nivel debe estar entre 1 y 6"));
        }
        try {
            return ResponseEntity.ok(reporteServicio.actualizarConIa(usuario, nivel, request));
        } catch (IllegalArgumentException error) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("mensaje", error.getMessage()));
        }
    }

    private Usuario usuarioAutenticado(Authentication authentication) {
        if (authentication == null) return null;
        return usuarioServicio.buscarPorCorreo(authentication.getName()).orElse(null);
    }

    private boolean esDocenteOAdministrador(Authentication authentication) {
        if (authentication == null) return false;
        List<String> roles = authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
        return roles.contains("ROLE_" + Rol.DOCENTE.name()) || roles.contains("ROLE_" + Rol.ADMINISTRADOR.name());
    }

    private ResponseEntity<Map<String, String>> noAutorizado() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("mensaje", "Usuario autenticado no encontrado"));
    }
}
