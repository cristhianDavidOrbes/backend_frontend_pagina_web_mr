package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;

class EmailServiceSmtpImplTest {

    @Test
    void servicioDisponibleSiMenorQueLimite() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);

        EmailServiceSmtpImpl service = new EmailServiceSmtpImpl(
                provider, true, 2, "smtp.example.com", "admin@campusucc.edu.co", "AlgoLab");

        assertTrue(service.estaDisponible());
        service.enviarOtp("user1@campusucc.edu.co", "123456", 5);
        assertEquals(1, service.getUsoActual());
        assertTrue(service.estaDisponible());

        service.enviarOtp("user2@campusucc.edu.co", "654321", 5);
        assertEquals(2, service.getUsoActual());

        // Límite alcanzado
        assertFalse(service.estaDisponible());
        assertDoesNotThrow(() -> service.enviarOtp("user3@campusucc.edu.co", "999999", 5));
    }

    @Test
    void servicioNoDisponibleSiDeshabilitado() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        EmailServiceSmtpImpl service = new EmailServiceSmtpImpl(
                provider, false, 100, "smtp.example.com", "admin@campusucc.edu.co", "AlgoLab");

        assertFalse(service.estaHabilitado());
        assertFalse(service.estaDisponible());
    }
}
