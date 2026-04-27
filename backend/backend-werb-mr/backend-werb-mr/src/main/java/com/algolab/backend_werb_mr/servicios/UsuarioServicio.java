package com.algolab.backend_werb_mr.servicios;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.Repositorio;

@Service
public class UsuarioServicio implements IUsuarioServicio {
    private final Repositorio repositorio;

    public UsuarioServicio(Repositorio repositorio) {
        this.repositorio = repositorio;
    }

    @Override
    public Usuario guardar(Usuario usuario) {
        return repositorio.guardar(usuario);
    }

    @Override
    public Optional<Usuario> buscarPorId(Long id) {
        return repositorio.buscarPorId(id);
    }

    @Override
    public List<Usuario> listar() {
        return repositorio.listar();
    }

    @Override
    public Usuario actualizar(Usuario usuario) {
        return repositorio.actualizar(usuario);
    }

    @Override
    public void eliminarPorId(Long id) {
        repositorio.eliminarPorId(id);
    }

    @Override
    public Optional<Usuario> buscarPorCorreo(String correo) {
        return repositorio.buscarPorCorreo(correo);
    }

    @Override
    public boolean existePorCorreo(String correo) {
        return repositorio.existePorCorreo(correo);
    }
}
