package com.algolab.backend_werb_mr.dtos;

import java.time.Instant;

import com.algolab.backend_werb_mr.modelos.WebauthnCredencial;

public class WebauthnCredencialDTO {
    private Long id;
    private String nombreDispositivo;
    private Instant creadoEn;
    private Instant ultimoUsoEn;

    public WebauthnCredencialDTO() {
    }

    public static WebauthnCredencialDTO desdeEntidad(WebauthnCredencial c) {
        WebauthnCredencialDTO dto = new WebauthnCredencialDTO();
        dto.setId(c.getId());
        dto.setNombreDispositivo(c.getNombreDispositivo());
        dto.setCreadoEn(c.getCreadoEn());
        dto.setUltimoUsoEn(c.getUltimoUsoEn());
        return dto;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombreDispositivo() {
        return nombreDispositivo;
    }

    public void setNombreDispositivo(String nombreDispositivo) {
        this.nombreDispositivo = nombreDispositivo;
    }

    public Instant getCreadoEn() {
        return creadoEn;
    }

    public void setCreadoEn(Instant creadoEn) {
        this.creadoEn = creadoEn;
    }

    public Instant getUltimoUsoEn() {
        return ultimoUsoEn;
    }

    public void setUltimoUsoEn(Instant ultimoUsoEn) {
        this.ultimoUsoEn = ultimoUsoEn;
    }
}
