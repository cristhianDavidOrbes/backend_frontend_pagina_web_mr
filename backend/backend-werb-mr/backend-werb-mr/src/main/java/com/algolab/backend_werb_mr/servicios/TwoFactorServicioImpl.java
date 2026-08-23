package com.algolab.backend_werb_mr.servicios;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.algolab.backend_werb_mr.dtos.Configuracion2faUsuarioDTO;
import com.algolab.backend_werb_mr.dtos.Login2faRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.Metodos2faDisponiblesDTO;
import com.algolab.backend_werb_mr.dtos.TotpSetupRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.UsuarioRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.WebAuthnAuthOpcionesDTO;
import com.algolab.backend_werb_mr.dtos.WebAuthnAuthVerificarRequest;
import com.algolab.backend_werb_mr.dtos.WebAuthnRegistroOpcionesDTO;
import com.algolab.backend_werb_mr.dtos.WebAuthnRegistroVerificarRequest;
import com.algolab.backend_werb_mr.dtos.WebauthnCredencialDTO;
import com.algolab.backend_werb_mr.modelos.Desafio2fa;
import com.algolab.backend_werb_mr.modelos.Metodo2fa;
import com.algolab.backend_werb_mr.modelos.TipoDesafio2fa;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.modelos.Usuario2faConfiguracion;
import com.algolab.backend_werb_mr.modelos.WebauthnCredencial;
import com.algolab.backend_werb_mr.repositorio.IDesafio2faRepositorio;
import com.algolab.backend_werb_mr.repositorio.IUsuario2faConfiguracionRepositorio;
import com.algolab.backend_werb_mr.repositorio.IUsuarioRepositorio;
import com.algolab.backend_werb_mr.seguridad.JwtServicio;

@Service
public class TwoFactorServicioImpl implements ITwoFactorService {
    private static final Logger logger = LoggerFactory.getLogger(TwoFactorServicioImpl.class);

    private static final int MAX_INTENTOS_OTP = 5;
    private static final int VIGENCIA_OTP_MINUTOS = 5;
    private static final int REENVIO_COOLDOWN_SEGUNDOS = 60;

    private final IUsuario2faConfiguracionRepositorio configRepo;
    private final IDesafio2faRepositorio desafioRepo;
    private final IUsuarioRepositorio usuarioRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtServicio jwtServicio;
    private final IEmailService emailService;
    private final ITotpService totpService;
    private final IWebAuthnService webAuthnService;
    private final IRecoveryCodeService recoveryCodeService;
    private final SecureRandom secureRandom;

    public TwoFactorServicioImpl(
            IUsuario2faConfiguracionRepositorio configRepo,
            IDesafio2faRepositorio desafioRepo,
            IUsuarioRepositorio usuarioRepo,
            PasswordEncoder passwordEncoder,
            JwtServicio jwtServicio,
            IEmailService emailService,
            ITotpService totpService,
            IWebAuthnService webAuthnService,
            IRecoveryCodeService recoveryCodeService) {
        this.configRepo = configRepo;
        this.desafioRepo = desafioRepo;
        this.usuarioRepo = usuarioRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtServicio = jwtServicio;
        this.emailService = emailService;
        this.totpService = totpService;
        this.webAuthnService = webAuthnService;
        this.recoveryCodeService = recoveryCodeService;
        this.secureRandom = new SecureRandom();
    }

    @Override
    @Transactional
    public Usuario2faConfiguracion obtenerOCrearConfiguracion(Usuario usuario) {
        return configRepo.findByUsuarioId(usuario.getId())
                .orElseGet(() -> {
                    Usuario2faConfiguracion nueva = new Usuario2faConfiguracion(usuario);
                    return configRepo.save(nueva);
                });
    }

    @Override
    public Metodos2faDisponiblesDTO consultarMetodosDisponibles(Usuario usuario, String sessionToken) {
        Usuario2faConfiguracion config = obtenerOCrearConfiguracion(usuario);
        List<WebauthnCredencial> passkeys = webAuthnService.listarCredenciales(usuario.getId());
        int recoveryCodesCount = recoveryCodeService.contarCodigosDisponibles(usuario.getId());

        Metodos2faDisponiblesDTO dto = new Metodos2faDisponiblesDTO();
        dto.setRequiere2fa(config.tiene2faHabilitado());
        dto.setSessionToken(sessionToken);
        dto.setMetodoPreferido(config.getMetodoPreferido());

        // 1. Email OTP (deshabilitado para cuentas UCC ya que no usan envio SMTP)
        boolean esInstitucional = usuario.getCorreo() != null &&
                (usuario.getCorreo().toLowerCase().endsWith("@campusucc.edu.co") || usuario.getCorreo().toLowerCase().endsWith("@ucc.edu.co"));
        boolean emailAvailable = !esInstitucional && emailService.estaDisponible();
        String destinoEnmascarado = enmascararCorreo(usuario.getCorreo());
        dto.setEmail(new Metodos2faDisponiblesDTO.EmailMetodoInfo(
                !esInstitucional && config.isEmailHabilitado(),
                emailAvailable,
                destinoEnmascarado
        ));

        // 2. Passkey / Biometrics
        List<String> nombresDispositivos = passkeys.stream()
                .map(WebauthnCredencial::getNombreDispositivo)
                .toList();
        dto.setPasskey(new Metodos2faDisponiblesDTO.PasskeyMetodoInfo(
                config.isPasskeyHabilitado(),
                !passkeys.isEmpty(),
                passkeys.size(),
                nombresDispositivos
        ));

        // 3. TOTP / Google Authenticator
        dto.setTotp(new Metodos2faDisponiblesDTO.TotpMetodoInfo(
                config.isTotpHabilitado(),
                config.isTotpConfigurado()
        ));

        // Recovery codes
        dto.setCodigosRecuperacionDisponibles(recoveryCodesCount > 0);

        return dto;
    }

    @Override
    public Configuracion2faUsuarioDTO obtenerConfiguracionUsuario(Usuario usuario) {
        Usuario2faConfiguracion config = obtenerOCrearConfiguracion(usuario);
        List<WebauthnCredencial> passkeys = webAuthnService.listarCredenciales(usuario.getId());
        int recoveryCodesCount = recoveryCodeService.contarCodigosDisponibles(usuario.getId());

        boolean esInstitucional = usuario.getCorreo() != null &&
                (usuario.getCorreo().toLowerCase().endsWith("@campusucc.edu.co") || usuario.getCorreo().toLowerCase().endsWith("@ucc.edu.co"));

        Configuracion2faUsuarioDTO dto = new Configuracion2faUsuarioDTO();
        dto.setEmailHabilitado(!esInstitucional && config.isEmailHabilitado());
        dto.setEmailDisponible(!esInstitucional && emailService.estaDisponible());
        dto.setEmailDestino(usuario.getCorreo());

        dto.setTotpHabilitado(config.isTotpHabilitado());
        dto.setTotpConfigurado(config.isTotpConfigurado());

        dto.setPasskeyHabilitado(config.isPasskeyHabilitado());
        dto.setPasskeys(passkeys.stream().map(WebauthnCredencialDTO::desdeEntidad).toList());

        dto.setMetodoPreferido(config.getMetodoPreferido());
        dto.setCodigosRecuperacionRestantes(recoveryCodesCount);

        return dto;
    }

    @Override
    @Transactional
    public Login2faRespuestaDTO procesarLogin(String correo, String contrasena) {
        if (correo == null || contrasena == null) {
            return Login2faRespuestaDTO.error("Credenciales incompletas");
        }

        Usuario usuario = usuarioRepo.buscarPorCorreo(correo.trim().toLowerCase()).orElse(null);
        if (usuario == null || !passwordEncoder.matches(contrasena, usuario.getContrasena())) {
            return Login2faRespuestaDTO.error("Correo o contraseña incorrectos");
        }

        Usuario2faConfiguracion config = obtenerOCrearConfiguracion(usuario);

        // Si el usuario no tiene 2FA habilitado, login inmediato
        if (!config.tiene2faHabilitado()) {
            String token = jwtServicio.generarToken(usuario);
            return Login2faRespuestaDTO.sesionDirecta(token, UsuarioRespuestaDTO.desdeUsuario(usuario));
        }

        // Si tiene 2FA habilitado: creamos token temporal scoped
        String sessionToken = jwtServicio.generarTokenTemporal2FA(usuario);
        Metodos2faDisponiblesDTO metodos = consultarMetodosDisponibles(usuario, sessionToken);

        // Si el método preferido o predeterminado es EMAIL y está disponible, despachamos el código automáticamente
        if (config.isEmailHabilitado() && emailService.estaDisponible()) {
            try {
                generarYEnviarEmailOtp(usuario, false);
            } catch (Exception e) {
                logger.warn("[2FA Login] No se pudo auto-enviar OTP inicial por email: {}", e.getMessage());
            }
        }

        return Login2faRespuestaDTO.requiere2fa(metodos);
    }

    @Override
    public Usuario resolverUsuarioPorSessionToken(String sessionToken) {
        if (sessionToken == null || !jwtServicio.tokenValido(sessionToken)) {
            throw new SegundoFactorException(HttpStatus.UNAUTHORIZED, "Sesión de autenticación expirada o inválida. Inicia sesión nuevamente.");
        }

        String correo = jwtServicio.obtenerCorreo(sessionToken);
        if (correo == null) {
            throw new SegundoFactorException(HttpStatus.UNAUTHORIZED, "Token inválido");
        }

        return usuarioRepo.buscarPorCorreo(correo)
                .orElseThrow(() -> new SegundoFactorException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
    }

    @Override
    @Transactional
    public void enviarEmailOtp(Usuario usuario) {
        generarYEnviarEmailOtp(usuario, true);
    }

    private void generarYEnviarEmailOtp(Usuario usuario, boolean verificarCooldown) {
        if (!emailService.estaDisponible()) {
            throw new SegundoFactorException(HttpStatus.SERVICE_UNAVAILABLE, "El servicio de correo no está disponible temporalmente.");
        }

        Instant ahora = Instant.now();

        if (verificarCooldown) {
            // Rate limit: cooldown de 60 segundos solo para reenvíos manuales
            List<Desafio2fa> activos = desafioRepo.findAll().stream()
                    .filter(d -> d.getUsuario().getId().equals(usuario.getId())
                            && d.getTipo() == TipoDesafio2fa.EMAIL_OTP
                            && !d.isInvalidado()
                            && !d.isUsado()
                            && !d.estaVencido(ahora))
                    .toList();

            if (!activos.isEmpty()) {
                Desafio2fa ultimo = activos.get(0);
                if (ultimo.getReenvioDisponibleEn() != null && ahora.isBefore(ultimo.getReenvioDisponibleEn())) {
                    long espera = java.time.Duration.between(ahora, ultimo.getReenvioDisponibleEn()).toSeconds();
                    throw new SegundoFactorException(HttpStatus.TOO_MANY_REQUESTS, "Por favor espera " + espera + " segundos antes de solicitar un nuevo código.");
                }
            }
        }

        // Invalidar OTPs anteriores
        desafioRepo.invalidarDesafiosActivos(usuario.getId(), TipoDesafio2fa.EMAIL_OTP);

        // Generar OTP de 6 dígitos criptográficamente seguro
        int num = 100_000 + secureRandom.nextInt(900_000);
        String otp = String.valueOf(num);

        Desafio2fa nuevoDesafio = new Desafio2fa();
        nuevoDesafio.setDesafioId(UUID.randomUUID().toString());
        nuevoDesafio.setUsuario(usuario);
        nuevoDesafio.setTipo(TipoDesafio2fa.EMAIL_OTP);
        nuevoDesafio.setCodigoHash(passwordEncoder.encode(otp));
        nuevoDesafio.setExpiraEn(ahora.plusSeconds(VIGENCIA_OTP_MINUTOS * 60L));
        nuevoDesafio.setReenvioDisponibleEn(ahora.plusSeconds(REENVIO_COOLDOWN_SEGUNDOS));
        nuevoDesafio.setIntentosFallidos(0);
        nuevoDesafio.setUsado(false);
        nuevoDesafio.setInvalidado(false);
        desafioRepo.save(nuevoDesafio);

        logger.info("[2FA] Despachando nuevo OTP {} al correo {}", otp, usuario.getCorreo());
        emailService.enviarOtp(usuario.getCorreo(), otp, VIGENCIA_OTP_MINUTOS);
    }

    @Override
    @Transactional
    public AutenticacionSegundoFactorResultado verificarEmailOtp(Usuario usuario, String codigo) {
        if (codigo == null || !codigo.trim().matches("\\d{6}")) {
            throw new SegundoFactorException(HttpStatus.BAD_REQUEST, "Introduce un código de 6 dígitos válido.");
        }

        Instant ahora = Instant.now();
        List<Desafio2fa> activos = desafioRepo.findAll().stream()
                .filter(d -> d.getUsuario().getId().equals(usuario.getId())
                        && d.getTipo() == TipoDesafio2fa.EMAIL_OTP
                        && !d.isInvalidado()
                        && !d.isUsado())
                .toList();

        if (activos.isEmpty()) {
            throw new SegundoFactorException(HttpStatus.UNAUTHORIZED, "No hay ningún código activo. Solicita uno nuevo.");
        }

        Desafio2fa desafio = activos.get(0);

        if (desafio.estaVencido(ahora)) {
            desafio.setInvalidado(true);
            desafioRepo.save(desafio);
            throw new SegundoFactorException(HttpStatus.UNAUTHORIZED, "El código ha caducado. Solicita un nuevo código.");
        }

        if (desafio.getIntentosFallidos() >= MAX_INTENTOS_OTP) {
            desafio.setInvalidado(true);
            desafioRepo.save(desafio);
            throw new SegundoFactorException(HttpStatus.UNAUTHORIZED, "Has superado el número máximo de intentos. Solicita un nuevo código.");
        }

        if (!passwordEncoder.matches(codigo.trim(), desafio.getCodigoHash())) {
            desafio.setIntentosFallidos(desafio.getIntentosFallidos() + 1);
            desafioRepo.save(desafio);
            int restantes = MAX_INTENTOS_OTP - desafio.getIntentosFallidos();
            throw new SegundoFactorException(HttpStatus.UNAUTHORIZED, "Código incorrecto. Intentos restantes: " + restantes);
        }

        // Éxito: marcar usado e invalidar
        desafio.setUsado(true);
        desafio.setInvalidado(true);
        desafioRepo.save(desafio);

        String tokenDefinitivo = jwtServicio.generarToken(usuario);
        logger.info("[2FA Email] Verificación de código exitosa para {}", usuario.getCorreo());
        return new AutenticacionSegundoFactorResultado(tokenDefinitivo, usuario);
    }

    @Override
    @Transactional
    public TotpSetupRespuestaDTO iniciarSetupTotp(Usuario usuario) {
        String secretBase32 = totpService.generarNuevoSecretBase32();
        Instant ahora = Instant.now();

        desafioRepo.invalidarDesafiosActivos(usuario.getId(), TipoDesafio2fa.TOTP_SETUP);

        Desafio2fa desafio = new Desafio2fa();
        desafio.setDesafioId(UUID.randomUUID().toString());
        desafio.setUsuario(usuario);
        desafio.setTipo(TipoDesafio2fa.TOTP_SETUP);
        desafio.setChallengeData(secretBase32);
        desafio.setExpiraEn(ahora.plusSeconds(600)); // 10 minutos para configurar
        desafioRepo.save(desafio);

        String uri = totpService.generarUri(usuario.getCorreo(), secretBase32);
        return new TotpSetupRespuestaDTO(uri, secretBase32, "AlgoLab UCC", usuario.getCorreo());
    }

    @Override
    @Transactional
    public List<String> confirmarSetupTotp(Usuario usuario, String codigo) {
        Instant ahora = Instant.now();
        List<Desafio2fa> desafios = desafioRepo.findAll().stream()
                .filter(d -> d.getUsuario().getId().equals(usuario.getId())
                        && d.getTipo() == TipoDesafio2fa.TOTP_SETUP
                        && !d.isInvalidado()
                        && !d.isUsado()
                        && !d.estaVencido(ahora))
                .toList();

        if (desafios.isEmpty()) {
            throw new SegundoFactorException(HttpStatus.BAD_REQUEST, "La sesión de configuración TOTP ha caducado. Vuelve a escanear el QR.");
        }

        Desafio2fa desafio = desafios.get(0);
        String secretBase32 = desafio.getChallengeData();

        if (!totpService.validarCodigo(secretBase32, codigo)) {
            throw new SegundoFactorException(HttpStatus.UNAUTHORIZED, "Código incorrecto. Verifica el número de 6 dígitos en tu aplicación de autenticación.");
        }

        // Éxito: guardar secret cifrado y activar TOTP
        desafio.setUsado(true);
        desafio.setInvalidado(true);
        desafioRepo.save(desafio);

        Usuario2faConfiguracion config = obtenerOCrearConfiguracion(usuario);
        config.setTotpSecretCifrado(totpService.cifrarSecret(secretBase32));
        config.setTotpConfigurado(true);
        config.setTotpHabilitado(true);
        if (config.getMetodoPreferido() == null) {
            config.setMetodoPreferido(Metodo2fa.TOTP);
        }
        configRepo.save(config);

        // Generar códigos de recuperación de respaldo
        List<String> recoveryCodes = recoveryCodeService.generarYGuardarCodigos(usuario, 8);
        logger.info("[2FA TOTP] Google Authenticator configurado exitosamente para {}", usuario.getCorreo());
        return recoveryCodes;
    }

    @Override
    @Transactional
    public AutenticacionSegundoFactorResultado verificarTotp(Usuario usuario, String codigo) {
        Usuario2faConfiguracion config = obtenerOCrearConfiguracion(usuario);
        if (!config.isTotpHabilitado() || !config.isTotpConfigurado() || config.getTotpSecretCifrado() == null) {
            throw new SegundoFactorException(HttpStatus.BAD_REQUEST, "Google Authenticator no está configurado en tu cuenta.");
        }

        String secretBase32 = totpService.descifrarSecret(config.getTotpSecretCifrado());
        if (!totpService.validarCodigo(secretBase32, codigo)) {
            throw new SegundoFactorException(HttpStatus.UNAUTHORIZED, "Código de autenticación incorrecto o caducado.");
        }

        String tokenDefinitivo = jwtServicio.generarToken(usuario);
        logger.info("[2FA TOTP] Verificación TOTP exitosa para {}", usuario.getCorreo());
        return new AutenticacionSegundoFactorResultado(tokenDefinitivo, usuario);
    }

    @Override
    public WebAuthnRegistroOpcionesDTO generarOpcionesRegistroPasskey(Usuario usuario, String rpId) {
        return webAuthnService.generarOpcionesRegistro(usuario, rpId);
    }

    @Override
    @Transactional
    public List<String> verificarRegistroPasskey(Usuario usuario, WebAuthnRegistroVerificarRequest request, String rpId) {
        webAuthnService.verificarRegistro(usuario, request, rpId);

        Usuario2faConfiguracion config = obtenerOCrearConfiguracion(usuario);
        config.setPasskeyHabilitado(true);
        configRepo.save(config);

        List<String> recoveryCodes = null;
        if (recoveryCodeService.contarCodigosDisponibles(usuario.getId()) == 0) {
            recoveryCodes = recoveryCodeService.generarYGuardarCodigos(usuario, 8);
        }
        return recoveryCodes;
    }

    @Override
    public WebAuthnAuthOpcionesDTO generarOpcionesAuthPasskey(Usuario usuario, String rpId) {
        return webAuthnService.generarOpcionesAutenticacion(usuario, rpId);
    }

    @Override
    @Transactional
    public AutenticacionSegundoFactorResultado verificarAuthPasskey(Usuario usuario, WebAuthnAuthVerificarRequest request, String rpId) {
        webAuthnService.verificarAutenticacion(usuario, request, rpId);
        String tokenDefinitivo = jwtServicio.generarToken(usuario);
        return new AutenticacionSegundoFactorResultado(tokenDefinitivo, usuario);
    }

    @Override
    @Transactional
    public AutenticacionSegundoFactorResultado verificarCodigoRecuperacion(Usuario usuario, String codigo) {
        if (!recoveryCodeService.validarYConsumirCodigo(usuario, codigo)) {
            throw new SegundoFactorException(HttpStatus.UNAUTHORIZED, "Código de recuperación inválido o ya utilizado.");
        }

        String tokenDefinitivo = jwtServicio.generarToken(usuario);
        logger.info("[2FA RecoveryCodes] Acceso concedido mediante código de recuperación para {}", usuario.getCorreo());
        return new AutenticacionSegundoFactorResultado(tokenDefinitivo, usuario);
    }

    @Override
    @Transactional
    public List<String> regenerarCodigosRecuperacion(Usuario usuario, String contrasena) {
        validarContrasenaUsuario(usuario, contrasena);
        return recoveryCodeService.generarYGuardarCodigos(usuario, 8);
    }

    @Override
    @Transactional
    public void desactivarMetodo(Usuario usuario, Metodo2fa metodo, String contrasena, Long credencialId) {
        validarContrasenaUsuario(usuario, contrasena);
        Usuario2faConfiguracion config = obtenerOCrearConfiguracion(usuario);

        switch (metodo) {
            case EMAIL -> config.setEmailHabilitado(false);
            case TOTP -> {
                config.setTotpHabilitado(false);
                config.setTotpConfigurado(false);
                config.setTotpSecretCifrado(null);
            }
            case PASSKEY -> {
                if (credencialId != null) {
                    webAuthnService.eliminarCredencial(usuario, credencialId);
                    if (webAuthnService.listarCredenciales(usuario.getId()).isEmpty()) {
                        config.setPasskeyHabilitado(false);
                    }
                } else {
                    config.setPasskeyHabilitado(false);
                }
            }
            default -> throw new SegundoFactorException(HttpStatus.BAD_REQUEST, "Método 2FA no válido");
        }

        if (config.getMetodoPreferido() == metodo) {
            config.setMetodoPreferido(Metodo2fa.EMAIL);
        }
        configRepo.save(config);
        logger.info("[2FA] Método {} desactivado/modificado para {}", metodo, usuario.getCorreo());
    }

    @Override
    @Transactional
    public void actualizarMetodoPreferido(Usuario usuario, Metodo2fa metodo) {
        Usuario2faConfiguracion config = obtenerOCrearConfiguracion(usuario);
        config.setMetodoPreferido(metodo != null ? metodo : Metodo2fa.EMAIL);
        configRepo.save(config);
    }

    @Override
    @Transactional
    public void activarEmailMetodo(Usuario usuario, boolean activar) {
        Usuario2faConfiguracion config = obtenerOCrearConfiguracion(usuario);
        config.setEmailHabilitado(activar);
        configRepo.save(config);
    }

    private void validarContrasenaUsuario(Usuario usuario, String contrasena) {
        if (contrasena == null || !passwordEncoder.matches(contrasena, usuario.getContrasena())) {
            throw new SegundoFactorException(HttpStatus.FORBIDDEN, "Contraseña incorrecta.");
        }
    }

    private String enmascararCorreo(String correo) {
        if (correo == null || !correo.contains("@")) return "***@campusucc.edu.co";
        String[] partes = correo.split("@", 2);
        String usuario = partes[0];
        String dominio = partes[1];
        if (usuario.length() <= 2) {
            return usuario.charAt(0) + "***@" + dominio;
        }
        return usuario.charAt(0) + "****" + usuario.charAt(usuario.length() - 1) + "@" + dominio;
    }
}
