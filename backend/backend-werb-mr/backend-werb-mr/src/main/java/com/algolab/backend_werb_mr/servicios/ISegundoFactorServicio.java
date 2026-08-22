package com.algolab.backend_werb_mr.servicios;

import com.algolab.backend_werb_mr.dtos.DesafioSegundoFactorRespuestaDTO;
import com.algolab.backend_werb_mr.modelos.CanalSegundoFactor;
import com.algolab.backend_werb_mr.modelos.Usuario;

public interface ISegundoFactorServicio {
    DesafioSegundoFactorRespuestaDTO crearDesafio(Usuario usuario, CanalSegundoFactor canal);

    AutenticacionSegundoFactorResultado verificar(String desafioId, String codigo);

    DesafioSegundoFactorRespuestaDTO reenviar(String desafioId);
}
