package com.algolab.backend_werb_mr.repositorio;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.algolab.backend_werb_mr.modelos.WebauthnCredencial;

@Repository
public interface IWebauthnCredencialRepositorio extends JpaRepository<WebauthnCredencial, Long> {
    List<WebauthnCredencial> findByUsuarioIdOrderByCreadoEnDesc(Long usuarioId);
    Optional<WebauthnCredencial> findByCredentialId(String credentialId);
    long countByUsuarioId(Long usuarioId);
    void deleteByUsuarioIdAndId(Long usuarioId, Long id);
}
