package com.algolab.backend_werb_mr.repositorio;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.algolab.backend_werb_mr.modelos.Desafio2fa;
import com.algolab.backend_werb_mr.modelos.TipoDesafio2fa;

@Repository
public interface IDesafio2faRepositorio extends JpaRepository<Desafio2fa, Long> {
    Optional<Desafio2fa> findByDesafioId(String desafioId);

    @Modifying
    @Query("UPDATE Desafio2fa d SET d.invalidado = true WHERE d.usuario.id = :usuarioId AND d.tipo = :tipo AND d.usado = false")
    void invalidarDesafiosActivos(@Param("usuarioId") Long usuarioId, @Param("tipo") TipoDesafio2fa tipo);
}
