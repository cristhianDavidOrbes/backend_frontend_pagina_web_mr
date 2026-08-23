package com.algolab.backend_werb_mr.dtos;

import java.util.List;
import java.util.Map;

public class WebAuthnRegistroOpcionesDTO {
    private String challenge; // Base64URL
    private String rpName = "AlgoLab UCC";
    private String rpId; // hostname
    private Map<String, Object> user; // id, name, displayName
    private List<Map<String, Object>> pubKeyCredParams;
    private long timeout = 60000;
    private String attestation = "none";
    private Map<String, Object> authenticatorSelection;
    private List<Map<String, Object>> excludeCredentials;

    public WebAuthnRegistroOpcionesDTO() {
    }

    public String getChallenge() {
        return challenge;
    }

    public void setChallenge(String challenge) {
        this.challenge = challenge;
    }

    public String getRpName() {
        return rpName;
    }

    public void setRpName(String rpName) {
        this.rpName = rpName;
    }

    public String getRpId() {
        return rpId;
    }

    public void setRpId(String rpId) {
        this.rpId = rpId;
    }

    public Map<String, Object> getUser() {
        return user;
    }

    public void setUser(Map<String, Object> user) {
        this.user = user;
    }

    public List<Map<String, Object>> getPubKeyCredParams() {
        return pubKeyCredParams;
    }

    public void setPubKeyCredParams(List<Map<String, Object>> pubKeyCredParams) {
        this.pubKeyCredParams = pubKeyCredParams;
    }

    public long getTimeout() {
        return timeout;
    }

    public void setTimeout(long timeout) {
        this.timeout = timeout;
    }

    public String getAttestation() {
        return attestation;
    }

    public void setAttestation(String attestation) {
        this.attestation = attestation;
    }

    public Map<String, Object> getAuthenticatorSelection() {
        return authenticatorSelection;
    }

    public void setAuthenticatorSelection(Map<String, Object> authenticatorSelection) {
        this.authenticatorSelection = authenticatorSelection;
    }

    public List<Map<String, Object>> getExcludeCredentials() {
        return excludeCredentials;
    }

    public void setExcludeCredentials(List<Map<String, Object>> excludeCredentials) {
        this.excludeCredentials = excludeCredentials;
    }
}
