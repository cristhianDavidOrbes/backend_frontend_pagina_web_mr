package com.algolab.backend_werb_mr.dtos;

import java.util.List;

public class ProgresoUsuarioDTO {
    private Long usuarioId;
    private Integer nivelActual;
    private Integer puntajeTotal;
    private List<ProgresoNivelDTO> niveles;
    private Integer nivelesVrCompletados;
    private Integer totalNivelesVr;
    private Integer nivelesWebCompletados;
    private Integer totalNivelesWeb;
    private Boolean rutaVrCompletada;
    private Boolean rutaWebCompletada;
    private String categoria;

    public ProgresoUsuarioDTO() {
    }

    public ProgresoUsuarioDTO(Long usuarioId, Integer nivelActual, Integer puntajeTotal,
            List<ProgresoNivelDTO> niveles) {
        this(usuarioId, nivelActual, puntajeTotal, niveles, 0, 6, 0, 8, false, false, "Junior");
    }

    public ProgresoUsuarioDTO(Long usuarioId, Integer nivelActual, Integer puntajeTotal,
            List<ProgresoNivelDTO> niveles, Integer nivelesVrCompletados, Integer totalNivelesVr,
            Integer nivelesWebCompletados, Integer totalNivelesWeb, Boolean rutaVrCompletada,
            Boolean rutaWebCompletada, String categoria) {
        this.usuarioId = usuarioId;
        this.nivelActual = nivelActual;
        this.puntajeTotal = puntajeTotal;
        this.niveles = niveles;
        this.nivelesVrCompletados = nivelesVrCompletados;
        this.totalNivelesVr = totalNivelesVr;
        this.nivelesWebCompletados = nivelesWebCompletados;
        this.totalNivelesWeb = totalNivelesWeb;
        this.rutaVrCompletada = rutaVrCompletada;
        this.rutaWebCompletada = rutaWebCompletada;
        this.categoria = categoria;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public Integer getNivelActual() {
        return nivelActual;
    }

    public void setNivelActual(Integer nivelActual) {
        this.nivelActual = nivelActual;
    }

    public Integer getPuntajeTotal() {
        return puntajeTotal;
    }

    public void setPuntajeTotal(Integer puntajeTotal) {
        this.puntajeTotal = puntajeTotal;
    }

    public List<ProgresoNivelDTO> getNiveles() {
        return niveles;
    }

    public void setNiveles(List<ProgresoNivelDTO> niveles) {
        this.niveles = niveles;
    }

    public Integer getNivelesVrCompletados() {
        return nivelesVrCompletados;
    }

    public void setNivelesVrCompletados(Integer nivelesVrCompletados) {
        this.nivelesVrCompletados = nivelesVrCompletados;
    }

    public Integer getTotalNivelesVr() {
        return totalNivelesVr;
    }

    public void setTotalNivelesVr(Integer totalNivelesVr) {
        this.totalNivelesVr = totalNivelesVr;
    }

    public Integer getNivelesWebCompletados() {
        return nivelesWebCompletados;
    }

    public void setNivelesWebCompletados(Integer nivelesWebCompletados) {
        this.nivelesWebCompletados = nivelesWebCompletados;
    }

    public Integer getTotalNivelesWeb() {
        return totalNivelesWeb;
    }

    public void setTotalNivelesWeb(Integer totalNivelesWeb) {
        this.totalNivelesWeb = totalNivelesWeb;
    }

    public Boolean getRutaVrCompletada() {
        return rutaVrCompletada;
    }

    public void setRutaVrCompletada(Boolean rutaVrCompletada) {
        this.rutaVrCompletada = rutaVrCompletada;
    }

    public Boolean getRutaWebCompletada() {
        return rutaWebCompletada;
    }

    public void setRutaWebCompletada(Boolean rutaWebCompletada) {
        this.rutaWebCompletada = rutaWebCompletada;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }
}
