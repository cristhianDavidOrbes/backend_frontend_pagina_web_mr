package com.algolab.backend_werb_mr.dtos;

import java.util.List;

import com.algolab.backend_werb_mr.modelos.Metodo2fa;

public class Metodos2faDisponiblesDTO {
    private boolean requiere2fa;
    private String sessionToken; // 2faSessionToken (short-lived)
    private Metodo2fa metodoPreferido;
    private EmailMetodoInfo email;
    private PasskeyMetodoInfo passkey;
    private TotpMetodoInfo totp;
    private boolean codigosRecuperacionDisponibles;

    public Metodos2faDisponiblesDTO() {
    }

    public static class EmailMetodoInfo {
        private boolean enabled;
        private boolean available;
        private String destinoEnmascarado;

        public EmailMetodoInfo() {}
        public EmailMetodoInfo(boolean enabled, boolean available, String destinoEnmascarado) {
            this.enabled = enabled;
            this.available = available;
            this.destinoEnmascarado = destinoEnmascarado;
        }
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public boolean isAvailable() { return available; }
        public void setAvailable(boolean available) { this.available = available; }
        public String getDestinoEnmascarado() { return destinoEnmascarado; }
        public void setDestinoEnmascarado(String destinoEnmascarado) { this.destinoEnmascarado = destinoEnmascarado; }
    }

    public static class PasskeyMetodoInfo {
        private boolean enabled;
        private boolean registered;
        private int totalDispositivos;
        private List<String> nombresDispositivos;

        public PasskeyMetodoInfo() {}
        public PasskeyMetodoInfo(boolean enabled, boolean registered, int totalDispositivos, List<String> nombresDispositivos) {
            this.enabled = enabled;
            this.registered = registered;
            this.totalDispositivos = totalDispositivos;
            this.nombresDispositivos = nombresDispositivos;
        }
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public boolean isRegistered() { return registered; }
        public void setRegistered(boolean registered) { this.registered = registered; }
        public int getTotalDispositivos() { return totalDispositivos; }
        public void setTotalDispositivos(int totalDispositivos) { this.totalDispositivos = totalDispositivos; }
        public List<String> getNombresDispositivos() { return nombresDispositivos; }
        public void setNombresDispositivos(List<String> nombresDispositivos) { this.nombresDispositivos = nombresDispositivos; }
    }

    public static class TotpMetodoInfo {
        private boolean enabled;
        private boolean configured;

        public TotpMetodoInfo() {}
        public TotpMetodoInfo(boolean enabled, boolean configured) {
            this.enabled = enabled;
            this.configured = configured;
        }
        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
        public boolean isConfigured() { return configured; }
        public void setConfigured(boolean configured) { this.configured = configured; }
    }

    public boolean isRequiere2fa() {
        return requiere2fa;
    }

    public void setRequiere2fa(boolean requiere2fa) {
        this.requiere2fa = requiere2fa;
    }

    public String getSessionToken() {
        return sessionToken;
    }

    public void setSessionToken(String sessionToken) {
        this.sessionToken = sessionToken;
    }

    public Metodo2fa getMetodoPreferido() {
        return metodoPreferido;
    }

    public void setMetodoPreferido(Metodo2fa metodoPreferido) {
        this.metodoPreferido = metodoPreferido;
    }

    public EmailMetodoInfo getEmail() {
        return email;
    }

    public void setEmail(EmailMetodoInfo email) {
        this.email = email;
    }

    public PasskeyMetodoInfo getPasskey() {
        return passkey;
    }

    public void setPasskey(PasskeyMetodoInfo passkey) {
        this.passkey = passkey;
    }

    public TotpMetodoInfo getTotp() {
        return totp;
    }

    public void setTotp(TotpMetodoInfo totp) {
        this.totp = totp;
    }

    public boolean isCodigosRecuperacionDisponibles() {
        return codigosRecuperacionDisponibles;
    }

    public void setCodigosRecuperacionDisponibles(boolean codigosRecuperacionDisponibles) {
        this.codigosRecuperacionDisponibles = codigosRecuperacionDisponibles;
    }
}
