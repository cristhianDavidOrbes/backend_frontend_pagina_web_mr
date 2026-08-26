package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;

class EmailServiceSmtpImplTest {

    @Test
    void servicioDisponibleConTransporteYConfiguracionCompleta() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(mock(JavaMailSender.class));

        EmailServiceSmtpImpl service = new EmailServiceSmtpImpl(
                provider, true, 2, "smtp.example.com", "admin@campusucc.edu.co", "AlgoLab");

        assertTrue(service.estaHabilitado());
        assertTrue(service.estaDisponible());
    }

    @Test
    void servicioNoDisponibleSinTransporteSmtp() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);

        EmailServiceSmtpImpl service = new EmailServiceSmtpImpl(
                provider, true, 2, "smtp.example.com", "admin@campusucc.edu.co", "AlgoLab");

        assertFalse(service.estaHabilitado());
        assertFalse(service.estaDisponible());
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

    @Test
    void falloDelTransporteNoSeReportaComoEnvioExitosoNiConsumeCuota() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        JavaMailSender sender = mock(JavaMailSender.class);
        when(provider.getIfAvailable()).thenReturn(sender);

        EmailServiceSmtpImpl service = new EmailServiceSmtpImpl(
                provider, true, 2, "smtp.example.com", "admin@campusucc.edu.co", "AlgoLab");

        SegundoFactorException error = assertThrows(SegundoFactorException.class,
                () -> service.enviarOtp("ada@campusucc.edu.co", "123456", 5));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getEstado());
        assertEquals(0, service.getUsoActual());
    }
}
