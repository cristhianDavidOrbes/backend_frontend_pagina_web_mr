package com.algolab.backend_werb_mr.servicios;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailServiceSmtpImpl implements IEmailService {
    private static final Logger logger = LoggerFactory.getLogger(EmailServiceSmtpImpl.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final boolean enabled;
    private final int limit;
    private final String hostSmtp;
    private final String remitente;
    private final String nombreRemitente;

    private final AtomicInteger usedCount = new AtomicInteger(0);
    private final AtomicLong resetAt = new AtomicLong(0);

    public EmailServiceSmtpImpl(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${app.email2fa.enabled:${EMAIL_2FA_ENABLED:true}}") boolean enabled,
            @Value("${app.email2fa.limit:${EMAIL_2FA_LIMIT:1000}}") int limit,
            @Value("${spring.mail.host:smtp.gmail.com}") String hostSmtp,
            @Value("${app.segundo-factor.remitente:${SMTP_FROM:${SMTP_USERNAME:}}}") String remitente,
            @Value("${app.segundo-factor.nombre-remitente:AlgoLab}") String nombreRemitente) {
        this.mailSenderProvider = mailSenderProvider;
        this.enabled = enabled;
        this.limit = Math.max(1, limit);
        this.hostSmtp = hostSmtp != null ? hostSmtp.trim() : "smtp.gmail.com";
        this.remitente = remitente != null ? remitente.trim() : "";
        this.nombreRemitente = nombreRemitente != null ? nombreRemitente.trim() : "AlgoLab";
        this.resetAt.set(Instant.now().plusSeconds(86400).toEpochMilli());
    }

    private void verificarReinicioPeriodico() {
        long ahora = Instant.now().toEpochMilli();
        if (ahora >= resetAt.get()) {
            usedCount.set(0);
            resetAt.set(ahora + 86400000L);
            logger.info("[2FA EmailService] Contador de emails restablecido automáticamente para el nuevo ciclo.");
        }
    }

    @Override
    public boolean estaHabilitado() {
        return enabled && configuracionSmtpCompleta();
    }

    @Override
    public boolean estaDisponible() {
        if (!estaHabilitado()) return false;
        verificarReinicioPeriodico();
        if (usedCount.get() >= limit) {
            logger.warn("[2FA EmailService] Cuota de emails agotada: {}/{} utilizados.", usedCount.get(), limit);
            return false;
        }
        return true;
    }

    @Override
    public void enviarOtp(String destinatario, String codigoOtp, int vigenciaMinutos) {
        if (!estaDisponible()) {
            logger.warn("[2FA EmailService] Intento de envío de OTP rechazado por cuota agotada o servicio deshabilitado.");
            throw new SegundoFactorException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El servicio de correo no está disponible temporalmente.");
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null || hostSmtp.isBlank() || remitente.isBlank()) {
            logger.warn("[2FA EmailService] Servidor SMTP no disponible para el destinatario {}.",
                    enmascararCorreo(destinatario));
            throw new SegundoFactorException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El servicio de correo no está configurado correctamente.");
        }

        try {
            logger.info("[2FA EmailService] Enviando un código de seguridad a {}.",
                    enmascararCorreo(destinatario));
            
            // Forzar propiedades SMTP seguras manualmente para entornos que bloquean 587 (ej. Railway)
            if (mailSender instanceof JavaMailSenderImpl impl) {
                java.util.Properties props = impl.getJavaMailProperties();
                props.put("mail.smtp.auth", "true");
                props.put("mail.smtp.starttls.enable", "true");
                // Si el puerto 587 está bloqueado, podemos intentar forzar SSL en 465
                // impl.setPort(465);
                // props.put("mail.smtp.ssl.enable", "true");
            }

            MimeMessage mensaje = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mensaje, false, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(remitente, nombreRemitente, StandardCharsets.UTF_8.name()));
            helper.setTo(destinatario);
            helper.setSubject("Código de verificación");
            helper.setText(construirCuerpo(codigoOtp, vigenciaMinutos), false);
            mailSender.send(mensaje);
            usedCount.incrementAndGet();
            logger.info("[2FA EmailService] Código enviado a {}. Uso actual: {}/{}",
                    enmascararCorreo(destinatario), usedCount.get(), limit);
        } catch (Exception error) {
            logger.warn("[2FA EmailService] Falló el envío principal a {}: {}",
                    enmascararCorreo(destinatario), error.getMessage());
            
            // Intento de respaldo con puerto 465 (SSL) si 587 falla (típico en Railway/DigitalOcean)
            if (!(mailSender instanceof JavaMailSenderImpl impl)) {
                throw new SegundoFactorException(HttpStatus.SERVICE_UNAVAILABLE,
                        "No fue posible enviar el código de seguridad.", error);
            }

            try {
                logger.info("[2FA EmailService] Intentando envío de respaldo por puerto 465 (SSL)...");
                JavaMailSenderImpl transporteSsl = crearTransporteSsl(impl);

                MimeMessage mensajeRespaldo = transporteSsl.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mensajeRespaldo, false, StandardCharsets.UTF_8.name());
                helper.setFrom(new InternetAddress(remitente, nombreRemitente, StandardCharsets.UTF_8.name()));
                helper.setTo(destinatario);
                helper.setSubject("Código de verificación");
                helper.setText(construirCuerpo(codigoOtp, vigenciaMinutos), false);
                transporteSsl.send(mensajeRespaldo);
                usedCount.incrementAndGet();
                logger.info("[2FA EmailService] Código enviado por el transporte alternativo a {}. Uso actual: {}/{}",
                        enmascararCorreo(destinatario), usedCount.get(), limit);
            } catch (Exception error2) {
                logger.error("[2FA EmailService] También falló el transporte alternativo: {}", error2.getMessage());
                throw new SegundoFactorException(HttpStatus.SERVICE_UNAVAILABLE,
                        "No fue posible enviar el código de seguridad. Intenta nuevamente más tarde.", error2);
            }
        }

    }

    private boolean configuracionSmtpCompleta() {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (hostSmtp.isBlank() || remitente.isBlank() || mailSender == null) {
            return false;
        }
        if (mailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl impl) {
            return impl.getUsername() != null
                    && !impl.getUsername().isBlank()
                    && impl.getPassword() != null
                    && !impl.getPassword().isBlank();
        }
        return true;
    }

    private JavaMailSenderImpl crearTransporteSsl(JavaMailSenderImpl original) {
        JavaMailSenderImpl transporte = new JavaMailSenderImpl();
        transporte.setHost(original.getHost() != null && !original.getHost().isBlank()
                ? original.getHost()
                : hostSmtp);
        transporte.setPort(465);
        transporte.setUsername(original.getUsername());
        transporte.setPassword(original.getPassword());
        if (original.getProtocol() != null && !original.getProtocol().isBlank()) {
            transporte.setProtocol(original.getProtocol());
        }

        java.util.Properties props = new java.util.Properties();
        props.putAll(original.getJavaMailProperties());
        props.put("mail.smtp.ssl.enable", "true");
        props.put("mail.smtp.starttls.enable", "false");
        props.put("mail.smtp.starttls.required", "false");
        props.put("mail.smtp.ssl.checkserveridentity", "true");
        transporte.setJavaMailProperties(props);
        return transporte;
    }

    private String enmascararCorreo(String correo) {
        if (correo == null || !correo.contains("@")) {
            return "***";
        }
        int arroba = correo.indexOf('@');
        String local = correo.substring(0, arroba);
        String dominio = correo.substring(arroba);
        String visible = local.substring(0, Math.min(2, local.length()));
        return visible + "***" + dominio;
    }

    private String construirCuerpo(String codigoOtp, int vigenciaMinutos) {
        return "Tu código de seguridad de AlgoLab es:\n\n"
                + codigoOtp + "\n\n"
                + "Este código vence en " + vigenciaMinutos + " minutos.\n\n"
                + "Si no intentaste iniciar sesión, puedes ignorar este mensaje.";
    }

    @Override
    public int getLimite() {
        return limit;
    }

    @Override
    public int getUsoActual() {
        return usedCount.get();
    }
}
