package com.algolab.backend_werb_mr.dtos;

public class DesafioSegundoFactorRespuestaDTO {
    private boolean exitoso;
    private boolean requiereSegundoFactor;
    private String mensaje;
    private String desafioId;
    private String canal;
    private String destinoEnmascarado;
    private long expiraEnSegundos;
    private long reenvioDisponibleEnSegundos;

    public DesafioSegundoFactorRespuestaDTO() {
    }

    public DesafioSegundoFactorRespuestaDTO(boolean exitoso, boolean requiereSegundoFactor, String mensaje,
            String desafioId, String canal, String destinoEnmascarado, long expiraEnSegundos,
            long reenvioDisponibleEnSegundos) {
        this.exitoso = exitoso;
        this.requiereSegundoFactor = requiereSegundoFactor;
        this.mensaje = mensaje;
        this.desafioId = desafioId;
        this.canal = canal;
        this.destinoEnmascarado = destinoEnmascarado;
        this.expiraEnSegundos = expiraEnSegundos;
        this.reenvioDisponibleEnSegundos = reenvioDisponibleEnSegundos;
    }

    public boolean isExitoso() {
        return exitoso;
    }

    public void setExitoso(boolean exitoso) {
        this.exitoso = exitoso;
    }

    public boolean isRequiereSegundoFactor() {
        return requiereSegundoFactor;
    }

    public void setRequiereSegundoFactor(boolean requiereSegundoFactor) {
        this.requiereSegundoFactor = requiereSegundoFactor;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }

    public String getDesafioId() {
        return desafioId;
    }

    public void setDesafioId(String desafioId) {
        this.desafioId = desafioId;
    }

    public String getCanal() {
        return canal;
    }

    public void setCanal(String canal) {
        this.canal = canal;
    }

    public String getDestinoEnmascarado() {
        return destinoEnmascarado;
    }

    public void setDestinoEnmascarado(String destinoEnmascarado) {
        this.destinoEnmascarado = destinoEnmascarado;
    }

    public long getExpiraEnSegundos() {
        return expiraEnSegundos;
    }

    public void setExpiraEnSegundos(long expiraEnSegundos) {
        this.expiraEnSegundos = expiraEnSegundos;
    }

    public long getReenvioDisponibleEnSegundos() {
        return reenvioDisponibleEnSegundos;
    }

    public void setReenvioDisponibleEnSegundos(long reenvioDisponibleEnSegundos) {
        this.reenvioDisponibleEnSegundos = reenvioDisponibleEnSegundos;
    }
}
