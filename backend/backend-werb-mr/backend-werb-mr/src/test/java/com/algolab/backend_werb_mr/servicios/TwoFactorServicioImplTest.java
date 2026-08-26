package com.algolab.backend_werb_mr.servicios;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.algolab.backend_werb_mr.dtos.Login2faRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.Metodos2faDisponiblesDTO;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.modelos.Usuario2faConfiguracion;
import com.algolab.backend_werb_mr.repositorio.ICodigoRecuperacionRepositorio;
import com.algolab.backend_werb_mr.repositorio.IDesafio2faRepositorio;
import com.algolab.backend_werb_mr.repositorio.IUsuario2faConfiguracionRepositorio;
import com.algolab.backend_werb_mr.repositorio.IUsuarioRepositorio;
import com.algolab.backend_werb_mr.repositorio.IWebauthnCredencialRepositorio;
import com.algolab.backend_werb_mr.seguridad.JwtServicio;

@ExtendWith(MockitoExtension.class)
class TwoFactorServicioImplTest {

    @Mock
    private IUsuario2faConfiguracionRepositorio configRepo;

    @Mock
    private IDesafio2faRepositorio desafioRepo;

    @Mock
    private IUsuarioRepositorio usuarioRepo;

    @Mock
    private IWebauthnCredencialRepositorio credencialRepo;

    @Mock
    private ICodigoRecuperacionRepositorio recoveryRepo;

    @Mock
    private IEmailService emailService;

    @Mock
    private ITotpService totpService;

    @Mock
    private IWebAuthnService webAuthnService;

    @Mock
    private IRecoveryCodeService recoveryCodeService;

    private JwtServicio jwtServicio;
    private PasswordEncoder passwordEncoder;
    private TwoFactorServicioImpl service;
    private Usuario usuarioInstitucional;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        jwtServicio = new JwtServicio("clave-de-prueba-muy-larga-y-segura-para-tests-unitarios-123456789", 86400000L);
        service = new TwoFactorServicioImpl(
                configRepo,
                desafioRepo,
                usuarioRepo,
                passwordEncoder,
                jwtServicio,
                emailService,
                totpService,
                webAuthnService,
                recoveryCodeService);

        usuarioInstitucional = new Usuario(
                1L,
                "Ada Lovelace",
                "ada@campusucc.edu.co",
                Rol.ESTUDIANTE,
                passwordEncoder.encode("Secret123!"));
    }

    @Test
    void loginInstitucionalConTotpHabilitadoRetornaRequiere2faYSesionTemporal() {
        when(usuarioRepo.buscarPorCorreo(usuarioInstitucional.getCorreo()))
                .thenReturn(Optional.of(usuarioInstitucional));
        Usuario2faConfiguracion config = new Usuario2faConfiguracion(usuarioInstitucional);
        config.setTotpHabilitado(true);
        config.setTotpConfigurado(true);
        when(configRepo.findByUsuarioId(usuarioInstitucional.getId())).thenReturn(Optional.of(config));

        Login2faRespuestaDTO respuesta = service.procesarLogin("ada@campusucc.edu.co", "Secret123!");

        assertTrue(respuesta.isExitoso());
        assertTrue(respuesta.isRequiere2fa());
        assertNotNull(respuesta.getDosFactores());
        assertNotNull(respuesta.getDosFactores().getSessionToken());
        assertTrue(jwtServicio.esTokenTemporal2FA(respuesta.getDosFactores().getSessionToken()));
    }

    @Test
    void loginCuentasUccSinTotpRetornaTokenDirecto() {
        when(usuarioRepo.buscarPorCorreo(usuarioInstitucional.getCorreo()))
                .thenReturn(Optional.of(usuarioInstitucional));
        Usuario2faConfiguracion config = new Usuario2faConfiguracion(usuarioInstitucional);
        when(configRepo.findByUsuarioId(usuarioInstitucional.getId())).thenReturn(Optional.of(config));

        Login2faRespuestaDTO respuesta = service.procesarLogin("ada@campusucc.edu.co", "Secret123!");

        assertTrue(respuesta.isExitoso());
        assertFalse(respuesta.isRequiere2fa());
        assertNotNull(respuesta.getToken());
        assertFalse(jwtServicio.esTokenTemporal2FA(respuesta.getToken()));
        assertNotNull(respuesta.getUsuario());
    }

    @Test
    void consultaMetodosMantieneEmailDeshabilitadoParaCuentaInstitucional() {
        Usuario2faConfiguracion config = new Usuario2faConfiguracion(usuarioInstitucional);
        config.setEmailHabilitado(true);
        when(configRepo.findByUsuarioId(usuarioInstitucional.getId())).thenReturn(Optional.of(config));

        Metodos2faDisponiblesDTO metodos = service.consultarMetodosDisponibles(usuarioInstitucional, "token");
        assertNotNull(metodos);
        assertFalse(metodos.getEmail().isEnabled());
        assertFalse(metodos.getEmail().isAvailable());
    }
}
