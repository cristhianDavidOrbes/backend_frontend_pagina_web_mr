package com.algolab.backend_werb_mr.dtos;

public class VerificarEmailOtpRequest {
    private String sessionToken;
    private String codigo;

    public VerificarEmailOtpRequest() {
    }

    public VerificarEmailOtpRequest(String sessionToken, String codigo) {
        this.sessionToken = sessionToken;
        this.codigo = codigo;
    }

    public String getSessionToken() {
        return sessionToken;
    }

    public void setSessionToken(String sessionToken) {
        this.sessionToken = sessionToken;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }
}
