package com.algolab.backend_werb_mr.servicios;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.algolab.backend_werb_mr.repositorio.IUsuarioRepositorio;

import jakarta.persistence.EntityManager;

/** Operaciones de datos limitadas a la cuenta autenticada por el controlador. */
@Service
public class DatosUsuarioServicio {
    private final EntityManager entityManager;
    private final IUsuarioRepositorio usuarios;

    public DatosUsuarioServicio(EntityManager entityManager, IUsuarioRepositorio usuarios) {
        this.entityManager = entityManager;
        this.usuarios = usuarios;
    }

    @Transactional
    public void borrarHistorial(Long usuarioId) {
        borrarRelacion("ReporteNivel", usuarioId);
    }

    @Transactional
    public void borrarCuenta(Long usuarioId) {
        borrarRelacion("CodigoRecuperacion", usuarioId);
        borrarRelacion("Desafio2fa", usuarioId);
        borrarRelacion("DesafioSegundoFactor", usuarioId);
        borrarRelacion("WebauthnCredencial", usuarioId);
        borrarRelacion("Usuario2faConfiguracion", usuarioId);
        borrarRelacion("ProgresoNivel", usuarioId);
        borrarRelacion("ProgresoOop", usuarioId);
        borrarRelacion("ReporteNivel", usuarioId);
        entityManager.createQuery("DELETE FROM AvatarUsuario a WHERE a.usuarioId = :id")
                .setParameter("id", usuarioId).executeUpdate();
        usuarios.deleteById(usuarioId);
    }

    private void borrarRelacion(String entidad, Long usuarioId) {
        entityManager.createQuery("DELETE FROM " + entidad + " e WHERE e.usuario.id = :id")
                .setParameter("id", usuarioId).executeUpdate();
    }
}
