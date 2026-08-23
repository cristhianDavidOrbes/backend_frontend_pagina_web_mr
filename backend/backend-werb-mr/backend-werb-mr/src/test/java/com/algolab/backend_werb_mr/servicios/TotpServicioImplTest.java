package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TotpServicioImplTest {

    private TotpServicioImpl totpService;

    @BeforeEach
    void setUp() {
        totpService = new TotpServicioImpl("jwt-secret-key-32-characters-length-min!");
    }

    @Test
    void generaSecretBase32Valido() {
        String secret = totpService.generarNuevoSecretBase32();
        assertNotNull(secret);
        assertTrue(secret.matches("[A-Z2-7]{32}"));
    }

    @Test
    void cifraYDescifraSecretCorrectamente() {
        String original = totpService.generarNuevoSecretBase32();
        String cifrado = totpService.cifrarSecret(original);
        assertNotNull(cifrado);
        assertFalse(cifrado.equals(original));

        String descifrado = totpService.descifrarSecret(cifrado);
        assertEquals(original, descifrado);
    }

    @Test
    void generaUriOtpAuthValida() {
        String secret = "JBSWY3DPEHPK3PXP";
        String uri = totpService.generarUri("estudiante@campusucc.edu.co", secret);
        assertNotNull(uri);
        assertTrue(uri.startsWith("otpauth://totp/"));
        assertTrue(uri.contains("secret=" + secret));
        assertTrue(uri.contains("issuer="));
    }

    @Test
    void rechazaCodigosInvalidos() {
        String secret = totpService.generarNuevoSecretBase32();
        assertFalse(totpService.validarCodigo(secret, "123"));
        assertFalse(totpService.validarCodigo(secret, "abcdef"));
        assertFalse(totpService.validarCodigo(secret, null));
    }
}
