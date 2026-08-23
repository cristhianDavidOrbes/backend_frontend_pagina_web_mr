package com.algolab.backend_werb_mr.servicios;

import java.util.Properties;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;

public class SmtpDiagnosticoTest {

    @Test
    @Disabled("Solo para diagnostico manual de conexion SMTP")
    void probarEnvioRealGmail() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost("smtp.gmail.com");
        mailSender.setPort(587);
        mailSender.setUsername("cristhian.orbes@campusucc.edu.co");
        mailSender.setPassword("xpkqcvohgkwyvhuk");

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.ssl.trust", "*");
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");
        props.put("mail.debug", "true");

        try {
            System.out.println("--> Iniciando prueba de conexion SMTP con Gmail...");
            mailSender.testConnection();
            System.out.println("--> [EXITO] Conexion SMTP autenticada correctamente con Google!");

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom("cristhian.orbes@campusucc.edu.co", "AlgoLab UCC");
            helper.setTo("cristhian.orbes@campusucc.edu.co");
            helper.setSubject("Código de verificación");
            helper.setText("Tu código de seguridad es:\n\n583921\n\nEste código vence en 5 minutos.", false);

            mailSender.send(message);
            System.out.println("--> [EXITO] Correo enviado y entregado al servidor de Google!");
        } catch (Exception e) {
            System.err.println("--> [ERROR SMTP] " + e.getClass().getName() + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
}
