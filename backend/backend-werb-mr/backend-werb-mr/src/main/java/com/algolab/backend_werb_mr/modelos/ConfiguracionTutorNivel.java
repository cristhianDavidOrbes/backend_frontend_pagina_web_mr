package com.algolab.backend_werb_mr.modelos;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "configuraciones_tutor_nivel", uniqueConstraints = {
        @UniqueConstraint(name = "uk_configuracion_tutor_nivel", columnNames = "nivel")
})
public class ConfiguracionTutorNivel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer nivel;

    @Column(nullable = false, length = 120)
    private String nombreNivel;

    @Column(nullable = false, length = 160)
    private String conceptoCentral;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String objetivoTutor;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String etapas;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String accionesEsperadas;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String erroresObservables;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String objetosClave;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String dificultadesComunes;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String criteriosDominio;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String pistasTutor;

    @Column(nullable = false, length = 1000)
    private String proximoEjercicio;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String promptAdicional;

    @Column(nullable = false)
    private Integer puntajeMaximo;

    @Column(nullable = false)
    private Integer tiempoObjetivoSegundos;

    @Column(nullable = false)
    private Boolean activo;

    @Column(nullable = false)
    private LocalDateTime fechaActualizacion;

    @PrePersist
    @PreUpdate
    public void normalizar() {
        fechaActualizacion = LocalDateTime.now();
        if (activo == null) activo = true;
        if (puntajeMaximo == null || puntajeMaximo < 1) puntajeMaximo = 100;
        if (tiempoObjetivoSegundos == null || tiempoObjetivoSegundos < 1) tiempoObjetivoSegundos = 300;
        if (etapas == null) etapas = "";
        if (accionesEsperadas == null) accionesEsperadas = "";
        if (erroresObservables == null) erroresObservables = "";
        if (objetosClave == null) objetosClave = "";
        if (dificultadesComunes == null) dificultadesComunes = "";
        if (criteriosDominio == null) criteriosDominio = "";
        if (pistasTutor == null) pistasTutor = "";
        if (proximoEjercicio == null) proximoEjercicio = "";
        if (promptAdicional == null) promptAdicional = "";
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getNivel() { return nivel; }
    public void setNivel(Integer nivel) { this.nivel = nivel; }
    public String getNombreNivel() { return nombreNivel; }
    public void setNombreNivel(String nombreNivel) { this.nombreNivel = nombreNivel; }
    public String getConceptoCentral() { return conceptoCentral; }
    public void setConceptoCentral(String conceptoCentral) { this.conceptoCentral = conceptoCentral; }
    public String getObjetivoTutor() { return objetivoTutor; }
    public void setObjetivoTutor(String objetivoTutor) { this.objetivoTutor = objetivoTutor; }
    public String getEtapas() { return etapas; }
    public void setEtapas(String etapas) { this.etapas = etapas; }
    public String getAccionesEsperadas() { return accionesEsperadas; }
    public void setAccionesEsperadas(String accionesEsperadas) { this.accionesEsperadas = accionesEsperadas; }
    public String getErroresObservables() { return erroresObservables; }
    public void setErroresObservables(String erroresObservables) { this.erroresObservables = erroresObservables; }
    public String getObjetosClave() { return objetosClave; }
    public void setObjetosClave(String objetosClave) { this.objetosClave = objetosClave; }
    public String getDificultadesComunes() { return dificultadesComunes; }
    public void setDificultadesComunes(String dificultadesComunes) { this.dificultadesComunes = dificultadesComunes; }
    public String getCriteriosDominio() { return criteriosDominio; }
    public void setCriteriosDominio(String criteriosDominio) { this.criteriosDominio = criteriosDominio; }
    public String getPistasTutor() { return pistasTutor; }
    public void setPistasTutor(String pistasTutor) { this.pistasTutor = pistasTutor; }
    public String getProximoEjercicio() { return proximoEjercicio; }
    public void setProximoEjercicio(String proximoEjercicio) { this.proximoEjercicio = proximoEjercicio; }
    public String getPromptAdicional() { return promptAdicional; }
    public void setPromptAdicional(String promptAdicional) { this.promptAdicional = promptAdicional; }
    public Integer getPuntajeMaximo() { return puntajeMaximo; }
    public void setPuntajeMaximo(Integer puntajeMaximo) { this.puntajeMaximo = puntajeMaximo; }
    public Integer getTiempoObjetivoSegundos() { return tiempoObjetivoSegundos; }
    public void setTiempoObjetivoSegundos(Integer tiempoObjetivoSegundos) { this.tiempoObjetivoSegundos = tiempoObjetivoSegundos; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    public LocalDateTime getFechaActualizacion() { return fechaActualizacion; }
}
