package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.algolab.backend_werb_mr.configuracion.SegundoFactorPropiedades;
import com.algolab.backend_werb_mr.dtos.DesafioSegundoFactorRespuestaDTO;
import com.algolab.backend_werb_mr.modelos.CanalSegundoFactor;
import com.algolab.backend_werb_mr.modelos.DesafioSegundoFactor;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.IDesafioSegundoFactorRepositorio;
import com.algolab.backend_werb_mr.seguridad.JwtServicio;

class SegundoFactorServicioTest {
    private IDesafioSegundoFactorRepositorio repositorio;
    private PasswordEncoder encoder;
    private CanalCorreoPrueba canal;
    private CanalSmsPrueba canalSms;
    private RelojMutable reloj;
    private SegundoFactorServicio servicio;
    private Usuario usuario;
    private DesafioSegundoFactor desafioGuardado;

    @BeforeEach
    void preparar() {
        repositorio = mock(IDesafioSegundoFactorRepositorio.class);
        encoder = new BCryptPasswordEncoder(4);
        canal = new CanalCorreoPrueba();
        canalSms = new CanalSmsPrueba();
        reloj = new RelojMutable(Instant.parse("2026-08-21T12:00:00Z"));
        SegundoFactorPropiedades propiedades = new SegundoFactorPropiedades();
        propiedades.setExpiracionSegundos(300);
        propiedades.setReenvioSegundos(60);
        propiedades.setMaxIntentos(5);
        servicio = new SegundoFactorServicio(
                repositorio,
                encoder,
                List.of(canal, canalSms),
                propiedades,
                new JwtPrueba(),
                reloj,
                new SecureRandom());
        usuario = new Usuario(7L, "Ada", "ada@campusucc.edu.co", Rol.ESTUDIANTE, "hash");

        when(repositorio.save(any(DesafioSegundoFactor.class))).thenAnswer(invocacion -> {
            desafioGuardado = invocacion.getArgument(0);
            return desafioGuardado;
        });
        when(repositorio.buscarPorIdentificadorParaActualizar(any())).thenAnswer(invocacion ->
                Optional.ofNullable(desafioGuardado)
                        .filter(d -> d.getIdentificador().equals(invocacion.getArgument(0))));
    }

    @Test
    void creaDesafioPersistenteInvalidaAnterioresYGuardaSoloHash() {
        DesafioSegundoFactorRespuestaDTO respuesta = servicio.crearDesafio(usuario, CanalSegundoFactor.CORREO);

        verify(repositorio).invalidarActivosDelUsuario(7L);
        assertTrue(respuesta.isRequiereSegundoFactor());
        assertEquals("CORREO", respuesta.getCanal());
        assertEquals(300, respuesta.getExpiraEnSegundos());
        assertEquals(60, respuesta.getReenvioDisponibleEnSegundos());
        assertEquals(1, canal.codigos.size());
        assertNotEquals(canal.codigos.get(0), desafioGuardado.getCodigoHash());
        assertTrue(encoder.matches(canal.codigos.get(0), desafioGuardado.getCodigoHash()));
        assertFalse(desafioGuardado.getCodigoHash().contains(canal.codigos.get(0)));
    }

    @Test
    void codigoValidoEntregaJwtYQuedaDeUnSoloUso() {
        DesafioSegundoFactorRespuestaDTO respuesta = servicio.crearDesafio(usuario, CanalSegundoFactor.CORREO);

        AutenticacionSegundoFactorResultado resultado = servicio.verificar(
                respuesta.getDesafioId(), canal.ultimoCodigo());

        assertEquals("jwt-solo-despues-del-2fa", resultado.token());
        assertEquals(usuario, resultado.usuario());
        assertTrue(desafioGuardado.isUsado());

        SegundoFactorException reutilizado = assertThrows(SegundoFactorException.class,
                () -> servicio.verificar(respuesta.getDesafioId(), canal.ultimoCodigo()));
        assertEquals(HttpStatus.CONFLICT, reutilizado.getEstado());
    }

    @Test
    void codigoIncorrectoCuentaIntentosYBloqueaAlQuinto() {
        DesafioSegundoFactorRespuestaDTO respuesta = servicio.crearDesafio(usuario, CanalSegundoFactor.CORREO);

        for (int intento = 1; intento <= 4; intento++) {
            SegundoFactorException error = assertThrows(SegundoFactorException.class,
                    () -> servicio.verificar(respuesta.getDesafioId(), "999999"));
            assertEquals(HttpStatus.UNAUTHORIZED, error.getEstado());
        }

        SegundoFactorException bloqueado = assertThrows(SegundoFactorException.class,
                () -> servicio.verificar(respuesta.getDesafioId(), "999999"));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, bloqueado.getEstado());
        assertEquals(5, desafioGuardado.getIntentosFallidos());
        assertTrue(desafioGuardado.isInvalidado());
    }

    @Test
    void codigoExpiradoNoEntregaJwt() {
        DesafioSegundoFactorRespuestaDTO respuesta = servicio.crearDesafio(usuario, CanalSegundoFactor.CORREO);
        reloj.avanzar(Duration.ofMinutes(5));

        SegundoFactorException error = assertThrows(SegundoFactorException.class,
                () -> servicio.verificar(respuesta.getDesafioId(), canal.ultimoCodigo()));

        assertEquals(HttpStatus.GONE, error.getEstado());
        assertTrue(desafioGuardado.isInvalidado());
    }

    @Test
    void reenvioRespetaCooldownEInvalidaElCodigoAnterior() {
        DesafioSegundoFactorRespuestaDTO respuesta = servicio.crearDesafio(usuario, CanalSegundoFactor.CORREO);
        String anterior = canal.ultimoCodigo();

        for (int intento = 0; intento < 4; intento++) {
            assertThrows(SegundoFactorException.class,
                    () -> servicio.verificar(respuesta.getDesafioId(), "999999"));
        }
        assertEquals(4, desafioGuardado.getIntentosFallidos());

        SegundoFactorException temprano = assertThrows(SegundoFactorException.class,
                () -> servicio.reenviar(respuesta.getDesafioId()));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, temprano.getEstado());

        reloj.avanzar(Duration.ofSeconds(60));
        DesafioSegundoFactorRespuestaDTO reenviado = servicio.reenviar(respuesta.getDesafioId());
        String nuevo = canal.ultimoCodigo();

        assertEquals(respuesta.getDesafioId(), reenviado.getDesafioId());
        assertEquals(2, canal.codigos.size());
        assertEquals(0, desafioGuardado.getIntentosFallidos());
        assertTrue(encoder.matches(nuevo, desafioGuardado.getCodigoHash()));
        assertFalse(encoder.matches(anterior, desafioGuardado.getCodigoHash()));
    }

    @Test
    void canalSmsSoloSeHabilitaConCelularYProveedorRealDisponible() {
        SegundoFactorException sinCelular = assertThrows(SegundoFactorException.class,
                () -> servicio.crearDesafio(usuario, CanalSegundoFactor.SMS));
        assertEquals(HttpStatus.BAD_REQUEST, sinCelular.getEstado());

        usuario.setCelular("+573001234567");
        DesafioSegundoFactorRespuestaDTO respuesta = servicio.crearDesafio(usuario, CanalSegundoFactor.SMS);

        assertEquals("SMS", respuesta.getCanal());
        assertEquals("***4567", respuesta.getDestinoEnmascarado());
        assertEquals(1, canalSms.codigos.size());
        assertTrue(encoder.matches(canalSms.ultimoCodigo(), desafioGuardado.getCodigoHash()));

        canalSms.disponible = false;
        SegundoFactorException sinProveedor = assertThrows(SegundoFactorException.class,
                () -> servicio.crearDesafio(usuario, CanalSegundoFactor.SMS));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, sinProveedor.getEstado());
    }

    private static class CanalCorreoPrueba implements IEnvioSegundoFactor {
        private final List<String> codigos = new ArrayList<>();

        @Override
        public CanalSegundoFactor canal() {
            return CanalSegundoFactor.CORREO;
        }

        @Override
        public boolean disponible() {
            return true;
        }

        @Override
        public void enviarCodigo(Usuario usuario, String codigo, long vigenciaSegundos) {
            codigos.add(codigo);
        }

        String ultimoCodigo() {
            return codigos.get(codigos.size() - 1);
        }
    }

    private static class CanalSmsPrueba implements IEnvioSegundoFactor {
        private final List<String> codigos = new ArrayList<>();
        private boolean disponible = true;

        @Override
        public CanalSegundoFactor canal() {
            return CanalSegundoFactor.SMS;
        }

        @Override
        public boolean disponible() {
            return disponible;
        }

        @Override
        public void enviarCodigo(Usuario usuario, String codigo, long vigenciaSegundos) {
            codigos.add(codigo);
        }

        String ultimoCodigo() {
            return codigos.get(codigos.size() - 1);
        }
    }

    private static class JwtPrueba extends JwtServicio {
        @Override
        public String generarToken(Usuario usuario) {
            return "jwt-solo-despues-del-2fa";
        }
    }

    private static class RelojMutable extends Clock {
        private Instant actual;

        RelojMutable(Instant actual) {
            this.actual = actual;
        }

        void avanzar(Duration duracion) {
            actual = actual.plus(duracion);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return actual;
        }
    }
}
