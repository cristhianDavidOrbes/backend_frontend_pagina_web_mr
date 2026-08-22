package com.algolab.backend_werb_mr.servicios;

import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import com.algolab.backend_werb_mr.configuracion.SegundoFactorPropiedades;
import com.algolab.backend_werb_mr.modelos.CanalSegundoFactor;
import com.algolab.backend_werb_mr.modelos.Usuario;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

@Service
public class EnvioCorreoSegundoFactor implements IEnvioSegundoFactor {
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final SegundoFactorPropiedades propiedades;
    private final String hostSmtp;

    public EnvioCorreoSegundoFactor(ObjectProvider<JavaMailSender> mailSenderProvider,
            SegundoFactorPropiedades propiedades,
            @Value("${spring.mail.host:}") String hostSmtp) {
        this.mailSenderProvider = mailSenderProvider;
        this.propiedades = propiedades;
        this.hostSmtp = hostSmtp;
    }

    @Override
    public CanalSegundoFactor canal() {
        return CanalSegundoFactor.CORREO;
    }

    @Override
    public boolean disponible() {
        return mailSenderProvider.getIfAvailable() != null
                && limpiar(hostSmtp) != null
                && limpiar(propiedades.getRemitente()) != null;
    }

    @Override
    public void enviarCodigo(Usuario usuario, String codigo, long vigenciaSegundos) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        String remitente = limpiar(propiedades.getRemitente());

        if (!disponible() || mailSender == null || remitente == null) {
            throw new SegundoFactorException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "El servicio de correo para el segundo factor no esta configurado");
        }

        try {
            MimeMessage mensaje = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mensaje, false, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(remitente, propiedades.getNombreRemitente(), StandardCharsets.UTF_8.name()));
            helper.setTo(usuario.getCorreo());
            helper.setSubject("Tu codigo de acceso a AlgoLab");
            helper.setText(construirHtml(usuario, codigo, vigenciaSegundos), true);
            mailSender.send(mensaje);
        } catch (SegundoFactorException error) {
            throw error;
        } catch (Exception error) {
            // La causa se conserva para observabilidad interna, pero nunca incluye
            // el codigo en el mensaje ni se registra desde este servicio.
            throw new SegundoFactorException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "No fue posible enviar el codigo de segundo factor",
                    error);
        }
    }

    private String construirHtml(Usuario usuario, String codigo, long vigenciaSegundos) {
        String nombre = HtmlUtils.htmlEscape(usuario.getNombre());
        long minutos = Math.max(1, (long) Math.ceil(vigenciaSegundos / 60.0));
        return """
                <!doctype html>
                <html lang="es">
                  <body style="margin:0;background:#061713;color:#ecfff8;font-family:Arial,sans-serif;padding:28px">
                    <div style="max-width:560px;margin:auto;background:#0b241e;border:1px solid #2de2a1;border-radius:20px;overflow:hidden">
                      <div style="padding:24px 28px;background:linear-gradient(135deg,#0b352b,#10243c)">
                        <div style="font-size:12px;letter-spacing:3px;color:#67f4c1">ALGO LAB // ACCESO SEGURO</div>
                        <h1 style="margin:10px 0 0;font-size:28px">Confirma que eres tu</h1>
                      </div>
                      <div style="padding:28px">
                        <p>Hola, <strong>%s</strong>.</p>
                        <p>Usa este codigo para completar tu inicio de sesion:</p>
                        <div style="margin:24px 0;padding:18px;text-align:center;background:#04110e;border-radius:14px;border:1px solid #245d4c;font-size:34px;font-weight:800;letter-spacing:10px;color:#65f3be">%s</div>
                        <p style="color:#a8c8bd">Expira en %d minutos y solo puede usarse una vez. AlgoLab nunca te pedira este codigo por chat o llamada.</p>
                        <p style="color:#a8c8bd">Si no intentaste iniciar sesion, ignora este mensaje y cambia tu contrasena.</p>
                      </div>
                    </div>
                  </body>
                </html>
                """.formatted(nombre, HtmlUtils.htmlEscape(codigo), minutos);
    }

    private String limpiar(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        return valor.trim();
    }
}
