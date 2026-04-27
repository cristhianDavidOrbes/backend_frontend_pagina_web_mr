package com.algolab.backend_werb_mr.repositorio;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.algolab.backend_werb_mr.modelos.Usuario;

@Repository
public interface IUsuarioRepositorio extends JpaRepository<Usuario, Long> {
    @Query("SELECT usuario FROM Usuario usuario WHERE usuario.correo = :correo")
    Optional<Usuario> buscarPorCorreo(@Param("correo") String correo);

    @Query("SELECT COUNT(usuario) > 0 FROM Usuario usuario WHERE usuario.correo = :correo")
    boolean existePorCorreo(@Param("correo") String correo);
}
