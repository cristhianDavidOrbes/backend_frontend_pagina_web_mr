package com.algolab.backend_werb_mr.seguridad;

import java.util.Locale;
import java.util.regex.Pattern;

/** Validación universal de correos electrónicos para registro e inicio de sesión. */
public final class CorreoInstitucional {
    public static final String DOMINIO = "@gmail.com, @campusucc.edu.co";

    private static final Pattern PATRON = Pattern.compile(
            "^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$");

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
