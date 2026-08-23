package com.algolab.backend_werb_mr.servicios;

import java.util.List;

import com.algolab.backend_werb_mr.modelos.Usuario;

public interface IRecoveryCodeService {
    List<String> generarYGuardarCodigos(Usuario usuario, int cantidad);
    boolean validarYConsumirCodigo(Usuario usuario, String codigoPlano);
    int contarCodigosDisponibles(Long usuarioId);
}
