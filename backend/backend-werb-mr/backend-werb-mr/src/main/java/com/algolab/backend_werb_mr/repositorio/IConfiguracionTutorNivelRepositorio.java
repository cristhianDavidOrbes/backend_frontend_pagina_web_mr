package com.algolab.backend_werb_mr.repositorio;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.algolab.backend_werb_mr.modelos.ConfiguracionTutorNivel;

public interface IConfiguracionTutorNivelRepositorio extends JpaRepository<ConfiguracionTutorNivel, Long> {
    Optional<ConfiguracionTutorNivel> findByNivel(Integer nivel);
    List<ConfiguracionTutorNivel> findAllByOrderByNivelAsc();
}
