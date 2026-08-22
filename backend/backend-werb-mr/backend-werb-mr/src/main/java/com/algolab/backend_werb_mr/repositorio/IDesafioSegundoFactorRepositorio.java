package com.algolab.backend_werb_mr.repositorio;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.algolab.backend_werb_mr.modelos.DesafioSegundoFactor;

import jakarta.persistence.LockModeType;

@Repository
public interface IDesafioSegundoFactorRepositorio extends JpaRepository<DesafioSegundoFactor, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM DesafioSegundoFactor d JOIN FETCH d.usuario WHERE d.identificador = :identificador")
    Optional<DesafioSegundoFactor> buscarPorIdentificadorParaActualizar(
            @Param("identificador") String identificador);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE DesafioSegundoFactor d
            SET d.invalidado = true
            WHERE d.usuario.id = :usuarioId
              AND d.usado = false
              AND d.invalidado = false
            """)
    int invalidarActivosDelUsuario(@Param("usuarioId") Long usuarioId);
}
