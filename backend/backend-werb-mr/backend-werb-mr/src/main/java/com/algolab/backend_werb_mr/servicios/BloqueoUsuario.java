package com.algolab.backend_werb_mr.servicios;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import com.algolab.backend_werb_mr.modelos.Usuario;

/** Un mismo orden de bloqueo para prácticas VR, web e informes de una cuenta. */
final class BloqueoUsuario {
    private BloqueoUsuario() { }

    static Usuario recargar(EntityManager entityManager, Usuario usuario) {
        if (entityManager == null || usuario == null || usuario.getId() == null) return usuario;
        Usuario vigente = entityManager.find(Usuario.class, usuario.getId(), LockModeType.PESSIMISTIC_WRITE);
        if (vigente == null) throw new IllegalArgumentException("Usuario no válido");
        // OpenEntityManagerInView puede haber cargado este perfil antes de esperar
        // el bloqueo. Obtener el lock no actualiza automáticamente sus campos.
        entityManager.refresh(vigente, LockModeType.PESSIMISTIC_WRITE);
        return vigente;
    }
}
