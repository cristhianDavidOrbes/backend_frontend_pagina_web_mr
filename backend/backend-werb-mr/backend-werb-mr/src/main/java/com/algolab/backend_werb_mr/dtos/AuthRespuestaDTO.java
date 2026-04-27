package com.algolab.backend_werb_mr.dtos;

public class AuthRespuestaDTO {
    private boolean exitoso;
    private String mensaje;
    private String token;
    private UsuarioRespuestaDTO usuario;

    public AuthRespuestaDTO() {
    }

    public AuthRespuestaDTO(boolean exitoso, String mensaje, String token, UsuarioRespuestaDTO usuario) {
        this.exitoso = exitoso;
        this.mensaje = mensaje;
        this.token = token;
        this.usuario = usuario;
    }

    public boolean isExitoso() {
        return exitoso;
    }

    public void setExitoso(boolean exitoso) {
        this.exitoso = exitoso;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public UsuarioRespuestaDTO getUsuario() {
        return usuario;
    }

    public void setUsuario(UsuarioRespuestaDTO usuario) {
        this.usuario = usuario;
    }
}
