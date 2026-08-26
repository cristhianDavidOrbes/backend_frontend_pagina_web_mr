package com.algolab.backend_werb_mr.configuracion;

import java.security.SecureRandom;
import java.time.Clock;
import java.util.Properties;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

@Configuration
@EnableConfigurationProperties(SegundoFactorPropiedades.class)
public class SegundoFactorConfiguracion {

    @Bean
    public Clock relojSegundoFactor() {
        return Clock.systemUTC();
    }

    @Bean
    public SecureRandom generadorSeguroSegundoFactor() {
        return new SecureRandom();
    }

    @Bean
    public JavaMailSender javaMailSender(
            @Value("${spring.mail.host:smtp.gmail.com}") String host,
            @Value("${spring.mail.port:587}") int port,
            @Value("${spring.mail.username:}") String username,
            @Value("${spring.mail.password:}") String password,
            @Value("${spring.mail.properties.mail.smtp.auth:true}") String auth,
            @Value("${spring.mail.properties.mail.smtp.starttls.enable:true}") String starttls,
            @Value("${spring.mail.properties.mail.smtp.starttls.required:true}") String starttlsRequired,
            @Value("${spring.mail.properties.mail.smtp.ssl.trust:${spring.mail.host:smtp.gmail.com}}") String sslTrust,
            @Value("${spring.mail.properties.mail.smtp.ssl.checkserveridentity:true}") String checkServerIdentity) {

        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(host != null && !host.isBlank() ? host.trim() : "smtp.gmail.com");
        mailSender.setPort(port > 0 ? port : 587);
        mailSender.setUsername(username != null ? username.trim() : "");
        mailSender.setPassword(password != null ? password.trim() : "");

        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", auth);
        props.put("mail.smtp.starttls.enable", starttls);
        props.put("mail.smtp.starttls.required", starttlsRequired);
        props.put("mail.smtp.ssl.protocols", "TLSv1.2 TLSv1.3");
        props.put("mail.smtp.ssl.trust", sslTrust != null && !sslTrust.isBlank()
                ? sslTrust.trim()
                : mailSender.getHost());
        props.put("mail.smtp.ssl.checkserveridentity", checkServerIdentity);
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");

        return mailSender;
    }
}
