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
            @Value("${spring.mail.host:}") String hostSmtp,
            @Value("${app.segundo-factor.remitente:${SMTP_FROM:${SMTP_USERNAME:}}}") String remitente,
            @Value("${app.segundo-factor.nombre-remitente:AlgoLab UCC}") String nombreRemitente) {
        this.mailSenderProvider = mailSenderProvider;
        this.enabled = enabled;
        this.limit = Math.max(1, limit);
        this.hostSmtp = hostSmtp != null ? hostSmtp.trim() : "";
        this.remitente = remitente != null ? remitente.trim() : "";
        this.nombreRemitente = nombreRemitente != null ? nombreRemitente.trim() : "AlgoLab UCC";
        this.resetAt.set(Instant.now().plusSeconds(86400).toEpochMilli());
    }

    private void verificarReinicioPeriodico() {
        long ahora = Instant.now().toEpochMilli();
        if (ahora >= resetAt.get()) {
            usedCount.set(0);
            resetAt.set(ahora + 86400000L); // 24 horas
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
            logger.info("[2FA EmailService - Modo Desarrollo] Servidor SMTP no configurado. OTP para {}: {}", destinatario, codigoOtp);
            usedCount.incrementAndGet();
            return;
        }

        try {
            MimeMessage mensaje = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mensaje, false, StandardCharsets.UTF_8.name());
            helper.setFrom(new InternetAddress(remitente, nombreRemitente, StandardCharsets.UTF_8.name()));
            helper.setTo(destinatario);
            helper.setSubject("Código de verificación");
            helper.setText(construirCuerpo(codigoOtp, vigenciaMinutos), false);
            mailSender.send(mensaje);
            usedCount.incrementAndGet();
            logger.info("[2FA EmailService] Código OTP enviado exitosamente a {}. Uso actual: {}/{}", destinatario, usedCount.get(), limit);
        } catch (Exception error) {
            logger.error("[2FA EmailService] Error temporal enviando correo a {}: {}. OTP de respaldo: {}", destinatario, error.getMessage(), codigoOtp);
        }
    }

    private String construirCuerpo(String codigoOtp, int vigenciaMinutos) {
        return "Tu código de seguridad es:\n\n"
                + codigoOtp + "\n\n"
                + "Este código vence en " + vigenciaMinutos + " minutos.\n\n"
                + "Si no intentaste iniciar sesión, puedes ignorar este mensaje.";
    }

    @Override
    public int getUsoActual() {
        verificarReinicioPeriodico();
        return usedCount.get();
    }

    @Override
    public int getLimite() {
        return limit;
    }
}
