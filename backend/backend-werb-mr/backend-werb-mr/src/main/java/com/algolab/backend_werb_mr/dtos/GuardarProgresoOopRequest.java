package com.algolab.backend_werb_mr.dtos;

public class GuardarProgresoOopRequest {
    private Integer nivel;
    private String lenguaje = "python";
    private Boolean completado = false;
    private Integer puntaje = 0;
    private Integer intentos = 0;
    private Boolean usoPista = false;

    public GuardarProgresoOopRequest() {
    }

    public GuardarProgresoOopRequest(Integer nivel, String lenguaje, Boolean completado, Integer puntaje,
            Integer intentos, Boolean usoPista) {
        this.nivel = nivel;
        this.lenguaje = lenguaje;
        this.completado = completado;
        this.puntaje = puntaje;
        this.intentos = intentos;
        this.usoPista = usoPista;
    }

    public Integer getNivel() {
        return nivel;
    }

    public void setNivel(Integer nivel) {
        this.nivel = nivel;
    }

    public String getLenguaje() {
        return lenguaje;
    }

    public void setLenguaje(String lenguaje) {
        this.lenguaje = lenguaje;
    }

    public Boolean getCompletado() {
        return completado;
    }

    public void setCompletado(Boolean completado) {
        this.completado = completado;
    }

    public Integer getPuntaje() {
        return puntaje;
    }

    public void setPuntaje(Integer puntaje) {
        this.puntaje = puntaje;
    }

    public Integer getIntentos() {
        return intentos;
    }

    public void setIntentos(Integer intentos) {
        this.intentos = intentos;
    }

    public Boolean getUsoPista() {
        return usoPista;
    }

    public void setUsoPista(Boolean usoPista) {
        this.usoPista = usoPista;
    }
}
