package com.algolab.backend_werb_mr.servicios;

import java.util.Optional;

import com.algolab.backend_werb_mr.dtos.GuardarProgresoOopRequest;
import com.algolab.backend_werb_mr.dtos.ProgresoOopUsuarioDTO;
import com.algolab.backend_werb_mr.modelos.Usuario;

public interface IProgresoOopServicio {
    Optional<Usuario> buscarUsuarioAutenticado(String correo);

    ProgresoOopUsuarioDTO consultarProgreso(Usuario usuario);

    ProgresoOopUsuarioDTO guardarProgreso(Usuario usuario, GuardarProgresoOopRequest request);

    int obtenerPuntajeOopTotal(Usuario usuario);
}
