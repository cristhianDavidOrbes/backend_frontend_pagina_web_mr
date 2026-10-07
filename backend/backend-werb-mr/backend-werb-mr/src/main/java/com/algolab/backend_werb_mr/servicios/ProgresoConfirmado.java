package com.algolab.backend_werb_mr.servicios;

/** Se publica dentro de la transacción y se atiende solo cuando quedó confirmada. */
public record ProgresoConfirmado(Long usuarioId, Integer nivel) { }
