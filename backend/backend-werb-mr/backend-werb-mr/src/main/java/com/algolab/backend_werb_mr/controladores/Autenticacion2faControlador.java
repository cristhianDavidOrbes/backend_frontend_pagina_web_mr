package com.algolab.backend_werb_mr.controladores;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.algolab.backend_werb_mr.dtos.ActualizarMetodoPreferidoRequest;
import com.algolab.backend_werb_mr.dtos.AuthRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.ConfirmarTotpRequest;
import com.algolab.backend_werb_mr.dtos.Configuracion2faUsuarioDTO;
import com.algolab.backend_werb_mr.dtos.Desactivar2faRequest;
import com.algolab.backend_werb_mr.dtos.EnviarEmailOtpRequest;
import com.algolab.backend_werb_mr.dtos.Login2faRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.LoginRequest;
import com.algolab.backend_werb_mr.dtos.Metodos2faDisponiblesDTO;
import com.algolab.backend_werb_mr.dtos.RegenerarRecuperacionRequest;
import com.algolab.backend_werb_mr.dtos.TotpSetupRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.UsuarioRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.VerificarEmailOtpRequest;
import com.algolab.backend_werb_mr.dtos.VerificarRecuperacionRequest;
import com.algolab.backend_werb_mr.dtos.VerificarTotpRequest;
import com.algolab.backend_werb_mr.dtos.WebAuthnAuthOpcionesDTO;
import com.algolab.backend_werb_mr.dtos.WebAuthnAuthVerificarRequest;
import com.algolab.backend_werb_mr.dtos.WebAuthnRegistroOpcionesDTO;
import com.algolab.backend_werb_mr.dtos.WebAuthnRegistroVerificarRequest;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.seguridad.CorreoInstitucional;
import com.algolab.backend_werb_mr.servicios.AutenticacionSegundoFactorResultado;
import com.algolab.backend_werb_mr.servicios.ITwoFactorService;
import com.algolab.backend_werb_mr.servicios.IUsuarioServicio;
import com.algolab.backend_werb_mr.servicios.SegundoFactorException;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth/2fa")
public class Autenticacion2faControlador {
    private static final Logger logger = LoggerFactory.getLogger(Autenticacion2faControlador.class);

    private final ITwoFactorService twoFactorService;
    private final IUsuarioServicio usuarioServicio;

    public Autenticacion2faControlador(ITwoFactorService twoFactorService, IUsuarioServicio usuarioServicio) {
        this.twoFactorService = twoFactorService;
        this.usuarioServicio = usuarioServicio;
    }

    private String obtenerRpId(HttpServletRequest request) {
        String host = request.getHeader("Host");
        if (host == null || host.isBlank()) {
            return "localhost";
        }
        return host.split(":")[0];
    }

    private Usuario resolverUsuario(String sessionToken, Authentication authentication) {
        if (sessionToken != null && !sessionToken.isBlank()) {
            return twoFactorService.resolverUsuarioPorSessionToken(sessionToken);
        }
        if (authentication != null && authentication.getName() != null) {
            return usuarioServicio.buscarPorCorreo(authentication.getName()).orElse(null);
        }
        return null;
    }

    @PostMapping(value = "/iniciar-sesion", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Login2faRespuestaDTO> iniciarSesion(@RequestBody LoginRequest request) {
        if (request == null || request.getCorreo() == null || request.getContrasena() == null) {
            return ResponseEntity.badRequest().body(Login2faRespuestaDTO.error("Debe enviar correo y contraseña"));
        }

        String correo = CorreoInstitucional.normalizar(request.getCorreo());
        if (!CorreoInstitucional.esValido(correo)) {
            return ResponseEntity.badRequest().body(Login2faRespuestaDTO.error("Solo se permite el correo institucional " + CorreoInstitucional.DOMINIO));
        }

        Login2faRespuestaDTO resultado = twoFactorService.procesarLogin(correo, request.getContrasena());
        if (!resultado.isExitoso()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(resultado);
        }
        return ResponseEntity.ok(resultado);
    }

    @GetMapping("/metodos")
    public ResponseEntity<?> consultarMetodos(
            @RequestHeader(value = "X-2FA-Session-Token", required = false) String sessionTokenHeader,
            Authentication authentication) {
        Usuario usuario = resolverUsuario(sessionTokenHeader, authentication);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("mensaje", "No autorizado"));
        }
        Metodos2faDisponiblesDTO metodos = twoFactorService.consultarMetodosDisponibles(usuario, sessionTokenHeader);
        return ResponseEntity.ok(metodos);
    }

    @PostMapping(value = "/email/enviar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> enviarEmailOtp(
            @RequestBody(required = false) EnviarEmailOtpRequest request,
            @RequestHeader(value = "X-2FA-Session-Token", required = false) String headerToken,
            Authentication authentication) {
        String token = (request != null && request.getSessionToken() != null) ? request.getSessionToken() : headerToken;
        Usuario usuario = resolverUsuario(token, authentication);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("mensaje", "Sesión de autenticación expirada"));
        }

        try {
            twoFactorService.enviarEmailOtp(usuario);
            return ResponseEntity.ok(Map.of("exitoso", true, "mensaje", "Código de seguridad enviado a tu correo institucional."));
        } catch (SegundoFactorException e) {
            return ResponseEntity.status(e.getEstado()).body(Map.of("exitoso", false, "mensaje", e.getMessage()));
        }
    }

    @PostMapping(value = "/email/verificar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AuthRespuestaDTO> verificarEmailOtp(
            @RequestBody VerificarEmailOtpRequest request,
            @RequestHeader(value = "X-2FA-Session-Token", required = false) String headerToken,
            Authentication authentication) {
        if (request == null || request.getCodigo() == null) {
            return ResponseEntity.badRequest().body(new AuthRespuestaDTO(false, "Debe ingresar el código de 6 dígitos", null, null));
        }

        String token = request.getSessionToken() != null ? request.getSessionToken() : headerToken;
        Usuario usuario = resolverUsuario(token, authentication);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new AuthRespuestaDTO(false, "Sesión expirada", null, null));
        }

        try {
            AutenticacionSegundoFactorResultado res = twoFactorService.verificarEmailOtp(usuario, request.getCodigo());
            return ResponseEntity.ok(new AuthRespuestaDTO(true, "Identidad verificada exitosamente", res.token(), UsuarioRespuestaDTO.desdeUsuario(res.usuario())));
        } catch (SegundoFactorException e) {
            return ResponseEntity.status(e.getEstado()).body(new AuthRespuestaDTO(false, e.getMessage(), null, null));
        }
    }

    @PostMapping("/totp/setup")
    public ResponseEntity<?> iniciarSetupTotp(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("mensaje", "No autenticado"));
        }
        Usuario usuario = usuarioServicio.buscarPorCorreo(authentication.getName()).orElse(null);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("mensaje", "Usuario no encontrado"));
        }

        TotpSetupRespuestaDTO setup = twoFactorService.iniciarSetupTotp(usuario);
        return ResponseEntity.ok(setup);
    }

    @PostMapping(value = "/totp/confirmar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> confirmarSetupTotp(@RequestBody ConfirmarTotpRequest request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("mensaje", "No autenticado"));
        }
        if (request == null || request.getCodigo() == null) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Debe enviar el código de 6 dígitos generado en su aplicación"));
        }
        Usuario usuario = usuarioServicio.buscarPorCorreo(authentication.getName()).orElse(null);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("mensaje", "Usuario no encontrado"));
        }

        try {
            List<String> recoveryCodes = twoFactorService.confirmarSetupTotp(usuario, request.getCodigo());
            return ResponseEntity.ok(Map.of(
                    "exitoso", true,
                    "mensaje", "Google Authenticator configurado y activado correctamente",
                    "codigosRecuperacion", recoveryCodes
            ));
        } catch (SegundoFactorException e) {
            return ResponseEntity.status(e.getEstado()).body(Map.of("exitoso", false, "mensaje", e.getMessage()));
        }
    }

    @PostMapping(value = "/totp/verificar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AuthRespuestaDTO> verificarTotp(
            @RequestBody VerificarTotpRequest request,
            @RequestHeader(value = "X-2FA-Session-Token", required = false) String headerToken,
            Authentication authentication) {
        if (request == null || request.getCodigo() == null) {
            return ResponseEntity.badRequest().body(new AuthRespuestaDTO(false, "Debe enviar el código de 6 dígitos", null, null));
        }

        String token = request.getSessionToken() != null ? request.getSessionToken() : headerToken;
        Usuario usuario = resolverUsuario(token, authentication);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new AuthRespuestaDTO(false, "Sesión expirada", null, null));
        }

        try {
            AutenticacionSegundoFactorResultado res = twoFactorService.verificarTotp(usuario, request.getCodigo());
            return ResponseEntity.ok(new AuthRespuestaDTO(true, "Código verificado exitosamente", res.token(), UsuarioRespuestaDTO.desdeUsuario(res.usuario())));
        } catch (SegundoFactorException e) {
            return ResponseEntity.status(e.getEstado()).body(new AuthRespuestaDTO(false, e.getMessage(), null, null));
        }
    }

    @PostMapping("/passkey/registro/opciones")
    public ResponseEntity<?> generarOpcionesRegistroPasskey(HttpServletRequest req, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("mensaje", "No autenticado"));
        }
        Usuario usuario = usuarioServicio.buscarPorCorreo(authentication.getName()).orElse(null);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("mensaje", "Usuario no encontrado"));
        }

        WebAuthnRegistroOpcionesDTO opciones = twoFactorService.generarOpcionesRegistroPasskey(usuario, obtenerRpId(req));
        return ResponseEntity.ok(opciones);
    }

    @PostMapping(value = "/passkey/registro/verificar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> verificarRegistroPasskey(
            @RequestBody WebAuthnRegistroVerificarRequest request,
            HttpServletRequest req,
            Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("mensaje", "No autenticado"));
        }
        Usuario usuario = usuarioServicio.buscarPorCorreo(authentication.getName()).orElse(null);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("mensaje", "Usuario no encontrado"));
        }

        try {
            List<String> recoveryCodes = twoFactorService.verificarRegistroPasskey(usuario, request, obtenerRpId(req));
            return ResponseEntity.ok(Map.of(
                    "exitoso", true,
                    "mensaje", "Dispositivo biométrico registrado exitosamente",
                    "codigosRecuperacion", recoveryCodes != null ? recoveryCodes : List.of()
            ));
        } catch (SegundoFactorException e) {
            return ResponseEntity.status(e.getEstado()).body(Map.of("exitoso", false, "mensaje", e.getMessage()));
        }
    }

    @PostMapping("/passkey/auth/opciones")
    public ResponseEntity<?> generarOpcionesAuthPasskey(
            @RequestHeader(value = "X-2FA-Session-Token", required = false) String sessionToken,
            HttpServletRequest req,
            Authentication authentication) {
        Usuario usuario = resolverUsuario(sessionToken, authentication);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("mensaje", "Sesión expirada"));
        }

        try {
            WebAuthnAuthOpcionesDTO opciones = twoFactorService.generarOpcionesAuthPasskey(usuario, obtenerRpId(req));
            return ResponseEntity.ok(opciones);
        } catch (SegundoFactorException e) {
            return ResponseEntity.status(e.getEstado()).body(Map.of("mensaje", e.getMessage()));
        }
    }

    @PostMapping(value = "/passkey/auth/verificar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AuthRespuestaDTO> verificarAuthPasskey(
            @RequestBody WebAuthnAuthVerificarRequest request,
            @RequestHeader(value = "X-2FA-Session-Token", required = false) String headerToken,
            HttpServletRequest req,
            Authentication authentication) {
        String token = (request != null && request.getSessionToken() != null) ? request.getSessionToken() : headerToken;
        Usuario usuario = resolverUsuario(token, authentication);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new AuthRespuestaDTO(false, "Sesión expirada", null, null));
        }

        try {
            AutenticacionSegundoFactorResultado res = twoFactorService.verificarAuthPasskey(usuario, request, obtenerRpId(req));
            return ResponseEntity.ok(new AuthRespuestaDTO(true, "Autenticación biométrica exitosa", res.token(), UsuarioRespuestaDTO.desdeUsuario(res.usuario())));
        } catch (SegundoFactorException e) {
            return ResponseEntity.status(e.getEstado()).body(new AuthRespuestaDTO(false, e.getMessage(), null, null));
        }
    }

    @PostMapping(value = "/recuperacion/verificar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AuthRespuestaDTO> verificarCodigoRecuperacion(
            @RequestBody VerificarRecuperacionRequest request,
            @RequestHeader(value = "X-2FA-Session-Token", required = false) String headerToken,
            Authentication authentication) {
        if (request == null || request.getCodigo() == null) {
            return ResponseEntity.badRequest().body(new AuthRespuestaDTO(false, "Debe ingresar el código de recuperación", null, null));
        }

        String token = request.getSessionToken() != null ? request.getSessionToken() : headerToken;
        Usuario usuario = resolverUsuario(token, authentication);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new AuthRespuestaDTO(false, "Sesión expirada", null, null));
        }

        try {
            AutenticacionSegundoFactorResultado res = twoFactorService.verificarCodigoRecuperacion(usuario, request.getCodigo());
            return ResponseEntity.ok(new AuthRespuestaDTO(true, "Código de recuperación aceptado", res.token(), UsuarioRespuestaDTO.desdeUsuario(res.usuario())));
        } catch (SegundoFactorException e) {
            return ResponseEntity.status(e.getEstado()).body(new AuthRespuestaDTO(false, e.getMessage(), null, null));
        }
    }

    @PostMapping(value = "/recuperacion/regenerar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> regenerarCodigosRecuperacion(
            @RequestBody RegenerarRecuperacionRequest request,
            Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("mensaje", "No autenticado"));
        }
        if (request == null || request.getContrasena() == null) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Debe confirmar su contraseña"));
        }
        Usuario usuario = usuarioServicio.buscarPorCorreo(authentication.getName()).orElse(null);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("mensaje", "Usuario no encontrado"));
        }

        try {
            List<String> nuevos = twoFactorService.regenerarCodigosRecuperacion(usuario, request.getContrasena());
            return ResponseEntity.ok(Map.of("exitoso", true, "codigosRecuperacion", nuevos));
        } catch (SegundoFactorException e) {
            return ResponseEntity.status(e.getEstado()).body(Map.of("exitoso", false, "mensaje", e.getMessage()));
        }
    }

    @GetMapping("/configuracion")
    public ResponseEntity<?> obtenerConfiguracion(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("mensaje", "No autenticado"));
        }
        Usuario usuario = usuarioServicio.buscarPorCorreo(authentication.getName()).orElse(null);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("mensaje", "Usuario no encontrado"));
        }

        Configuracion2faUsuarioDTO config = twoFactorService.obtenerConfiguracionUsuario(usuario);
        return ResponseEntity.ok(config);
    }

    @PostMapping(value = "/desactivar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> desactivarMetodo(@RequestBody Desactivar2faRequest request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("mensaje", "No autenticado"));
        }
        if (request == null || request.getMetodo() == null || request.getContrasena() == null) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Debe enviar método y contraseña"));
        }
        Usuario usuario = usuarioServicio.buscarPorCorreo(authentication.getName()).orElse(null);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("mensaje", "Usuario no encontrado"));
        }

        try {
            twoFactorService.desactivarMetodo(usuario, request.getMetodo(), request.getContrasena(), request.getCredencialId());
            return ResponseEntity.ok(Map.of("exitoso", true, "mensaje", "Método 2FA desactivado correctamente"));
        } catch (SegundoFactorException e) {
            return ResponseEntity.status(e.getEstado()).body(Map.of("exitoso", false, "mensaje", e.getMessage()));
        }
    }

    @PutMapping(value = "/preferido", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> actualizarMetodoPreferido(@RequestBody ActualizarMetodoPreferidoRequest request, Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("mensaje", "No autenticado"));
        }
        if (request == null || request.getMetodo() == null) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Debe enviar el método preferido"));
        }
        Usuario usuario = usuarioServicio.buscarPorCorreo(authentication.getName()).orElse(null);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("mensaje", "Usuario no encontrado"));
        }

        twoFactorService.actualizarMetodoPreferido(usuario, request.getMetodo());
        return ResponseEntity.ok(Map.of("exitoso", true, "mensaje", "Método preferido actualizado"));
    }
}
