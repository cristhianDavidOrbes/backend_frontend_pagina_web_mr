package com.algolab.backend_werb_mr.servicios;

public interface ITotpService {
    String generarNuevoSecretBase32();
    String cifrarSecret(String secretBase32);
    String descifrarSecret(String secretCifrado);
    String generarUri(String cuenta, String secretBase32);
    boolean validarCodigo(String secretBase32, String codigo);
}
