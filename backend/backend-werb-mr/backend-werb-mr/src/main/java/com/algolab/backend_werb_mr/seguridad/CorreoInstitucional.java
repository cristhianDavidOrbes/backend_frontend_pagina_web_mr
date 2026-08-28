package com.algolab.backend_werb_mr.seguridad;

import java.util.Locale;
import java.util.regex.Pattern;

/** Validación y normalización de correos electrónicos (Gmail, institucional campusucc, Outlook, etc.). */
public final class CorreoInstitucional {
    public static final String DOMINIO = "@campusucc.edu.co";
    private static final Pattern PATRON_EMAIL = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

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
        if (normalizado == null) {
            return false;
        }

        return PATRON_EMAIL.matcher(normalizado).matches();
    }

    public static boolean esInstitucional(String correo) {
        String normalizado = normalizar(correo);
        return normalizado != null && normalizado.endsWith(DOMINIO);
    }
}

