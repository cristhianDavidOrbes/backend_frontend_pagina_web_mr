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
        mailSender.setUsername("cristiandavid11232@gmail.com");
        mailSender.setPassword("yhrffjfrhvueufci");

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.ssl.protocols", "TLSv1.2 TLSv1.3");
        props.put("mail.smtp.ssl.trust", "*");
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");

        try {
            mailSender.testConnection();
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom("cristiandavid11232@gmail.com", "AlgoLab UCC");
            helper.setTo("cristiandavid11232@gmail.com");
            helper.setSubject("Código de verificación");
            helper.setText("Tu código de seguridad es:\n\n583921\n\nEste código vence en 5 minutos.", false);
            mailSender.send(message);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
