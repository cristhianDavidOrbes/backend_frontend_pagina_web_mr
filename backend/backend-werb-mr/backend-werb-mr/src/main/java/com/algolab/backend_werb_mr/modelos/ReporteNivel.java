package com.algolab.backend_werb_mr.modelos;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "reportes_nivel", uniqueConstraints = {
        @UniqueConstraint(name = "uk_reporte_usuario_nivel", columnNames = { "usuario_id", "nivel" })
})
public class ReporteNivel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false)
    private Integer nivel;

    @Column(nullable = false, length = 120)
    private String tituloNivel;

    @Column(nullable = false)
    private Integer puntaje;

    @Column(nullable = false)
    private Integer tiempoRestante;

    @Column(nullable = false)
    private Integer intentos;

    @Column(nullable = false)
    private Boolean completado;

    @Column(nullable = false)
    private Integer dominio;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String resumen;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String fortalezas;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String aspectosMejora;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String recomendaciones;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String evidencias;

    @Column(nullable = false, length = 1000)
    private String proximoEjercicio;

    @Column(nullable = false)
    private Boolean generadoPorIa = false;

    @Column(nullable = false)
    private LocalDateTime fechaGeneracion;

    @PrePersist
    @PreUpdate
    public void normalizar() {
        if (fechaGeneracion == null) fechaGeneracion = LocalDateTime.now();
        if (generadoPorIa == null) generadoPorIa = false;
        if (completado == null) completado = false;
        if (puntaje == null) puntaje = 0;
        if (tiempoRestante == null) tiempoRestante = 0;
        if (intentos == null) intentos = 0;
        if (dominio == null) dominio = 0;
        if (resumen == null) resumen = "";
        if (fortalezas == null) fortalezas = "";
        if (aspectosMejora == null) aspectosMejora = "";
        if (recomendaciones == null) recomendaciones = "";
        if (evidencias == null) evidencias = "";
        if (proximoEjercicio == null) proximoEjercicio = "";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public Integer getNivel() { return nivel; }
    public void setNivel(Integer nivel) { this.nivel = nivel; }
    public String getTituloNivel() { return tituloNivel; }
    public void setTituloNivel(String tituloNivel) { this.tituloNivel = tituloNivel; }
    public Integer getPuntaje() { return puntaje; }
    public void setPuntaje(Integer puntaje) { this.puntaje = puntaje; }
    public Integer getTiempoRestante() { return tiempoRestante; }
    public void setTiempoRestante(Integer tiempoRestante) { this.tiempoRestante = tiempoRestante; }
    public Integer getIntentos() { return intentos; }
    public void setIntentos(Integer intentos) { this.intentos = intentos; }
    public Boolean getCompletado() { return completado; }
    public void setCompletado(Boolean completado) { this.completado = completado; }
    public Integer getDominio() { return dominio; }
    public void setDominio(Integer dominio) { this.dominio = dominio; }
    public String getResumen() { return resumen; }
    public void setResumen(String resumen) { this.resumen = resumen; }
    public String getFortalezas() { return fortalezas; }
    public void setFortalezas(String fortalezas) { this.fortalezas = fortalezas; }
    public String getAspectosMejora() { return aspectosMejora; }
    public void setAspectosMejora(String aspectosMejora) { this.aspectosMejora = aspectosMejora; }
    public String getRecomendaciones() { return recomendaciones; }
    public void setRecomendaciones(String recomendaciones) { this.recomendaciones = recomendaciones; }
    public String getEvidencias() { return evidencias; }
    public void setEvidencias(String evidencias) { this.evidencias = evidencias; }
    public String getProximoEjercicio() { return proximoEjercicio; }
    public void setProximoEjercicio(String proximoEjercicio) { this.proximoEjercicio = proximoEjercicio; }
    public Boolean getGeneradoPorIa() { return generadoPorIa; }
    public void setGeneradoPorIa(Boolean generadoPorIa) { this.generadoPorIa = generadoPorIa; }
    public LocalDateTime getFechaGeneracion() { return fechaGeneracion; }
    public void setFechaGeneracion(LocalDateTime fechaGeneracion) { this.fechaGeneracion = fechaGeneracion; }
}
