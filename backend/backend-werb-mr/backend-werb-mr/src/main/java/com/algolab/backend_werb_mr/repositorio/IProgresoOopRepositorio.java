package com.algolab.backend_werb_mr.repositorio;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.algolab.backend_werb_mr.modelos.ProgresoOop;
import com.algolab.backend_werb_mr.modelos.Usuario;

@Repository
public interface IProgresoOopRepositorio extends JpaRepository<ProgresoOop, Long> {
    List<ProgresoOop> findByUsuarioOrderByNivelAsc(Usuario usuario);

    Optional<ProgresoOop> findByUsuarioAndNivel(Usuario usuario, Integer nivel);

    @Query("SELECT COALESCE(SUM(p.puntaje), 0) FROM ProgresoOop p WHERE p.usuario = :usuario AND p.completado = true")
    Integer calcularPuntajeTotalOop(@Param("usuario") Usuario usuario);
}
