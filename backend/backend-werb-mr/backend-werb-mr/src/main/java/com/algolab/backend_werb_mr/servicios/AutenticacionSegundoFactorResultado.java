package com.algolab.backend_werb_mr.servicios;

import com.algolab.backend_werb_mr.modelos.Usuario;

public record AutenticacionSegundoFactorResultado(String token, Usuario usuario) {
}
