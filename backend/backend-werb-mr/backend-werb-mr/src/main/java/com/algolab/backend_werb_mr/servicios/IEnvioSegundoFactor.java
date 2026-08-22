package com.algolab.backend_werb_mr.servicios;

import com.algolab.backend_werb_mr.modelos.CanalSegundoFactor;
import com.algolab.backend_werb_mr.modelos.Usuario;

/** Punto de extension para canales reales de entrega del segundo factor. */
public interface IEnvioSegundoFactor {
    CanalSegundoFactor canal();

    boolean disponible();

    default boolean estaConfigurado() {
        return true;
    }

    void enviarCodigo(Usuario usuario, String codigo, long vigenciaSegundos);
}
