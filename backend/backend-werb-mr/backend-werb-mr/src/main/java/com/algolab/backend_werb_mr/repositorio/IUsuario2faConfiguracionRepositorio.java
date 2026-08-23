package com.algolab.backend_werb_mr.repositorio;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.algolab.backend_werb_mr.modelos.Usuario2faConfiguracion;

@Repository
public interface IUsuario2faConfiguracionRepositorio extends JpaRepository<Usuario2faConfiguracion, Long> {
    Optional<Usuario2faConfiguracion> findByUsuarioId(Long usuarioId);
    Optional<Usuario2faConfiguracion> findByUsuarioCorreo(String correo);
}
