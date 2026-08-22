package com.algolab.backend_werb_mr.modelos;

/**
 * Canales soportados por el flujo de segundo factor.
 *
 * CORREO es el unico canal habilitado. Agregar SMS exige integrar un proveedor
 * real y sus credenciales; nunca se simula enviando o devolviendo el codigo.
 */
public enum CanalSegundoFactor {
    CORREO,
    SMS
}
