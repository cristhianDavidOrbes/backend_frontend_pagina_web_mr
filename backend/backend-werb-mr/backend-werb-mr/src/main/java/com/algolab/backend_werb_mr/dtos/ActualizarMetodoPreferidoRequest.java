package com.algolab.backend_werb_mr.dtos;

import com.algolab.backend_werb_mr.modelos.Metodo2fa;

public class ActualizarMetodoPreferidoRequest {
    private Metodo2fa metodo;

    public ActualizarMetodoPreferidoRequest() {
    }

    public ActualizarMetodoPreferidoRequest(Metodo2fa metodo) {
        this.metodo = metodo;
    }

    public Metodo2fa getMetodo() {
        return metodo;
    }

    public void setMetodo(Metodo2fa metodo) {
        this.metodo = metodo;
    }
}
