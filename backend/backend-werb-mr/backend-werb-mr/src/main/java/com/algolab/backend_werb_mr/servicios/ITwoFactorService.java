package com.algolab.backend_werb_mr.servicios;

import java.util.List;

import com.algolab.backend_werb_mr.dtos.Configuracion2faUsuarioDTO;
import com.algolab.backend_werb_mr.dtos.Login2faRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.Metodos2faDisponiblesDTO;
import com.algolab.backend_werb_mr.dtos.TotpSetupRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.WebAuthnAuthOpcionesDTO;
import com.algolab.backend_werb_mr.dtos.WebAuthnAuthVerificarRequest;
import com.algolab.backend_werb_mr.dtos.WebAuthnRegistroOpcionesDTO;
import com.algolab.backend_werb_mr.dtos.WebAuthnRegistroVerificarRequest;
import com.algolab.backend_werb_mr.dtos.WebauthnCredencialDTO;
import com.algolab.backend_werb_mr.modelos.Metodo2fa;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.modelos.Usuario2faConfiguracion;

public interface ITwoFactorService {
    Usuario2faConfiguracion obtenerOCrearConfiguracion(Usuario usuario);
    Metodos2faDisponiblesDTO consultarMetodosDisponibles(Usuario usuario, String sessionToken);
    Configuracion2faUsuarioDTO obtenerConfiguracionUsuario(Usuario usuario);

    Login2faRespuestaDTO procesarLogin(String correo, String contrasena);
    Usuario resolverUsuarioPorSessionToken(String sessionToken);

    // Email OTP
    void enviarEmailOtp(Usuario usuario);
    AutenticacionSegundoFactorResultado verificarEmailOtp(Usuario usuario, String codigo);

    // TOTP / Google Authenticator
    TotpSetupRespuestaDTO iniciarSetupTotp(Usuario usuario);
    List<String> confirmarSetupTotp(Usuario usuario, String codigo);
    AutenticacionSegundoFactorResultado verificarTotp(Usuario usuario, String codigo);

    // WebAuthn / Passkeys
    WebAuthnRegistroOpcionesDTO generarOpcionesRegistroPasskey(Usuario usuario, String rpId);
    List<String> verificarRegistroPasskey(Usuario usuario, WebAuthnRegistroVerificarRequest request, String rpId);
    WebAuthnAuthOpcionesDTO generarOpcionesAuthPasskey(Usuario usuario, String rpId);
    AutenticacionSegundoFactorResultado verificarAuthPasskey(Usuario usuario, WebAuthnAuthVerificarRequest request, String rpId);

    // Recovery Codes
    AutenticacionSegundoFactorResultado verificarCodigoRecuperacion(Usuario usuario, String codigo);
    List<String> regenerarCodigosRecuperacion(Usuario usuario, String contrasena);

    // Configuration management
    void desactivarMetodo(Usuario usuario, Metodo2fa metodo, String contrasena, Long credencialId);
    void actualizarMetodoPreferido(Usuario usuario, Metodo2fa metodo);
    void activarEmailMetodo(Usuario usuario, boolean activar);
}
