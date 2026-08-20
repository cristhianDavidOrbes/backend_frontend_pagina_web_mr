package com.algolab.backend_werb_mr.controladores;

import java.util.Arrays;
import java.util.Map;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.algolab.backend_werb_mr.dtos.UsuarioSesionDTO;
import com.algolab.backend_werb_mr.modelos.AvatarUsuario;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.servicios.AvatarInvalidoException;
import com.algolab.backend_werb_mr.servicios.AvatarServicio;
import com.algolab.backend_werb_mr.servicios.IUsuarioServicio;

@RestController
@RequestMapping("/api/usuarios")
public class AvatarControlador {
    private final AvatarServicio avatarServicio;
    private final IUsuarioServicio usuarioServicio;

    public AvatarControlador(AvatarServicio avatarServicio, IUsuarioServicio usuarioServicio) {
        this.avatarServicio = avatarServicio;
        this.usuarioServicio = usuarioServicio;
    }

    @PutMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> actualizarAvatar(@RequestPart("archivo") MultipartFile archivo,
            Authentication authentication) {
        Usuario usuario = usuarioAutenticado(authentication);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "mensaje", "Usuario autenticado no encontrado"));
        }

        try {
            avatarServicio.guardar(usuario, archivo);
            Usuario actualizado = usuarioServicio.buscarPorId(usuario.getId()).orElse(usuario);
            return ResponseEntity.ok(UsuarioSesionDTO.desdeUsuario(actualizado));
        } catch (AvatarInvalidoException error) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", error.getMessage()));
        }
    }

    @DeleteMapping("/me/avatar")
    public ResponseEntity<?> eliminarAvatar(Authentication authentication) {
        Usuario usuario = usuarioAutenticado(authentication);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "mensaje", "Usuario autenticado no encontrado"));
        }

        avatarServicio.eliminar(usuario);
        Usuario actualizado = usuarioServicio.buscarPorId(usuario.getId()).orElse(usuario);
        return ResponseEntity.ok(UsuarioSesionDTO.desdeUsuario(actualizado));
    }

    @GetMapping("/{id}/avatar")
    public ResponseEntity<?> obtenerAvatar(@PathVariable Long id,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch) {
        AvatarUsuario avatar = avatarServicio.buscarPorUsuarioId(id).orElse(null);
        if (avatar == null) {
            return ResponseEntity.notFound().build();
        }

        HttpHeaders encabezados = encabezadosAvatar(avatar);
        if (coincideEtag(ifNoneMatch, avatar.getEtag())) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).headers(encabezados).build();
        }

        return ResponseEntity.ok()
                .headers(encabezados)
                .body(avatar.getContenido());
    }

    private Usuario usuarioAutenticado(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return usuarioServicio.buscarPorCorreo(authentication.getName()).orElse(null);
    }

    private HttpHeaders encabezadosAvatar(AvatarUsuario avatar) {
        HttpHeaders encabezados = new HttpHeaders();
        encabezados.setContentType(MediaType.parseMediaType(avatar.getMimeType()));
        encabezados.setContentLength(avatar.getContenido().length);
        encabezados.setETag('"' + avatar.getEtag() + '"');
        // Es una foto de perfil: debe revalidarse y nunca almacenarse en una caché pública.
        encabezados.setCacheControl(CacheControl.noCache().cachePrivate());
        encabezados.set("X-Content-Type-Options", "nosniff");
        return encabezados;
    }

    private boolean coincideEtag(String encabezado, String etag) {
        if (encabezado == null || encabezado.isBlank()) {
            return false;
        }
        String esperado = '"' + etag + '"';
        return Arrays.stream(encabezado.split(","))
                .map(String::trim)
                .anyMatch(valor -> valor.equals("*") || valor.equals(etag) || valor.equals(esperado));
    }
}
