package com.algolab.backend_werb_mr.repositorio;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.algolab.backend_werb_mr.modelos.CodigoRecuperacion;

@Repository
public interface ICodigoRecuperacionRepositorio extends JpaRepository<CodigoRecuperacion, Long> {
    List<CodigoRecuperacion> findByUsuarioIdAndUsadoFalse(Long usuarioId);
    long countByUsuarioIdAndUsadoFalse(Long usuarioId);

    @Modifying
    @Query("DELETE FROM CodigoRecuperacion c WHERE c.usuario.id = :usuarioId")
    void eliminarPorUsuarioId(@Param("usuarioId") Long usuarioId);
}
