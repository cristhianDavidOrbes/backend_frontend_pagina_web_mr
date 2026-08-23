package com.algolab.backend_werb_mr.dtos;

import java.util.List;
import java.util.Map;

public class WebAuthnAuthOpcionesDTO {
    private String challenge; // Base64URL
    private long timeout = 60000;
    private String rpId;
    private List<Map<String, Object>> allowCredentials;
    private String userVerification = "preferred";

    public WebAuthnAuthOpcionesDTO() {
    }

    public String getChallenge() {
        return challenge;
    }

    public void setChallenge(String challenge) {
        this.challenge = challenge;
    }

    public long getTimeout() {
        return timeout;
    }

    public void setTimeout(long timeout) {
        this.timeout = timeout;
    }

    public String getRpId() {
        return rpId;
    }

    public void setRpId(String rpId) {
        this.rpId = rpId;
    }

    public List<Map<String, Object>> getAllowCredentials() {
        return allowCredentials;
    }

    public void setAllowCredentials(List<Map<String, Object>> allowCredentials) {
        this.allowCredentials = allowCredentials;
    }

    public String getUserVerification() {
        return userVerification;
    }

    public void setUserVerification(String userVerification) {
        this.userVerification = userVerification;
    }
}
