package com.algolab.backend_werb_mr.controladores;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.algolab.backend_werb_mr.dtos.AuthRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.LoginRequest;
import com.algolab.backend_werb_mr.dtos.RegistroUsuarioRequest;
import com.algolab.backend_werb_mr.dtos.UsuarioRespuestaDTO;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.seguridad.JwtServicio;
import com.algolab.backend_werb_mr.servicios.IUsuarioServicio;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioControlador {
    private final IUsuarioServicio usuarioServicio;
    private final JwtServicio jwtServicio;

    public UsuarioControlador(IUsuarioServicio usuarioServicio, JwtServicio jwtServicio) {
        this.usuarioServicio = usuarioServicio;
        this.jwtServicio = jwtServicio;
    }

    @PostMapping(value = "/iniciar-sesion", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AuthRespuestaDTO> iniciarSesion(@RequestBody LoginRequest request) {
        String correo = limpiar(request.getCorreo());
        String contrasena = limpiar(request.getContrasena());

        if (correo == null || contrasena == null) {
            return ResponseEntity.badRequest().body(new AuthRespuestaDTO(
                    false,
                    "Debe enviar correo y contrasena",
                    null,
                    null));
        }

        if (!usuarioServicio.existePorCorreo(correo)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new AuthRespuestaDTO(
                    false,
                    "El usuario no existe en la base de datos",
                    null,
                    null));
        }

        Usuario usuarioEncontrado = usuarioServicio.iniciarSesion(correo, contrasena).orElse(null);

        if (usuarioEncontrado == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new AuthRespuestaDTO(
                    false,
                    "Contrasena incorrecta",
                    null,
                    null));
        }

        return ResponseEntity.ok(new AuthRespuestaDTO(
                true,
                "Inicio de sesion exitoso",
                jwtServicio.generarToken(usuarioEncontrado),
                UsuarioRespuestaDTO.desdeUsuario(usuarioEncontrado)));
    }

    @PostMapping(value = "/registrar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AuthRespuestaDTO> registrarUsuario(@RequestBody RegistroUsuarioRequest request) {
        String nombre = limpiar(request.getNombre());
        String correo = limpiar(request.getCorreo());
        String rolTexto = limpiar(request.getRol());
        String contrasena = limpiar(request.getContrasena());

        if (nombre == null || correo == null || rolTexto == null || contrasena == null) {
            return ResponseEntity.badRequest().body(new AuthRespuestaDTO(
                    false,
                    "Debe enviar nombre, correo, rol y contrasena",
                    null,
                    null));
        }

        Rol rol;
        try {
            rol = Rol.valueOf(rolTexto.toUpperCase());
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(new AuthRespuestaDTO(
                    false,
                    "Rol invalido. Use ESTUDIANTE, DOCENTE o ADMINISTRADOR",
                    null,
                    null));
        }

        if (usuarioServicio.existePorCorreo(correo)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new AuthRespuestaDTO(
                    false,
                    "El usuario ya existe en la base de datos",
                    null,
                    null));
        }

        Usuario usuario = new Usuario(null, nombre, correo, rol, contrasena);
        Usuario usuarioGuardado = usuarioServicio.registrar(usuario);

        return ResponseEntity.status(HttpStatus.CREATED).body(new AuthRespuestaDTO(
                true,
                "Usuario registrado correctamente",
                jwtServicio.generarToken(usuarioGuardado),
                UsuarioRespuestaDTO.desdeUsuario(usuarioGuardado)));
    }

    @GetMapping("/perfil")
    public ResponseEntity<Map<String, Object>> obtenerPerfil(Authentication authentication) {
        List<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        return ResponseEntity.ok(Map.of(
                "correo", authentication.getName(),
                "roles", roles));
    }

    private String limpiar(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }

        return valor.trim();
    }
}
