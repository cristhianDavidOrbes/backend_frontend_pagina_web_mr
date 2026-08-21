package com.algolab.backend_werb_mr.dtos;

import java.time.LocalDateTime;

import com.algolab.backend_werb_mr.modelos.ProgresoOop;

public class ProgresoOopDTO {
    private Long id;
    private Integer nivel;
    private String lenguaje;
    private Boolean completado;
    private Integer puntaje;
    private Integer intentos;
    private Boolean usoPista;
    private LocalDateTime fechaUltimoIntento;
    private LocalDateTime fechaCompletado;

    public ProgresoOopDTO() {
    }

    public ProgresoOopDTO(Long id, Integer nivel, String lenguaje, Boolean completado, Integer puntaje,
            Integer intentos, Boolean usoPista, LocalDateTime fechaUltimoIntento, LocalDateTime fechaCompletado) {
        this.id = id;
        this.nivel = nivel;
        this.lenguaje = lenguaje;
        this.completado = completado;
        this.puntaje = puntaje;
        this.intentos = intentos;
        this.usoPista = usoPista;
        this.fechaUltimoIntento = fechaUltimoIntento;
        this.fechaCompletado = fechaCompletado;
    }

    public static ProgresoOopDTO desdeModelo(ProgresoOop modelo) {
        if (modelo == null) {
            return null;
        }

        return new ProgresoOopDTO(
                modelo.getId(),
                modelo.getNivel(),
                modelo.getLenguaje(),
                modelo.getCompletado(),
                modelo.getPuntaje(),
                modelo.getIntentos(),
                modelo.getUsoPista(),
                modelo.getFechaUltimoIntento(),
                modelo.getFechaCompletado());
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public LocalDateTime getFechaUltimoIntento() {
        return fechaUltimoIntento;
    }

    public void setFechaUltimoIntento(LocalDateTime fechaUltimoIntento) {
        this.fechaUltimoIntento = fechaUltimoIntento;
    }

    public LocalDateTime getFechaCompletado() {
        return fechaCompletado;
    }

    public void setFechaCompletado(LocalDateTime fechaCompletado) {
        this.fechaCompletado = fechaCompletado;
    }
}
