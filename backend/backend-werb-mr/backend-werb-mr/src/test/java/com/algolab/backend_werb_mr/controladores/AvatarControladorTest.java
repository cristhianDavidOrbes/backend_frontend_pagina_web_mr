package com.algolab.backend_werb_mr.controladores;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.algolab.backend_werb_mr.dtos.UsuarioSesionDTO;
import com.algolab.backend_werb_mr.modelos.AvatarUsuario;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.servicios.AvatarServicio;
import com.algolab.backend_werb_mr.servicios.IUsuarioServicio;

class AvatarControladorTest {
    private AvatarServicio avatarServicio;
    private IUsuarioServicio usuarioServicio;
    private AvatarControlador controlador;
    private Usuario usuario;
    private Authentication autenticacion;

    @BeforeEach
    void preparar() {
        avatarServicio = mock(AvatarServicio.class);
        usuarioServicio = mock(IUsuarioServicio.class);
        controlador = new AvatarControlador(avatarServicio, usuarioServicio);
        usuario = new Usuario(8L, "Grace", "grace@test.com", Rol.ESTUDIANTE, "hash");
        autenticacion = new UsernamePasswordAuthenticationToken(
                usuario.getCorreo(), null,
                List.of(new SimpleGrantedAuthority("ROLE_ESTUDIANTE")));
        when(usuarioServicio.buscarPorCorreo(usuario.getCorreo())).thenReturn(Optional.of(usuario));
        when(usuarioServicio.buscarPorId(usuario.getId())).thenReturn(Optional.of(usuario));
    }

    @Test
    void putUsaCampoArchivoYDevuelveLaSesionConUrlVersionada() {
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "avatar.png", "image/png", new byte[] { 1, 2, 3 });
        doAnswer(invocacion -> {
            usuario.setAvatarVersion("abc123");
            return null;
        }).when(avatarServicio).guardar(usuario, archivo);

        ResponseEntity<?> respuesta = controlador.actualizarAvatar(archivo, autenticacion);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        UsuarioSesionDTO sesion = assertInstanceOf(UsuarioSesionDTO.class, respuesta.getBody());
        assertEquals("orbita", sesion.getAvatar());
        assertEquals("abc123", sesion.getAvatarVersion());
        assertEquals("/api/usuarios/8/avatar?v=abc123", sesion.getAvatarUrl());
        verify(avatarServicio).guardar(usuario, archivo);
    }

    @Test
    void deleteRestauraElPresetYDevuelveSesionActualizada() {
        usuario.setAvatar("robot");
        usuario.setAvatarVersion("anterior");
        doAnswer(invocacion -> {
            usuario.setAvatarVersion(null);
            return null;
        }).when(avatarServicio).eliminar(usuario);

        ResponseEntity<?> respuesta = controlador.eliminarAvatar(autenticacion);

        UsuarioSesionDTO sesion = assertInstanceOf(UsuarioSesionDTO.class, respuesta.getBody());
        assertEquals("robot", sesion.getAvatar());
        assertNull(sesion.getAvatarUrl());
        assertNull(sesion.getAvatarVersion());
    }

    @Test
    void getEntregaBytesConMimeEtagCacheYNosniff() {
        AvatarUsuario avatar = avatar("etag123", new byte[] { 4, 5, 6 });
        when(avatarServicio.buscarPorUsuarioId(8L)).thenReturn(Optional.of(avatar));

        ResponseEntity<?> respuesta = controlador.obtenerAvatar(8L, null);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals("image/png", respuesta.getHeaders().getContentType().toString());
        assertEquals("\"etag123\"", respuesta.getHeaders().getETag());
        assertEquals("nosniff", respuesta.getHeaders().getFirst("X-Content-Type-Options"));
        assertTrue(respuesta.getHeaders().getCacheControl().contains("no-cache"));
        assertInstanceOf(byte[].class, respuesta.getBody());
    }

    @Test
    void getResponde304CuandoEtagCoincide() {
        AvatarUsuario avatar = avatar("etag123", new byte[] { 4, 5, 6 });
        when(avatarServicio.buscarPorUsuarioId(8L)).thenReturn(Optional.of(avatar));

        ResponseEntity<?> respuesta = controlador.obtenerAvatar(8L, "\"etag123\"");

        assertEquals(HttpStatus.NOT_MODIFIED, respuesta.getStatusCode());
        assertNull(respuesta.getBody());
        assertEquals("\"etag123\"", respuesta.getHeaders().getFirst(HttpHeaders.ETAG));
    }

    @Test
    void getDevuelve404SiElUsuarioNoTieneAvatarPersonalizado() {
        when(avatarServicio.buscarPorUsuarioId(8L)).thenReturn(Optional.empty());

        assertEquals(HttpStatus.NOT_FOUND, controlador.obtenerAvatar(8L, null).getStatusCode());
    }

    @Test
    void putRechazaPeticionSinUsuarioAutenticado() {
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "avatar.png", "image/png", new byte[] { 1 });

        ResponseEntity<?> respuesta = controlador.actualizarAvatar(archivo, null);

        assertEquals(HttpStatus.UNAUTHORIZED, respuesta.getStatusCode());
        Map<?, ?> cuerpo = assertInstanceOf(Map.class, respuesta.getBody());
        assertTrue(cuerpo.containsKey("mensaje"));
    }

    private AvatarUsuario avatar(String etag, byte[] contenido) {
        AvatarUsuario avatar = new AvatarUsuario(usuario);
        avatar.setMimeType("image/png");
        avatar.setContenido(contenido);
        avatar.setEtag(etag);
        avatar.setActualizadoEn(Instant.now());
        return avatar;
    }
}
