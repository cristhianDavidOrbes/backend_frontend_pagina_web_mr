package com.algolab.backend_werb_mr.dtos;

public class ConfirmarTotpRequest {
    private String codigo;

    public ConfirmarTotpRequest() {
    }

    public ConfirmarTotpRequest(String codigo) {
        this.codigo = codigo;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }
}
