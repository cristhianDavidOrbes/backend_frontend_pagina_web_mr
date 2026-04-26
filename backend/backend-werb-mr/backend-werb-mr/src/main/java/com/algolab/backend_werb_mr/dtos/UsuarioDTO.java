package com.algolab.backend_werb_mr.dtos;

import com.algolab.backend_werb_mr.modelos.Rol;

public class UsuarioDTO {
    private Long id;
    private String name;
    private String mail;
    private Rol rol;

    public UsuarioDTO() {
    }

    public UsuarioDTO(Long id, String name, String mail, Rol rol) {
        this.id = id;
        this.name = name;
        this.mail = mail;
        this.rol = rol;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getMail() {
        return mail;
    }

    public void setMail(String mail) {
        this.mail = mail;
    }

    public Rol getRol() {
        return rol;
    }

    public void setRol(Rol rol) {
        this.rol = rol;
    }
}
