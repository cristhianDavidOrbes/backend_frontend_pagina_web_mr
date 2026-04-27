package com.algolab.backend_werb_mr.repositorio;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.algolab.backend_werb_mr.modelos.Usuario;

@Repository
public interface IUsuarioRepositorio extends JpaRepository<Usuario, Long> {
    Optional<Usuario> buscarPorCorreo(String correo);

    boolean existePorCorreo(String correo);
}
