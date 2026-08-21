package com.algolab.backend_werb_mr.dtos;

import java.util.List;

public class ProgresoOopUsuarioDTO {
    private Long usuarioId;
    private Integer puntajeOopTotal;
    private Integer puntajeGlobalTotal;
    private List<ProgresoOopDTO> niveles;

    public ProgresoOopUsuarioDTO() {
    }

    public ProgresoOopUsuarioDTO(Long usuarioId, Integer puntajeOopTotal, Integer puntajeGlobalTotal,
            List<ProgresoOopDTO> niveles) {
        this.usuarioId = usuarioId;
        this.puntajeOopTotal = puntajeOopTotal;
        this.puntajeGlobalTotal = puntajeGlobalTotal;
        this.niveles = niveles;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public Integer getPuntajeOopTotal() {
        return puntajeOopTotal;
    }

    public void setPuntajeOopTotal(Integer puntajeOopTotal) {
        this.puntajeOopTotal = puntajeOopTotal;
    }

    public Integer getPuntajeGlobalTotal() {
        return puntajeGlobalTotal;
    }

    public void setPuntajeGlobalTotal(Integer puntajeGlobalTotal) {
        this.puntajeGlobalTotal = puntajeGlobalTotal;
    }

    public List<ProgresoOopDTO> getNiveles() {
        return niveles;
    }

    public void setNiveles(List<ProgresoOopDTO> niveles) {
        this.niveles = niveles;
    }
}
