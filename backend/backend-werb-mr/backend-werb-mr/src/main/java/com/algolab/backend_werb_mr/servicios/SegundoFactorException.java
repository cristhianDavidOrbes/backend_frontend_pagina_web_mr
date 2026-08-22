package com.algolab.backend_werb_mr.servicios;

import org.springframework.http.HttpStatus;

public class SegundoFactorException extends RuntimeException {
    private final HttpStatus estado;

    public SegundoFactorException(HttpStatus estado, String mensaje) {
        super(mensaje);
        this.estado = estado;
    }

    public SegundoFactorException(HttpStatus estado, String mensaje, Throwable causa) {
        super(mensaje, causa);
        this.estado = estado;
    }

    public HttpStatus getEstado() {
        return estado;
    }
}
