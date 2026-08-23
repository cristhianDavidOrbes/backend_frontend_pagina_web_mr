package com.algolab.backend_werb_mr.dtos;

public class Login2faRespuestaDTO {
    private boolean exitoso;
    private String mensaje;
    private boolean requiere2fa;
    private String token; // Full JWT if 2FA is not required
    private UsuarioRespuestaDTO usuario; // If 2FA not required
    private Metodos2faDisponiblesDTO dosFactores; // If 2FA required

    public Login2faRespuestaDTO() {
    }

    public static Login2faRespuestaDTO sesionDirecta(String token, UsuarioRespuestaDTO usuario) {
        Login2faRespuestaDTO res = new Login2faRespuestaDTO();
        res.setExitoso(true);
        res.setMensaje("Inicio de sesión exitoso");
        res.setRequiere2fa(false);
        res.setToken(token);
        res.setUsuario(usuario);
        return res;
    }

    public static Login2faRespuestaDTO requiere2fa(Metodos2faDisponiblesDTO info) {
        Login2faRespuestaDTO res = new Login2faRespuestaDTO();
        res.setExitoso(true);
        res.setMensaje("Verifica tu identidad");
        res.setRequiere2fa(true);
        res.setDosFactores(info);
        return res;
    }

    public static Login2faRespuestaDTO error(String mensaje) {
        Login2faRespuestaDTO res = new Login2faRespuestaDTO();
        res.setExitoso(false);
        res.setMensaje(mensaje);
        res.setRequiere2fa(false);
        return res;
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

    public boolean isRequiere2fa() {
        return requiere2fa;
    }

    public void setRequiere2fa(boolean requiere2fa) {
        this.requiere2fa = requiere2fa;
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

    public Metodos2faDisponiblesDTO getDosFactores() {
        return dosFactores;
    }

    public void setDosFactores(Metodos2faDisponiblesDTO dosFactores) {
        this.dosFactores = dosFactores;
    }
}
