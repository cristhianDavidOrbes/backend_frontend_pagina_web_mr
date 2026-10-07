package com.algolab.backend_werb_mr.servicios;

import java.util.List;
import java.util.Optional;

import com.algolab.backend_werb_mr.modelos.Usuario;

public interface IUsuarioServicio {
    Usuario guardar(Usuario usuario);

    Usuario registrar(Usuario usuario);

    Optional<Usuario> iniciarSesion(String correo, String contrasena);

    Optional<Usuario> buscarPorId(Long id);

    List<Usuario> listar();

    List<Usuario> listarRankingEstudiantes();

    Usuario actualizar(Usuario usuario);

    default Usuario actualizarPerfil(Usuario usuario) { return actualizar(usuario); }

    default Usuario marcarTutorialCompletado(Usuario usuario) {
        usuario.setTutorialCompletado(true);
        return actualizar(usuario);
    }

    default Usuario actualizarFicha(Usuario usuario, boolean incluirRol, boolean incluirNivel, boolean incluirPuntaje) {
        return actualizar(usuario);
    }

    default Usuario corregirProgreso(Usuario usuario, boolean incluirNivel, boolean incluirPuntaje) {
        return actualizar(usuario);
    }

    void eliminarPorId(Long id);

    Optional<Usuario> buscarPorCorreo(String correo);

    boolean existePorCorreo(String correo);

    boolean existePorNombreUsuario(String nombreUsuario);

    boolean existePorCorreoONombreUsuario(String identificador);
}
