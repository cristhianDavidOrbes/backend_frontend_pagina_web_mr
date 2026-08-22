package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;

import com.algolab.backend_werb_mr.configuracion.SegundoFactorPropiedades;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;

class EnvioCorreoSegundoFactorTest {
    @Test
    void smtpNoConfiguradoResponde503SinExponerElCodigo() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> proveedor = mock(ObjectProvider.class);
        when(proveedor.getIfAvailable()).thenReturn(null);

        SegundoFactorPropiedades propiedades = new SegundoFactorPropiedades();
        propiedades.setRemitente("algolab@campusucc.edu.co");
        EnvioCorreoSegundoFactor envio = new EnvioCorreoSegundoFactor(proveedor, propiedades, "");
        Usuario usuario = new Usuario(1L, "Ada", "ada@campusucc.edu.co", Rol.ESTUDIANTE, "hash");

        SegundoFactorException error = assertThrows(SegundoFactorException.class,
                () -> envio.enviarCodigo(usuario, "123456", 300));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getEstado());
        assertFalse(error.getMessage().contains("123456"));
    }
}
