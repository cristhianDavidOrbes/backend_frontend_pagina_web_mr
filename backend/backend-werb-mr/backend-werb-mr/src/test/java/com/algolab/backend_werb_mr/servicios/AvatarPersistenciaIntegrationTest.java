package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;

import com.algolab.backend_werb_mr.modelos.AvatarUsuario;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.IAvatarUsuarioRepositorio;

@SpringBootTest
class AvatarPersistenciaIntegrationTest {
    @Autowired
    private AvatarServicio avatarServicio;

    @Autowired
    private IUsuarioServicio usuarioServicio;

    @Autowired
    private IAvatarUsuarioRepositorio avatarRepositorio;

    @Test
    void guardaYRecuperaAvatarConUsuarioDesasociado() throws Exception {
        Usuario usuario = new Usuario(
                null,
                "Avatar integración",
                "avatar.integracion@campusucc.edu.co",
                Rol.ESTUDIANTE,
                "ContrasenaSegura123");
        usuario = usuarioServicio.registrar(usuario);

        MockMultipartFile archivo = new MockMultipartFile(
                "archivo",
                "avatar.png",
                "image/png",
                crearPng());

        AvatarUsuario guardado = avatarServicio.guardar(usuario, archivo);
        AvatarUsuario recuperado = avatarRepositorio.findById(usuario.getId()).orElseThrow();

        assertEquals(usuario.getId(), guardado.getUsuarioId());
        assertNotNull(recuperado.getEtag());
        assertEquals("image/png", recuperado.getMimeType());
        assertArrayEquals(guardado.getContenido(), recuperado.getContenido());
    }

    private byte[] crearPng() throws Exception {
        BufferedImage imagen = new BufferedImage(96, 96, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graficos = imagen.createGraphics();
        graficos.setColor(new Color(33, 220, 160, 220));
        graficos.fillRect(0, 0, imagen.getWidth(), imagen.getHeight());
        graficos.dispose();
        try (ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            ImageIO.write(imagen, "png", salida);
            return salida.toByteArray();
        }
    }
}
