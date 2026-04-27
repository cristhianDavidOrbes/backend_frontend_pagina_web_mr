package com.algolab.backend_werb_mr.controladores;

import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.servicios.IUsuarioServicio;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioControlador {
    private final IUsuarioServicio usuarioServicio;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public UsuarioControlador(IUsuarioServicio usuarioServicio) {
        this.usuarioServicio = usuarioServicio;
    }

    @PostMapping(value = "/iniciar-sesion", consumes = MediaType.ALL_VALUE)
    public ResponseEntity<Map<String, Object>> iniciarSesion(@RequestBody String body) {
        Map<String, String> datos = leerBody(body);

        if (datos == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "sesionIniciada", false,
                    "mensaje", "JSON invalido"));
        }

        String correo = limpiar(datos.get("correo"));
        String contrasena = limpiar(datos.get("contrasena"));

        if (correo == null || contrasena == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "sesionIniciada", false,
                    "mensaje", "Debe enviar correo y contrasena"));
        }

        Usuario usuarioEncontrado = usuarioServicio.buscarPorCorreo(correo).orElse(null);

        if (usuarioEncontrado == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "sesionIniciada", false,
                    "mensaje", "El usuario no existe en la base de datos"));
        }

        if (!usuarioEncontrado.getContrasena().equals(contrasena)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "sesionIniciada", false,
                    "mensaje", "Contrasena incorrecta"));
        }

        return ResponseEntity.ok(Map.of(
                "sesionIniciada", true,
                "mensaje", "Inicio de sesion exitoso",
                "usuario", usuarioEncontrado));
    }

    @PostMapping(value = "/registrar", consumes = MediaType.ALL_VALUE)
    public ResponseEntity<Map<String, Object>> registrarUsuario(@RequestBody String body) {
        Map<String, String> datos = leerBody(body);

        if (datos == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "registrado", false,
                    "mensaje", "JSON invalido"));
        }

        String nombre = limpiar(datos.get("nombre"));
        String correo = limpiar(datos.get("correo"));
        String rolTexto = limpiar(datos.get("rol"));
        String contrasena = limpiar(datos.get("contrasena"));

        if (nombre == null || correo == null || rolTexto == null || contrasena == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "registrado", false,
                    "mensaje", "Debe enviar nombre, correo, rol y contrasena"));
        }

        Rol rol;
        try {
            rol = Rol.valueOf(rolTexto.toUpperCase());
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(Map.of(
                    "registrado", false,
                    "mensaje", "Rol invalido. Use ESTUDIANTE, DOCENTE o ADMINISTRADOR"));
        }

        if (usuarioServicio.existePorCorreo(correo)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "registrado", false,
                    "mensaje", "El usuario ya existe en la base de datos"));
        }

        Usuario usuario = new Usuario(null, nombre, correo, rol, contrasena);
        Usuario usuarioGuardado = usuarioServicio.guardar(usuario);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "registrado", true,
                "mensaje", "Usuario registrado correctamente",
                "usuario", usuarioGuardado));
    }

    private Map<String, String> leerBody(String body) {
        try {
            return objectMapper.readValue(body, new TypeReference<Map<String, String>>() {
            });
        } catch (JsonProcessingException error) {
            return null;
        }
    }

    private String limpiar(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }

        return valor.trim();
    }
}
