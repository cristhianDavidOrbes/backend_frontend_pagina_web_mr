package com.algolab.backend_werb_mr.dtos;

public class EnviarEmailOtpRequest {
    private String sessionToken;

    public EnviarEmailOtpRequest() {
    }

    public EnviarEmailOtpRequest(String sessionToken) {
        this.sessionToken = sessionToken;
    }

    public String getSessionToken() {
        return sessionToken;
    }

    public void setSessionToken(String sessionToken) {
        this.sessionToken = sessionToken;
    }
}
