package com.algolab.backend_werb_mr.seguridad;

import java.util.Locale;
import java.util.regex.Pattern;

/** Reglas de identidad institucional compartidas por registro e inicio de sesion. */
public final class CorreoInstitucional {
    public static final String DOMINIO = "@campusucc.edu.co";

    private static final Pattern PATRON = Pattern.compile(
            "^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@campusucc\\.edu\\.co$");

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
        return normalizado != null && PATRON.matcher(normalizado).matches();
    }
}
