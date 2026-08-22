package com.algolab.backend_werb_mr.dtos;

import java.util.List;

public class ActualizarReporteIaRequest {
    private Integer dominio;
    private String resumen;
    private List<String> fortalezas;
    private List<String> aspectosMejora;
    private List<String> recomendaciones;
    private Integer puntajeBase;
    private Integer tiempoRestanteBase;
    private Integer intentosBase;
    private Boolean completadoBase;

    public Integer getDominio() { return dominio; }
    public void setDominio(Integer dominio) { this.dominio = dominio; }
    public String getResumen() { return resumen; }
    public void setResumen(String resumen) { this.resumen = resumen; }
    public List<String> getFortalezas() { return fortalezas; }
    public void setFortalezas(List<String> fortalezas) { this.fortalezas = fortalezas; }
    public List<String> getAspectosMejora() { return aspectosMejora; }
    public void setAspectosMejora(List<String> aspectosMejora) { this.aspectosMejora = aspectosMejora; }
    public List<String> getRecomendaciones() { return recomendaciones; }
    public void setRecomendaciones(List<String> recomendaciones) { this.recomendaciones = recomendaciones; }
    public Integer getPuntajeBase() { return puntajeBase; }
    public void setPuntajeBase(Integer puntajeBase) { this.puntajeBase = puntajeBase; }
    public Integer getTiempoRestanteBase() { return tiempoRestanteBase; }
    public void setTiempoRestanteBase(Integer tiempoRestanteBase) { this.tiempoRestanteBase = tiempoRestanteBase; }
    public Integer getIntentosBase() { return intentosBase; }
    public void setIntentosBase(Integer intentosBase) { this.intentosBase = intentosBase; }
    public Boolean getCompletadoBase() { return completadoBase; }
    public void setCompletadoBase(Boolean completadoBase) { this.completadoBase = completadoBase; }
}
