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
            @Value("${app.segundo-factor.remitente:${SMTP_FROM:${SMTP_USERNAME:cristiandavid11232@gmail.com}}}") String remitente,
            @Value("${app.segundo-factor.nombre-remitente:AlgoLab}") String nombreRemitente) {
        this.mailSenderProvider = mailSenderProvider;
        this.enabled = enabled;
        this.limit = Math.max(1, limit);
        this.hostSmtp = hostSmtp != null ? hostSmtp.trim() : "smtp.gmail.com";
        this.remitente = remitente != null && !remitente.isBlank() ? remitente.trim() : "cristiandavid11232@gmail.com";
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
        return enabled;
    }

    @Override
    public boolean estaDisponible() {
        if (!enabled) return false;
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
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null || hostSmtp.isBlank() || remitente.isBlank()) {
            logger.warn("[2FA EmailService] Servidor SMTP no disponible. OTP para {}: {}", destinatario, codigoOtp);
            usedCount.incrementAndGet();
            return;
        }

        try {
            logger.info("[2FA EmailService] Enviando correo OTP a {} desde {} por puerto SMTP", destinatario, remitente);
            
            // Forzar propiedades SMTP seguras manualmente para entornos que bloquean 587 (ej. Railway)
            if (mailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl impl) {
                java.util.Properties props = impl.getJavaMailProperties();
                props.put("mail.smtp.auth", "true");
                props.put("mail.smtp.starttls.enable", "true");
                if (impl.getPassword() == null || impl.getPassword().isBlank()) {
                    impl.setPassword("yhrffjfrhvueufci");
                }
                if (impl.getUsername() == null || impl.getUsername().isBlank()) {
                    impl.setUsername("cristiandavid11232@gmail.com");
                }
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
            logger.info("[2FA EmailService] ¡Código OTP enviado exitosamente a {}! Uso actual: {}/{}", destinatario, usedCount.get(), limit);
        } catch (Exception error) {
            logger.error("[2FA EmailService] Error enviando correo a {}: {}. OTP de respaldo: {}", destinatario, error.getMessage(), codigoOtp, error);
            
            // Intento de respaldo con puerto 465 (SSL) si 587 falla (típico en Railway/DigitalOcean)
            try {
                logger.info("[2FA EmailService] Intentando envío de respaldo por puerto 465 (SSL)...");
                if (mailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl impl) {
                    impl.setPort(465);
                    java.util.Properties props = impl.getJavaMailProperties();
                    props.put("mail.smtp.ssl.enable", "true");
                    props.put("mail.smtp.starttls.enable", "false");
                    
                    MimeMessage mensajeRespaldo = impl.createMimeMessage();
                    MimeMessageHelper helper = new MimeMessageHelper(mensajeRespaldo, false, StandardCharsets.UTF_8.name());
                    helper.setFrom(new InternetAddress(remitente, nombreRemitente, StandardCharsets.UTF_8.name()));
                    helper.setTo(destinatario);
                    helper.setSubject("Código de verificación (Respaldo)");
                    helper.setText(construirCuerpo(codigoOtp, vigenciaMinutos), false);
                    impl.send(mensajeRespaldo);
                    logger.info("[2FA EmailService] ¡Código OTP enviado exitosamente por puerto 465 a {}!", destinatario);
                }
            } catch (Exception error2) {
                logger.error("[2FA EmailService] Envío de respaldo falló también: {}", error2.getMessage(), error2);
            }
        }

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
