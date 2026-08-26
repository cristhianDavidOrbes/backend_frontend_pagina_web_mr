package com.algolab.backend_werb_mr.servicios;

import java.util.Properties;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;

public class SmtpDiagnosticoTest {

    @Test
    @Disabled("Diagnostico manual exitoso")
    void probarEnvioRealNuevaClaveGmail() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost("smtp.gmail.com");
        mailSender.setPort(587);
        String usuario = System.getenv("SMTP_USERNAME");
        String contrasena = System.getenv("SMTP_PASSWORD");
        if (usuario == null || usuario.isBlank() || contrasena == null || contrasena.isBlank()) {
            return;
        }
        mailSender.setUsername(usuario);
        mailSender.setPassword(contrasena);

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.ssl.protocols", "TLSv1.2 TLSv1.3");
        props.put("mail.smtp.ssl.trust", "smtp.gmail.com");
        props.put("mail.smtp.ssl.checkserveridentity", "true");
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");

        try {
            mailSender.testConnection();
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(usuario, "AlgoLab UCC");
            helper.setTo(usuario);
            helper.setSubject("Código de verificación");
            helper.setText("Tu código de seguridad es:\n\n583921\n\nEste código vence en 5 minutos.", false);
            mailSender.send(message);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
