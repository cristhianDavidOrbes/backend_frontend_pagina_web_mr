package com.algolab.backend_werb_mr.dtos;

public class TotpSetupRespuestaDTO {
    private String otpAuthUri;
    private String secretClaveManual; // Formatted for manual entry if needed
    private String issuer;
    private String cuenta;

    public TotpSetupRespuestaDTO() {
    }

    public TotpSetupRespuestaDTO(String otpAuthUri, String secretClaveManual, String issuer, String cuenta) {
        this.otpAuthUri = otpAuthUri;
        this.secretClaveManual = secretClaveManual;
        this.issuer = issuer;
        this.cuenta = cuenta;
    }

    public String getOtpAuthUri() {
        return otpAuthUri;
    }

    public void setOtpAuthUri(String otpAuthUri) {
        this.otpAuthUri = otpAuthUri;
    }

    public String getSecretClaveManual() {
        return secretClaveManual;
    }

    public void setSecretClaveManual(String secretClaveManual) {
        this.secretClaveManual = secretClaveManual;
    }

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public String getCuenta() {
        return cuenta;
    }

    public void setCuenta(String cuenta) {
        this.cuenta = cuenta;
    }
}
