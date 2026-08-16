package com.algolab.backend_werb_mr.repositorio;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.algolab.backend_werb_mr.modelos.ReporteNivel;
import com.algolab.backend_werb_mr.modelos.Usuario;

@Repository
public interface IReporteNivelRepositorio extends JpaRepository<ReporteNivel, Long> {
    Optional<ReporteNivel> findByUsuarioAndNivel(Usuario usuario, Integer nivel);
    List<ReporteNivel> findByUsuarioOrderByNivelAsc(Usuario usuario);
    List<ReporteNivel> findAllByOrderByFechaGeneracionDesc();
}
