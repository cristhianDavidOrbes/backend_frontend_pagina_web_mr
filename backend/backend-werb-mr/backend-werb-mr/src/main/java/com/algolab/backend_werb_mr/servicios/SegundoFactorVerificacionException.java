package com.algolab.backend_werb_mr.servicios;

import org.springframework.http.HttpStatus;

/** Excepcion que permite conservar en BD el contador de intentos fallidos. */
public class SegundoFactorVerificacionException extends SegundoFactorException {
    public SegundoFactorVerificacionException(HttpStatus estado, String mensaje) {
        super(estado, mensaje);
    }
}
