package com.algolab.backend_werb_mr.servicios;

public class AvatarInvalidoException extends RuntimeException {
    public AvatarInvalidoException(String mensaje) {
        super(mensaje);
    }

    public AvatarInvalidoException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
