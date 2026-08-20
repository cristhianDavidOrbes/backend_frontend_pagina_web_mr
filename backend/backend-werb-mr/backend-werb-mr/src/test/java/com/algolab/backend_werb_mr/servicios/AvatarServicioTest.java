package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Optional;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import com.algolab.backend_werb_mr.modelos.AvatarUsuario;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.IAvatarUsuarioRepositorio;

class AvatarServicioTest {
    private IAvatarUsuarioRepositorio avatarRepositorio;
    private IUsuarioServicio usuarioServicio;
    private AvatarServicio servicio;
    private Usuario usuario;

    @BeforeEach
    void preparar() {
        avatarRepositorio = mock(IAvatarUsuarioRepositorio.class);
        usuarioServicio = mock(IUsuarioServicio.class);
        servicio = new AvatarServicio(avatarRepositorio, usuarioServicio);
        usuario = new Usuario(7L, "Ada", "ada@test.com", Rol.ESTUDIANTE, "hash");

        when(avatarRepositorio.save(any(AvatarUsuario.class)))
                .thenAnswer(invocacion -> invocacion.getArgument(0));
        when(usuarioServicio.actualizar(any(Usuario.class)))
                .thenAnswer(invocacion -> invocacion.getArgument(0));
    }

    @Test
    void normalizaUnaImagenGrandeAUnMaximoDe512YSinMetadatos() throws Exception {
        byte[] png = crearPng(1200, 800, true);
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "avatar.png", "image/png", png);

        AvatarUsuario avatar = servicio.guardar(usuario, archivo);
        BufferedImage resultado = ImageIO.read(new ByteArrayInputStream(avatar.getContenido()));

        assertEquals("image/png", avatar.getMimeType());
        assertEquals(512, resultado.getWidth());
        assertTrue(resultado.getHeight() <= 512);
        assertEquals(64, avatar.getEtag().length());
        assertEquals(avatar.getEtag(), usuario.getAvatarVersion());
        assertNotNull(avatar.getActualizadoEn());
        verify(avatarRepositorio).save(avatar);
        verify(usuarioServicio).actualizar(usuario);
    }

    @Test
    void reencodaJpegYNoConfiaEnElContentTypeDeclarado() throws Exception {
        byte[] jpeg = crearJpeg(320, 200);
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "avatar.txt", "text/plain", jpeg);

        AvatarUsuario avatar = servicio.guardar(usuario, archivo);

        assertEquals("image/jpeg", avatar.getMimeType());
        assertNotNull(ImageIO.read(new ByteArrayInputStream(avatar.getContenido())));
    }

    @Test
    void rechazaContenidoQueNoEsImagenAunqueDeclareMimeDeImagen() {
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "falso.png", "image/png", "no-es-una-imagen".getBytes());

        AvatarInvalidoException error = assertThrows(
                AvatarInvalidoException.class,
                () -> servicio.guardar(usuario, archivo));

        assertTrue(error.getMessage().contains("imagen válida"));
        verify(avatarRepositorio, never()).save(any());
    }

    @Test
    void rechazaSvgInclusoSiEsUnaImagen() {
        String svg = "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>";
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "avatar.svg", "image/svg+xml", svg.getBytes());

        assertThrows(AvatarInvalidoException.class, () -> servicio.guardar(usuario, archivo));
        verify(avatarRepositorio, never()).save(any());
    }

    @Test
    void rechazaArchivoMayorAUnMegabyteAntesDeDecodificar() {
        byte[] demasiadoGrande = new byte[(int) AvatarServicio.TAMANO_MAXIMO_ENTRADA + 1];
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "grande.png", "image/png", demasiadoGrande);

        AvatarInvalidoException error = assertThrows(
                AvatarInvalidoException.class,
                () -> servicio.guardar(usuario, archivo));

        assertEquals("La imagen no puede superar 10 MB", error.getMessage());
        verify(avatarRepositorio, never()).save(any());
    }

    @Test
    void reemplazaElAvatarExistenteEnLugarDeCrearOtro() throws Exception {
        AvatarUsuario existente = new AvatarUsuario(usuario);
        existente.setContenido(new byte[] { 1 });
        when(avatarRepositorio.findById(usuario.getId())).thenReturn(Optional.of(existente));
        MockMultipartFile archivo = new MockMultipartFile(
                "archivo", "avatar.png", "image/png", crearPng(64, 64, false));

        AvatarUsuario guardado = servicio.guardar(usuario, archivo);

        assertEquals(existente, guardado);
        assertTrue(guardado.getContenido().length > 1);
        verify(avatarRepositorio).save(existente);
    }

    @Test
    void eliminarEsIdempotenteYRestauraElFallback() {
        usuario.setAvatarVersion("version-anterior");
        when(avatarRepositorio.findById(usuario.getId()))
                .thenReturn(Optional.empty());

        servicio.eliminar(usuario);

        assertEquals(null, usuario.getAvatarVersion());
        verify(avatarRepositorio, never()).delete(any());
        verify(usuarioServicio).actualizar(usuario);
    }

    private byte[] crearPng(int ancho, int alto, boolean transparencia) throws Exception {
        int tipo = transparencia ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
        BufferedImage imagen = new BufferedImage(ancho, alto, tipo);
        Graphics2D graficos = imagen.createGraphics();
        graficos.setColor(transparencia ? new Color(20, 140, 210, 180) : Color.BLUE);
        graficos.fillRect(0, 0, ancho, alto);
        graficos.dispose();
        try (ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            ImageIO.write(imagen, "png", salida);
            return salida.toByteArray();
        }
    }

    private byte[] crearJpeg(int ancho, int alto) throws Exception {
        BufferedImage imagen = new BufferedImage(ancho, alto, BufferedImage.TYPE_INT_RGB);
        Graphics2D graficos = imagen.createGraphics();
        graficos.setColor(Color.ORANGE);
        graficos.fillRect(0, 0, ancho, alto);
        graficos.dispose();
        try (ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            ImageIO.write(imagen, "jpeg", salida);
            return salida.toByteArray();
        }
    }
}
