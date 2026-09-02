package com.algolab.backend_werb_mr.dtos;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import com.algolab.backend_werb_mr.modelos.ReporteNivel;

public class ReporteNivelDTO {
    private Long id;
    private Long usuarioId;
    private String usuarioNombre;
    private Integer nivel;
    private String tituloNivel;
    private Integer puntaje;
    private Integer tiempoRestante;
    private Integer intentos;
    private Boolean completado;
    private Integer dominio;
    private String resumen;
    private List<String> fortalezas;
    private List<String> aspectosMejora;
    private List<String> recomendaciones;
    private List<String> evidencias;
    private String proximoEjercicio;
    private Boolean generadoPorIa;
    private LocalDateTime fechaGeneracion;

    public static ReporteNivelDTO desdeModelo(ReporteNivel reporte) {
        if (reporte == null) return null;
        ReporteNivelDTO dto = new ReporteNivelDTO();
        dto.id = reporte.getId();
        dto.usuarioId = reporte.getUsuario() != null ? reporte.getUsuario().getId() : null;
        dto.usuarioNombre = reporte.getUsuario() != null ? reporte.getUsuario().getNombre() : "";
        dto.nivel = reporte.getNivel() != null ? reporte.getNivel() : 1;
        dto.tituloNivel = reporte.getTituloNivel() != null ? reporte.getTituloNivel() : "";
        dto.puntaje = reporte.getPuntaje() != null ? reporte.getPuntaje() : 0;
        dto.tiempoRestante = reporte.getTiempoRestante() != null ? reporte.getTiempoRestante() : 0;
        dto.intentos = reporte.getIntentos() != null ? reporte.getIntentos() : 0;
        dto.completado = reporte.getCompletado() != null ? reporte.getCompletado() : false;
        dto.dominio = reporte.getDominio() != null ? reporte.getDominio() : 0;
        dto.resumen = reporte.getResumen() != null ? reporte.getResumen() : "";
        dto.fortalezas = separar(reporte.getFortalezas());
        dto.aspectosMejora = separar(reporte.getAspectosMejora());
        dto.recomendaciones = separar(reporte.getRecomendaciones());
        dto.evidencias = separar(reporte.getEvidencias());
        dto.proximoEjercicio = reporte.getProximoEjercicio() != null ? reporte.getProximoEjercicio() : "";
        dto.generadoPorIa = reporte.getGeneradoPorIa() != null ? reporte.getGeneradoPorIa() : false;
        dto.fechaGeneracion = reporte.getFechaGeneracion() != null ? reporte.getFechaGeneracion() : LocalDateTime.now();
        return dto;
    }

    private static List<String> separar(String valor) {
        if (valor == null || valor.isBlank()) return List.of();
        return Arrays.stream(valor.split("\\n"))
                .map(String::trim).filter(item -> !item.isBlank()).toList();
    }

    public Long getId() { return id; }
    public Long getUsuarioId() { return usuarioId; }
    public String getUsuarioNombre() { return usuarioNombre; }
    public Integer getNivel() { return nivel; }
    public String getTituloNivel() { return tituloNivel; }
    public Integer getPuntaje() { return puntaje; }
    public Integer getTiempoRestante() { return tiempoRestante; }
    public Integer getIntentos() { return intentos; }
    public Boolean getCompletado() { return completado; }
    public Integer getDominio() { return dominio; }
    public String getResumen() { return resumen; }
    public List<String> getFortalezas() { return fortalezas; }
    public List<String> getAspectosMejora() { return aspectosMejora; }
    public List<String> getRecomendaciones() { return recomendaciones; }
    public List<String> getEvidencias() { return evidencias; }
    public String getProximoEjercicio() { return proximoEjercicio; }
    public Boolean getGeneradoPorIa() { return generadoPorIa; }
    public LocalDateTime getFechaGeneracion() { return fechaGeneracion; }
}
