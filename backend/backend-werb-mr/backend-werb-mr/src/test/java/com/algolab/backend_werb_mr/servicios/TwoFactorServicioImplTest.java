package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.algolab.backend_werb_mr.dtos.Login2faRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.Metodos2faDisponiblesDTO;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.modelos.Usuario2faConfiguracion;
import com.algolab.backend_werb_mr.repositorio.IDesafio2faRepositorio;
import com.algolab.backend_werb_mr.repositorio.IUsuario2faConfiguracionRepositorio;
import com.algolab.backend_werb_mr.repositorio.IUsuarioRepositorio;
import com.algolab.backend_werb_mr.seguridad.JwtServicio;

class TwoFactorServicioImplTest {

    private IUsuario2faConfiguracionRepositorio configRepo;
    private IDesafio2faRepositorio desafioRepo;
    private IUsuarioRepositorio usuarioRepo;
    private PasswordEncoder passwordEncoder;
    private JwtServicio jwtServicio;
    private IEmailService emailService;
    private ITotpService totpService;
    private IWebAuthnService webAuthnService;
    private IRecoveryCodeService recoveryCodeService;
    private TwoFactorServicioImpl service;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        configRepo = mock(IUsuario2faConfiguracionRepositorio.class);
        desafioRepo = mock(IDesafio2faRepositorio.class);
        usuarioRepo = mock(IUsuarioRepositorio.class);
        passwordEncoder = new BCryptPasswordEncoder();
        jwtServicio = new JwtServicio();
        ReflectionTestUtils.setField(jwtServicio, "secreto", "test-secret-key-32-characters-length-min!");
        ReflectionTestUtils.setField(jwtServicio, "expiracionMs", 86400000L);

        emailService = mock(IEmailService.class);
        totpService = mock(ITotpService.class);
        webAuthnService = mock(IWebAuthnService.class);
        recoveryCodeService = mock(IRecoveryCodeService.class);

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

        usuario = new Usuario(1L, "Ada Lovelace", "ada@campusucc.edu.co", Rol.ESTUDIANTE, passwordEncoder.encode("Secret123!"));
    }

    @Test
    void loginCon2faHabilitadoRetornaRequiere2faYSesionTemporal() {
        when(usuarioRepo.buscarPorCorreo(usuario.getCorreo())).thenReturn(Optional.of(usuario));
        Usuario2faConfiguracion config = new Usuario2faConfiguracion(usuario);
        config.setEmailHabilitado(true);
        when(configRepo.findByUsuarioId(usuario.getId())).thenReturn(Optional.of(config));
        when(emailService.estaDisponible()).thenReturn(true);

        Login2faRespuestaDTO respuesta = service.procesarLogin("ada@campusucc.edu.co", "Secret123!");

        assertTrue(respuesta.isExitoso());
        assertTrue(respuesta.isRequiere2fa());
        assertNotNull(respuesta.getDosFactores());
        assertNotNull(respuesta.getDosFactores().getSessionToken());
        assertTrue(jwtServicio.esTokenTemporal2FA(respuesta.getDosFactores().getSessionToken()));
    }

    @Test
    void loginSin2faHabilitadoRetornaTokenDirecto() {
        when(usuarioRepo.buscarPorCorreo(usuario.getCorreo())).thenReturn(Optional.of(usuario));
        Usuario2faConfiguracion config = new Usuario2faConfiguracion(usuario);
        config.setEmailHabilitado(false);
        config.setTotpHabilitado(false);
        config.setPasskeyHabilitado(false);
        when(configRepo.findByUsuarioId(usuario.getId())).thenReturn(Optional.of(config));

        Login2faRespuestaDTO respuesta = service.procesarLogin("ada@campusucc.edu.co", "Secret123!");

        assertTrue(respuesta.isExitoso());
        assertFalse(respuesta.isRequiere2fa());
        assertNotNull(respuesta.getToken());
        assertFalse(jwtServicio.esTokenTemporal2FA(respuesta.getToken()));
        assertNotNull(respuesta.getUsuario());
    }

    @Test
    void consultaMetodosMuestraDisponibilidadEmailCorrectamente() {
        Usuario2faConfiguracion config = new Usuario2faConfiguracion(usuario);
        config.setEmailHabilitado(true);
        when(configRepo.findByUsuarioId(usuario.getId())).thenReturn(Optional.of(config));
        when(emailService.estaDisponible()).thenReturn(false);

        Metodos2faDisponiblesDTO metodos = service.consultarMetodosDisponibles(usuario, "token");
        assertNotNull(metodos);
        assertTrue(metodos.getEmail().isEnabled());
        assertFalse(metodos.getEmail().isAvailable()); // Email quota exhausted
    }
}
