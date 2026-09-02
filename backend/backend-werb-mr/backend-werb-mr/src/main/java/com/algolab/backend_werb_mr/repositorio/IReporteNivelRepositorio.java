package com.algolab.backend_werb_mr.repositorio;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.algolab.backend_werb_mr.modelos.ReporteNivel;
import com.algolab.backend_werb_mr.modelos.Usuario;

@Repository
public interface IReporteNivelRepositorio extends JpaRepository<ReporteNivel, Long> {
    Optional<ReporteNivel> findByUsuarioAndNivel(Usuario usuario, Integer nivel);

    @Query("SELECT r FROM ReporteNivel r LEFT JOIN FETCH r.usuario WHERE r.usuario = :usuario ORDER BY r.nivel ASC")
    List<ReporteNivel> findByUsuarioOrderByNivelAsc(@Param("usuario") Usuario usuario);

    @Query("SELECT r FROM ReporteNivel r LEFT JOIN FETCH r.usuario ORDER BY r.fechaGeneracion DESC")
    List<ReporteNivel> findAllByOrderByFechaGeneracionDesc();
}
