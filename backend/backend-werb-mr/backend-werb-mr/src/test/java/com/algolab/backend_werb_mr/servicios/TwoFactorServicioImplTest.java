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
    private Usuario usuarioGmail;
    private Usuario usuarioUcc;

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

        usuarioGmail = new Usuario(1L, "Ada Lovelace", "ada@gmail.com", Rol.ESTUDIANTE, passwordEncoder.encode("Secret123!"));
        usuarioUcc = new Usuario(2L, "Carlos Ucc", "carlos@campusucc.edu.co", Rol.ESTUDIANTE, passwordEncoder.encode("Secret123!"));
    }

    @Test
    void loginCon2faHabilitadoEnGmailRetornaRequiere2faYSesionTemporal() {
        when(usuarioRepo.buscarPorCorreo(usuarioGmail.getCorreo())).thenReturn(Optional.of(usuarioGmail));
        Usuario2faConfiguracion config = new Usuario2faConfiguracion(usuarioGmail);
        config.setEmailHabilitado(true);
        when(configRepo.findByUsuarioId(usuarioGmail.getId())).thenReturn(Optional.of(config));
        when(emailService.estaDisponible()).thenReturn(true);

        Login2faRespuestaDTO respuesta = service.procesarLogin("ada@gmail.com", "Secret123!");

        assertTrue(respuesta.isExitoso());
        assertTrue(respuesta.isRequiere2fa());
        assertNotNull(respuesta.getDosFactores());
        assertNotNull(respuesta.getDosFactores().getSessionToken());
        assertTrue(jwtServicio.esTokenTemporal2FA(respuesta.getDosFactores().getSessionToken()));
    }

    @Test
    void loginCuentasUccSinTotpRetornaTokenDirecto() {
        when(usuarioRepo.buscarPorCorreo(usuarioUcc.getCorreo())).thenReturn(Optional.of(usuarioUcc));
        Usuario2faConfiguracion config = new Usuario2faConfiguracion(usuarioUcc);
        when(configRepo.findByUsuarioId(usuarioUcc.getId())).thenReturn(Optional.of(config));

        Login2faRespuestaDTO respuesta = service.procesarLogin("carlos@campusucc.edu.co", "Secret123!");

        assertTrue(respuesta.isExitoso());
        assertFalse(respuesta.isRequiere2fa());
        assertNotNull(respuesta.getToken());
        assertFalse(jwtServicio.esTokenTemporal2FA(respuesta.getToken()));
        assertNotNull(respuesta.getUsuario());
    }

    @Test
    void consultaMetodosMuestraDisponibilidadEmailCorrectamenteParaGmail() {
        Usuario2faConfiguracion config = new Usuario2faConfiguracion(usuarioGmail);
        config.setEmailHabilitado(true);
        when(configRepo.findByUsuarioId(usuarioGmail.getId())).thenReturn(Optional.of(config));
        when(emailService.estaDisponible()).thenReturn(false);

        Metodos2faDisponiblesDTO metodos = service.consultarMetodosDisponibles(usuarioGmail, "token");
        assertNotNull(metodos);
        assertTrue(metodos.getEmail().isEnabled());
        assertFalse(metodos.getEmail().isAvailable()); // Email quota exhausted
    }
}
