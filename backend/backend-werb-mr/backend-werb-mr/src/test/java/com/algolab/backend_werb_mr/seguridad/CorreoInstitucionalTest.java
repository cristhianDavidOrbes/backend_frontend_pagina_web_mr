package com.algolab.backend_werb_mr.seguridad;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class CorreoInstitucionalTest {
    @Test
    void normalizaMayusculasYEspaciosExteriores() {
        assertEquals("estudiante@campusucc.edu.co",
                CorreoInstitucional.normalizar("  ESTUDIANTE@CAMPUSUCC.EDU.CO  "));
    }

    @Test
    void aceptaSoloCorreosInstitucionalesValidos() {
        assertTrue(CorreoInstitucional.esValido("ana.maria@campusucc.edu.co"));
        assertFalse(CorreoInstitucional.esValido("ana@gmail.com"));
        assertFalse(CorreoInstitucional.esValido("usuario@hotmail.com"));
        assertFalse(CorreoInstitucional.esValido("correo_invalido_sin_arroba"));
        assertFalse(CorreoInstitucional.esValido("ana@otro.com@campusucc.edu.co"));
        assertFalse(CorreoInstitucional.esValido("ana maria@campusucc.edu.co"));
    }
}
