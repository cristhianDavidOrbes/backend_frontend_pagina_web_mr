package com.algolab.backend_werb_mr.dtos;

import com.algolab.backend_werb_mr.modelos.Metodo2fa;

public class Desactivar2faRequest {
    private Metodo2fa metodo;
    private String contrasena;
    private Long credencialId; // Optional: for removing a specific WebAuthn device

    public Desactivar2faRequest() {
    }

    public Desactivar2faRequest(Metodo2fa metodo, String contrasena) {
        this.metodo = metodo;
        this.contrasena = contrasena;
    }

    public Metodo2fa getMetodo() {
        return metodo;
    }

    public void setMetodo(Metodo2fa metodo) {
        this.metodo = metodo;
    }

    public String getContrasena() {
        return contrasena;
    }

    public void setContrasena(String contrasena) {
        this.contrasena = contrasena;
    }

    public Long getCredencialId() {
        return credencialId;
    }

    public void setCredencialId(Long credencialId) {
        this.credencialId = credencialId;
    }
}
