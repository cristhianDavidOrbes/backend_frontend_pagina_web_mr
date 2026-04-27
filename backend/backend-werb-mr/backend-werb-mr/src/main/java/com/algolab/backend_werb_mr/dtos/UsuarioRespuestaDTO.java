package com.algolab.backend_werb_mr.dtos;

import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;

public class UsuarioRespuestaDTO {
    private Long id;
    private String nombre;
    private String correo;
    private Rol rol;

    public UsuarioRespuestaDTO() {
    }

    public UsuarioRespuestaDTO(Long id, String nombre, String correo, Rol rol) {
        this.id = id;
        this.nombre = nombre;
        this.correo = correo;
        this.rol = rol;
    }

    public static UsuarioRespuestaDTO desdeUsuario(Usuario usuario) {
        return new UsuarioRespuestaDTO(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getCorreo(),
                usuario.getRol());
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getCorreo() {
        return correo;
    }

    public void setCorreo(String correo) {
        this.correo = correo;
    }

    public Rol getRol() {
        return rol;
    }

    public void setRol(Rol rol) {
        this.rol = rol;
    }
}
