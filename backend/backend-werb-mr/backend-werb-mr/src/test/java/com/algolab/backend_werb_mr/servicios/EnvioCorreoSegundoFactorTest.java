package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;

import com.algolab.backend_werb_mr.configuracion.SegundoFactorPropiedades;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;

class EnvioCorreoSegundoFactorTest {
    @Test
    void smtpNoConfiguradoRegistraYPermiteFlujoSinExponerError() {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> proveedor = mock(ObjectProvider.class);
        when(proveedor.getIfAvailable()).thenReturn(null);

        SegundoFactorPropiedades propiedades = new SegundoFactorPropiedades();
        propiedades.setRemitente("algolab@campusucc.edu.co");
        EnvioCorreoSegundoFactor envio = new EnvioCorreoSegundoFactor(proveedor, propiedades, "");
        Usuario usuario = new Usuario(1L, "Ada", "ada@campusucc.edu.co", Rol.ESTUDIANTE, "hash");

        assertTrue(envio.disponible());
        assertDoesNotThrow(() -> envio.enviarCodigo(usuario, "123456", 300));
    }
}
