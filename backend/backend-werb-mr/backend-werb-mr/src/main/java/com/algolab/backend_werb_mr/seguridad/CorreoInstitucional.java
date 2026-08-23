package com.algolab.backend_werb_mr.seguridad;

import java.util.Locale;

/** Validación de correos electrónicos restringida exclusivamente a @gmail.com */
public final class CorreoInstitucional {
    public static final String DOMINIO = "@gmail.com";

    private CorreoInstitucional() {
    }

    public static String normalizar(String correo) {
        if (correo == null) {
            return null;
        }

        String normalizado = correo.trim().toLowerCase(Locale.ROOT);
        return normalizado.isBlank() ? null : normalizado;
    }

    public static boolean esValido(String correo) {
        String normalizado = normalizar(correo);
        return normalizado != null && normalizado.endsWith("@gmail.com") && normalizado.length() > 10;
    }
}
