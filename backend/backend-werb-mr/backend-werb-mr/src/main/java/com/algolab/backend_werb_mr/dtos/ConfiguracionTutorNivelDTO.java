package com.algolab.backend_werb_mr.dtos;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import com.algolab.backend_werb_mr.modelos.ConfiguracionTutorNivel;

public class ConfiguracionTutorNivelDTO {
    private Long id;
    private Integer nivel;
    private String nombreNivel;
    private String conceptoCentral;
    private String objetivoTutor;
    private List<String> etapas;
    private List<String> accionesEsperadas;
    private List<String> erroresObservables;
    private List<String> objetosClave;
    private List<String> dificultadesComunes;
    private List<String> criteriosDominio;
    private List<String> pistasTutor;
    private String proximoEjercicio;
    private String promptAdicional;
    private Integer puntajeMaximo;
    private Integer tiempoObjetivoSegundos;
    private Boolean activo;
    private LocalDateTime fechaActualizacion;

    public static ConfiguracionTutorNivelDTO desdeModelo(ConfiguracionTutorNivel modelo) {
        ConfiguracionTutorNivelDTO dto = new ConfiguracionTutorNivelDTO();
        dto.id = modelo.getId();
        dto.nivel = modelo.getNivel();
        dto.nombreNivel = modelo.getNombreNivel();
        dto.conceptoCentral = modelo.getConceptoCentral();
        dto.objetivoTutor = modelo.getObjetivoTutor();
        dto.etapas = separar(modelo.getEtapas());
        dto.accionesEsperadas = separar(modelo.getAccionesEsperadas());
        dto.erroresObservables = separar(modelo.getErroresObservables());
        dto.objetosClave = separar(modelo.getObjetosClave());
        dto.dificultadesComunes = separar(modelo.getDificultadesComunes());
        dto.criteriosDominio = separar(modelo.getCriteriosDominio());
        dto.pistasTutor = separar(modelo.getPistasTutor());
        dto.proximoEjercicio = modelo.getProximoEjercicio();
        dto.promptAdicional = modelo.getPromptAdicional();
        dto.puntajeMaximo = modelo.getPuntajeMaximo();
        dto.tiempoObjetivoSegundos = modelo.getTiempoObjetivoSegundos();
        dto.activo = modelo.getActivo();
        dto.fechaActualizacion = modelo.getFechaActualizacion();
        return dto;
    }

    public ConfiguracionTutorNivel aplicarA(ConfiguracionTutorNivel modelo) {
        modelo.setNivel(nivel);
        modelo.setNombreNivel(limpiar(nombreNivel));
        modelo.setConceptoCentral(limpiar(conceptoCentral));
        modelo.setObjetivoTutor(limpiar(objetivoTutor));
        modelo.setEtapas(unir(etapas));
        modelo.setAccionesEsperadas(unir(accionesEsperadas));
        modelo.setErroresObservables(unir(erroresObservables));
        modelo.setObjetosClave(unir(objetosClave));
        modelo.setDificultadesComunes(unir(dificultadesComunes));
        modelo.setCriteriosDominio(unir(criteriosDominio));
        modelo.setPistasTutor(unir(pistasTutor));
        modelo.setProximoEjercicio(limpiar(proximoEjercicio));
        modelo.setPromptAdicional(limpiar(promptAdicional));
        modelo.setPuntajeMaximo(puntajeMaximo);
        modelo.setTiempoObjetivoSegundos(tiempoObjetivoSegundos);
        modelo.setActivo(activo == null || activo);
        return modelo;
    }

    private static List<String> separar(String valor) {
        if (valor == null || valor.isBlank()) return List.of();
        return Arrays.stream(valor.split("\\n")).map(String::trim).filter(v -> !v.isBlank()).toList();
    }

    private static String unir(List<String> valores) {
        if (valores == null) return "";
        return valores.stream().map(ConfiguracionTutorNivelDTO::limpiar).filter(v -> !v.isBlank())
                .distinct().limit(30).reduce((a, b) -> a + "\n" + b).orElse("");
    }

    private static String limpiar(String valor) { return valor == null ? "" : valor.trim(); }

    public Long getId() { return id; }
    public Integer getNivel() { return nivel; }
    public void setNivel(Integer nivel) { this.nivel = nivel; }
    public String getNombreNivel() { return nombreNivel; }
    public void setNombreNivel(String nombreNivel) { this.nombreNivel = nombreNivel; }
    public String getConceptoCentral() { return conceptoCentral; }
    public void setConceptoCentral(String conceptoCentral) { this.conceptoCentral = conceptoCentral; }
    public String getObjetivoTutor() { return objetivoTutor; }
    public void setObjetivoTutor(String objetivoTutor) { this.objetivoTutor = objetivoTutor; }
    public List<String> getEtapas() { return etapas; }
    public void setEtapas(List<String> etapas) { this.etapas = etapas; }
    public List<String> getAccionesEsperadas() { return accionesEsperadas; }
    public void setAccionesEsperadas(List<String> accionesEsperadas) { this.accionesEsperadas = accionesEsperadas; }
    public List<String> getErroresObservables() { return erroresObservables; }
    public void setErroresObservables(List<String> erroresObservables) { this.erroresObservables = erroresObservables; }
    public List<String> getObjetosClave() { return objetosClave; }
    public void setObjetosClave(List<String> objetosClave) { this.objetosClave = objetosClave; }
    public List<String> getDificultadesComunes() { return dificultadesComunes; }
    public void setDificultadesComunes(List<String> dificultadesComunes) { this.dificultadesComunes = dificultadesComunes; }
    public List<String> getCriteriosDominio() { return criteriosDominio; }
    public void setCriteriosDominio(List<String> criteriosDominio) { this.criteriosDominio = criteriosDominio; }
    public List<String> getPistasTutor() { return pistasTutor; }
    public void setPistasTutor(List<String> pistasTutor) { this.pistasTutor = pistasTutor; }
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
