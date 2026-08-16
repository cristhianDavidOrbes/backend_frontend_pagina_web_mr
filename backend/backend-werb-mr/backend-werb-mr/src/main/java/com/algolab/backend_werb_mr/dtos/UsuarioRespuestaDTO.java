package com.algolab.backend_werb_mr.dtos;

import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;

public class UsuarioRespuestaDTO {
    private Long id;
    private String nombre;
    private String correo;
    private String nombreUsuario;
    private Rol rol;
    private Integer nivelActual;
    private Integer puntaje;
    private String biografia;
    private String institucion;
    private String programa;
    private String avatar;

    public UsuarioRespuestaDTO() {
    }

    public UsuarioRespuestaDTO(Long id, String nombre, String correo, Rol rol) {
        this.id = id;
        this.nombre = nombre;
        this.correo = correo;
        this.rol = rol;
        this.nivelActual = 1;
        this.puntaje = 0;
        this.avatar = "orbita";
    }

    public UsuarioRespuestaDTO(Long id, String nombre, String correo, String nombreUsuario, Rol rol,
            Integer nivelActual, Integer puntaje, String biografia, String institucion,
            String programa, String avatar) {
        this.id = id;
        this.nombre = nombre;
        this.correo = correo;
        this.nombreUsuario = nombreUsuario;
        this.rol = rol;
        this.nivelActual = nivelActual;
        this.puntaje = puntaje;
        this.biografia = biografia;
        this.institucion = institucion;
        this.programa = programa;
        this.avatar = avatar;
    }

    public static UsuarioRespuestaDTO desdeUsuario(Usuario usuario) {
        return new UsuarioRespuestaDTO(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getCorreo(),
                usuario.getNombreUsuario(),
                usuario.getRol(),
                usuario.getNivelActual(),
                usuario.getPuntaje(),
                usuario.getBiografia(),
                usuario.getInstitucion(),
                usuario.getPrograma(),
                usuario.getAvatar());
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

    public String getNombreUsuario() {
        return nombreUsuario;
    }

    public void setNombreUsuario(String nombreUsuario) {
        this.nombreUsuario = nombreUsuario;
    }

    public Rol getRol() {
        return rol;
    }

    public void setRol(Rol rol) {
        this.rol = rol;
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

    public String getBiografia() { return biografia; }
    public void setBiografia(String biografia) { this.biografia = biografia; }
    public String getInstitucion() { return institucion; }
    public void setInstitucion(String institucion) { this.institucion = institucion; }
    public String getPrograma() { return programa; }
    public void setPrograma(String programa) { this.programa = programa; }
    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }
}
