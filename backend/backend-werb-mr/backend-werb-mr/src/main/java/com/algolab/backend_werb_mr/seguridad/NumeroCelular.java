package com.algolab.backend_werb_mr.seguridad;

import java.util.regex.Pattern;

public final class NumeroCelular {
    private static final Pattern E164 = Pattern.compile("^\\+[1-9]\\d{7,14}$");

    private NumeroCelular() {
    }

    public static String normalizar(String numero) {
        if (numero == null || numero.isBlank()) {
            return null;
        }
        return numero.trim().replaceAll("[\\s()-]", "");
    }

    public static boolean esValido(String numero) {
        String normalizado = normalizar(numero);
        return normalizado != null && E164.matcher(normalizado).matches();
    }
}
