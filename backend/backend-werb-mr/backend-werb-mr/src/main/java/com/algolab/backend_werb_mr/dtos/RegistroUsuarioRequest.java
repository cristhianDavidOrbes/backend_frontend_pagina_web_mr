package com.algolab.backend_werb_mr.dtos;

public class RegistroUsuarioRequest {
    private String nombre;
    private String correo;
    private String rol;
    private String contrasena;
    private String celular;
    private Boolean aceptaTerminos;
    private Boolean aceptaTratamientoDatos;
    private String versionConsentimiento;

    public RegistroUsuarioRequest() {
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public String getContrasena() {
        return contrasena;
    }

    public void setContrasena(String contrasena) {
        this.contrasena = contrasena;
    }

    public String getCelular() {
        return celular;
    }

    public void setCelular(String celular) {
        this.celular = celular;
    }

    public Boolean getAceptaTerminos() {
        return aceptaTerminos;
    }

    public void setAceptaTerminos(Boolean aceptaTerminos) {
        this.aceptaTerminos = aceptaTerminos;
    }

    public Boolean getAceptaTratamientoDatos() {
        return aceptaTratamientoDatos;
    }

    public void setAceptaTratamientoDatos(Boolean aceptaTratamientoDatos) {
        this.aceptaTratamientoDatos = aceptaTratamientoDatos;
    }

    public String getVersionConsentimiento() {
        return versionConsentimiento;
    }

    public void setVersionConsentimiento(String versionConsentimiento) {
        this.versionConsentimiento = versionConsentimiento;
    }
}
