package com.algolab.backend_werb_mr.dtos;

import com.algolab.backend_werb_mr.modelos.Usuario;

public class RankingEstudianteDTO {
    private Integer posicion;
    private Long usuarioId;
    private String nombre;
    private String nombreUsuario;
    private Integer nivelActual;
    private Integer puntaje;
    private String avatar;
    private String avatarUrl;

    public RankingEstudianteDTO() {
    }

    public RankingEstudianteDTO(Integer posicion, Usuario usuario) {
        this.posicion = posicion;
        this.usuarioId = usuario.getId();
        this.nombre = usuario.getNombre();
        this.nombreUsuario = usuario.getNombreUsuario();
        this.nivelActual = usuario.getNivelActual();
        this.puntaje = usuario.getPuntaje();
        this.avatar = usuario.getAvatar();
        this.avatarUrl = usuario.getAvatarVersion() == null ? null
                : "/api/usuarios/" + usuario.getId() + "/avatar?v=" + usuario.getAvatarVersion();
    }

    public Integer getPosicion() {
        return posicion;
    }

    public void setPosicion(Integer posicion) {
        this.posicion = posicion;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getNombreUsuario() {
        return nombreUsuario;
    }

    public void setNombreUsuario(String nombreUsuario) {
        this.nombreUsuario = nombreUsuario;
    }

    public Integer getNivelActual() {
        return nivelActual;
    }

    public void setNivelActual(Integer nivelActual) {
        this.nivelActual = nivelActual;
    }

    public Integer getPuntaje() {
        return puntaje;
    }

    public void setPuntaje(Integer puntaje) {
        this.puntaje = puntaje;
    }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
}
