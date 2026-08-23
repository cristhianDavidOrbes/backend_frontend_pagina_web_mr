package com.algolab.backend_werb_mr.dtos;

import java.util.List;

import com.algolab.backend_werb_mr.modelos.Metodo2fa;

public class Configuracion2faUsuarioDTO {
    private boolean emailHabilitado;
    private boolean emailDisponible;
    private String emailDestino;

    private boolean totpHabilitado;
    private boolean totpConfigurado;

    private boolean passkeyHabilitado;
    private List<WebauthnCredencialDTO> passkeys;

    private Metodo2fa metodoPreferido;
    private int codigosRecuperacionRestantes;

    public Configuracion2faUsuarioDTO() {
    }

    public boolean isEmailHabilitado() {
        return emailHabilitado;
    }

    public void setEmailHabilitado(boolean emailHabilitado) {
        this.emailHabilitado = emailHabilitado;
    }

    public boolean isEmailDisponible() {
        return emailDisponible;
    }

    public void setEmailDisponible(boolean emailDisponible) {
        this.emailDisponible = emailDisponible;
    }

    public String getEmailDestino() {
        return emailDestino;
    }

    public void setEmailDestino(String emailDestino) {
        this.emailDestino = emailDestino;
    }

    public boolean isTotpHabilitado() {
        return totpHabilitado;
    }

    public void setTotpHabilitado(boolean totpHabilitado) {
        this.totpHabilitado = totpHabilitado;
    }

    public boolean isTotpConfigurado() {
        return totpConfigurado;
    }

    public void setTotpConfigurado(boolean totpConfigurado) {
        this.totpConfigurado = totpConfigurado;
    }

    public boolean isPasskeyHabilitado() {
        return passkeyHabilitado;
    }

    public void setPasskeyHabilitado(boolean passkeyHabilitado) {
        this.passkeyHabilitado = passkeyHabilitado;
    }

    public List<WebauthnCredencialDTO> getPasskeys() {
        return passkeys;
    }

    public void setPasskeys(List<WebauthnCredencialDTO> passkeys) {
        this.passkeys = passkeys;
    }

    public Metodo2fa getMetodoPreferido() {
        return metodoPreferido;
    }

    public void setMetodoPreferido(Metodo2fa metodoPreferido) {
        this.metodoPreferido = metodoPreferido;
    }

    public int getCodigosRecuperacionRestantes() {
        return codigosRecuperacionRestantes;
    }

    public void setCodigosRecuperacionRestantes(int codigosRecuperacionRestantes) {
        this.codigosRecuperacionRestantes = codigosRecuperacionRestantes;
    }
}
