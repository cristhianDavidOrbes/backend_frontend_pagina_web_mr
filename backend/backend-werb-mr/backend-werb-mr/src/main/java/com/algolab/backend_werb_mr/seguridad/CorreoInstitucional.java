package com.algolab.backend_werb_mr.seguridad;

import java.util.Locale;

/** Validación de correos electrónicos institucionales de la Universidad Cooperativa. */
public final class CorreoInstitucional {
    public static final String DOMINIO = "@campusucc.edu.co";

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
        if (normalizado == null || !normalizado.endsWith(DOMINIO)) {
            return false;
        }

        String cuenta = normalizado.substring(0, normalizado.length() - DOMINIO.length());
        return !cuenta.isBlank()
                && cuenta.indexOf('@') < 0
                && cuenta.chars().noneMatch(Character::isWhitespace);
    }
}
