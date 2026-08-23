package com.algolab.backend_werb_mr.dtos;

public class RegenerarRecuperacionRequest {
    private String contrasena;

    public RegenerarRecuperacionRequest() {
    }

    public RegenerarRecuperacionRequest(String contrasena) {
        this.contrasena = contrasena;
    }

    public String getContrasena() {
        return contrasena;
    }

    public void setContrasena(String contrasena) {
        this.contrasena = contrasena;
    }
}
