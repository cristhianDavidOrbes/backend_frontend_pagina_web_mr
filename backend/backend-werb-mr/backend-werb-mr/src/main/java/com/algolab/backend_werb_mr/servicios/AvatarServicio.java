package com.algolab.backend_werb_mr.servicios;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.Optional;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.algolab.backend_werb_mr.modelos.AvatarUsuario;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.IAvatarUsuarioRepositorio;

@Service
public class AvatarServicio {
    public static final long TAMANO_MAXIMO_ENTRADA = 10L * 1024L * 1024L;
    public static final int DIMENSION_MAXIMA_ENTRADA = 2048;
    public static final int DIMENSION_MAXIMA_SALIDA = 512;
    private static final float CALIDAD_JPEG = 0.88f;

    private final IAvatarUsuarioRepositorio avatarRepositorio;
    private final IUsuarioServicio usuarioServicio;

    public AvatarServicio(IAvatarUsuarioRepositorio avatarRepositorio, IUsuarioServicio usuarioServicio) {
        this.avatarRepositorio = avatarRepositorio;
        this.usuarioServicio = usuarioServicio;
    }

    @Transactional
    public AvatarUsuario guardar(Usuario usuario, MultipartFile archivo) {
        if (usuario == null || usuario.getId() == null) {
            throw new AvatarInvalidoException("Usuario no válido");
        }
        if (archivo == null || archivo.isEmpty()) {
            throw new AvatarInvalidoException("Debe seleccionar una imagen");
        }
        if (archivo.getSize() > TAMANO_MAXIMO_ENTRADA) {
            throw new AvatarInvalidoException("La imagen no puede superar 10 MB");
        }

        byte[] entrada;
        try {
            entrada = archivo.getBytes();
        } catch (IOException error) {
            throw new AvatarInvalidoException("No se pudo leer la imagen", error);
        }

        return guardarBytes(usuario, entrada);
    }

    @Transactional
    public AvatarUsuario guardarBase64(Usuario usuario, String base64Data, String mimeType) {
        if (usuario == null || usuario.getId() == null) {
            throw new AvatarInvalidoException("Usuario no válido");
        }
        if (base64Data == null || base64Data.isBlank()) {
            throw new AvatarInvalidoException("Debe seleccionar una imagen");
        }

        String dataLimpia = base64Data.trim();
        if (dataLimpia.contains(",")) {
            dataLimpia = dataLimpia.substring(dataLimpia.indexOf(",") + 1);
        }

        byte[] bytes;
        try {
            bytes = java.util.Base64.getDecoder().decode(dataLimpia);
        } catch (IllegalArgumentException e) {
            throw new AvatarInvalidoException("La imagen en base64 no tiene un formato válido", e);
        }

        if (bytes.length > TAMANO_MAXIMO_ENTRADA) {
            throw new AvatarInvalidoException("La imagen no puede superar 10 MB");
        }

        return guardarBytes(usuario, bytes);
    }

    @Transactional
    public AvatarUsuario guardarBytes(Usuario usuario, byte[] entrada) {
        if (entrada == null || entrada.length == 0) {
            throw new AvatarInvalidoException("Debe seleccionar una imagen");
        }
        ImagenNormalizada imagen = normalizarBytes(entrada);
        String etag = calcularSha256(imagen.contenido());
        AvatarUsuario avatar = avatarRepositorio.findById(usuario.getId())
                .orElseGet(() -> new AvatarUsuario(usuario));

        avatar.setUsuario(usuario);
        avatar.setContenido(imagen.contenido());
        avatar.setMimeType(imagen.mimeType());
        avatar.setEtag(etag);
        avatar.setActualizadoEn(Instant.now());
        AvatarUsuario guardado = avatarRepositorio.save(avatar);

        usuario.setAvatarVersion(etag);
        usuarioServicio.actualizar(usuario);
        return guardado;
    }

    @Transactional(readOnly = true)
    public Optional<AvatarUsuario> buscarPorUsuarioId(Long usuarioId) {
        if (usuarioId == null) {
            return Optional.empty();
        }
        return avatarRepositorio.findById(usuarioId);
    }

    @Transactional
    public void eliminar(Usuario usuario) {
        if (usuario == null || usuario.getId() == null) {
            return;
        }
        avatarRepositorio.findById(usuario.getId()).ifPresent(avatarRepositorio::delete);
        usuario.setAvatarVersion(null);
        usuarioServicio.actualizar(usuario);
    }

    private ImagenNormalizada normalizarBytes(byte[] entrada) {
        if (entrada == null || entrada.length == 0) {
            throw new AvatarInvalidoException("Debe seleccionar una imagen");
        }

        try (ImageInputStream flujo = ImageIO.createImageInputStream(new ByteArrayInputStream(entrada))) {
            if (flujo == null) {
                throw new AvatarInvalidoException("El archivo no es una imagen válida");
            }

            Iterator<ImageReader> lectores = ImageIO.getImageReaders(flujo);
            if (!lectores.hasNext()) {
                throw new AvatarInvalidoException("El archivo no es una imagen válida");
            }

            ImageReader lector = lectores.next();
            try {
                String formato = lector.getFormatName().toLowerCase();
                if (!formato.equals("png") && !formato.equals("jpeg") && !formato.equals("jpg")) {
                    throw new AvatarInvalidoException("Solo se permiten imágenes PNG o JPEG");
                }

                lector.setInput(flujo, true, true);
                int ancho = lector.getWidth(0);
                int alto = lector.getHeight(0);
                if (ancho <= 0 || alto <= 0 || ancho > DIMENSION_MAXIMA_ENTRADA
                        || alto > DIMENSION_MAXIMA_ENTRADA) {
                    throw new AvatarInvalidoException("La imagen debe medir como máximo 2048 x 2048 píxeles");
                }

                ImageReadParam parametros = lector.getDefaultReadParam();
                BufferedImage original = lector.read(0, parametros);
                if (original == null) {
                    throw new AvatarInvalidoException("El archivo no es una imagen válida");
                }

                BufferedImage escalada = escalar(original);
                boolean conservarTransparencia = escalada.getColorModel().hasAlpha();
                byte[] contenido = conservarTransparencia
                        ? escribirPng(escalada)
                        : escribirJpeg(escalada);
                String mimeType = conservarTransparencia ? "image/png" : "image/jpeg";

                if (contenido.length > TAMANO_MAXIMO_ENTRADA) {
                    contenido = escribirJpeg(aplanarSobreBlanco(escalada));
                    mimeType = "image/jpeg";
                }
                if (contenido.length > TAMANO_MAXIMO_ENTRADA) {
                    throw new AvatarInvalidoException("La imagen procesada supera 1 MB");
                }

                return new ImagenNormalizada(contenido, mimeType);
            } finally {
                lector.dispose();
            }
        } catch (AvatarInvalidoException error) {
            throw error;
        } catch (IOException | RuntimeException error) {
            throw new AvatarInvalidoException("El archivo no es una imagen PNG o JPEG válida", error);
        }
    }

    private BufferedImage escalar(BufferedImage original) {
        double escala = Math.min(1.0,
                Math.min((double) DIMENSION_MAXIMA_SALIDA / original.getWidth(),
                        (double) DIMENSION_MAXIMA_SALIDA / original.getHeight()));
        int ancho = Math.max(1, (int) Math.round(original.getWidth() * escala));
        int alto = Math.max(1, (int) Math.round(original.getHeight() * escala));
        int tipo = original.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
        BufferedImage salida = new BufferedImage(ancho, alto, tipo);
        Graphics2D graficos = salida.createGraphics();
        try {
            graficos.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graficos.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graficos.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            graficos.drawImage(original, 0, 0, ancho, alto, null);
        } finally {
            graficos.dispose();
        }
        return salida;
    }

    private BufferedImage aplanarSobreBlanco(BufferedImage original) {
        BufferedImage salida = new BufferedImage(original.getWidth(), original.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D graficos = salida.createGraphics();
        try {
            graficos.setColor(Color.WHITE);
            graficos.fillRect(0, 0, salida.getWidth(), salida.getHeight());
            graficos.drawImage(original, 0, 0, null);
        } finally {
            graficos.dispose();
        }
        return salida;
    }

    private byte[] escribirPng(BufferedImage imagen) throws IOException {
        try (ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            if (!ImageIO.write(imagen, "png", salida)) {
                throw new IOException("No existe un codificador PNG disponible");
            }
            return salida.toByteArray();
        }
    }

    private byte[] escribirJpeg(BufferedImage imagen) throws IOException {
        Iterator<ImageWriter> escritores = ImageIO.getImageWritersByFormatName("jpeg");
        if (!escritores.hasNext()) {
            throw new IOException("No existe un codificador JPEG disponible");
        }

        ImageWriter escritor = escritores.next();
        try (ByteArrayOutputStream salida = new ByteArrayOutputStream();
                ImageOutputStream flujo = ImageIO.createImageOutputStream(salida)) {
            escritor.setOutput(flujo);
            ImageWriteParam parametros = escritor.getDefaultWriteParam();
            if (parametros.canWriteCompressed()) {
                parametros.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                parametros.setCompressionQuality(CALIDAD_JPEG);
            }
            escritor.write(null, new IIOImage(imagen, null, null), parametros);
            flujo.flush();
            return salida.toByteArray();
        } finally {
            escritor.dispose();
        }
    }

    private String calcularSha256(byte[] contenido) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(contenido));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 no está disponible", error);
        }
    }

    private record ImagenNormalizada(byte[] contenido, String mimeType) {
    }
}
