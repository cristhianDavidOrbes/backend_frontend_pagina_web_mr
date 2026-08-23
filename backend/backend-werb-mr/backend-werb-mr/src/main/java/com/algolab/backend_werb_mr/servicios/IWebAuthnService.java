package com.algolab.backend_werb_mr.servicios;

import java.util.List;

import com.algolab.backend_werb_mr.dtos.WebAuthnAuthOpcionesDTO;
import com.algolab.backend_werb_mr.dtos.WebAuthnAuthVerificarRequest;
import com.algolab.backend_werb_mr.dtos.WebAuthnRegistroOpcionesDTO;
import com.algolab.backend_werb_mr.dtos.WebAuthnRegistroVerificarRequest;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.modelos.WebauthnCredencial;

public interface IWebAuthnService {
    WebAuthnRegistroOpcionesDTO generarOpcionesRegistro(Usuario usuario, String rpId);
    WebauthnCredencial verificarRegistro(Usuario usuario, WebAuthnRegistroVerificarRequest request, String rpId);
    WebAuthnAuthOpcionesDTO generarOpcionesAutenticacion(Usuario usuario, String rpId);
    boolean verificarAutenticacion(Usuario usuario, WebAuthnAuthVerificarRequest request, String rpId);
    List<WebauthnCredencial> listarCredenciales(Long usuarioId);
    void eliminarCredencial(Usuario usuario, Long credencialId);
}
