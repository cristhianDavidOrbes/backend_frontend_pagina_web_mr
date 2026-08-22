package com.algolab.backend_werb_mr.dtos;

public class VerificarSegundoFactorRequest {
    private String desafioId;
    private String codigo;

    public String getDesafioId() {
        return desafioId;
    }

    public void setDesafioId(String desafioId) {
        this.desafioId = desafioId;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }
}
