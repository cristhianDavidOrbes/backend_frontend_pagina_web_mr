package com.algolab.backend_werb_mr.servicios;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.algolab.backend_werb_mr.configuracion.SegundoFactorPropiedades;
import com.algolab.backend_werb_mr.dtos.DesafioSegundoFactorRespuestaDTO;
import com.algolab.backend_werb_mr.modelos.CanalSegundoFactor;
import com.algolab.backend_werb_mr.modelos.DesafioSegundoFactor;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.IDesafioSegundoFactorRepositorio;
import com.algolab.backend_werb_mr.seguridad.JwtServicio;

@Service
public class SegundoFactorServicio implements ISegundoFactorServicio {
    private static final int CANTIDAD_DIGITOS = 6;
    private static final int LIMITE_CODIGO = 1_000_000;

    private final IDesafioSegundoFactorRepositorio repositorio;
    private final PasswordEncoder passwordEncoder;
    private final Map<CanalSegundoFactor, IEnvioSegundoFactor> canales;
    private final SegundoFactorPropiedades propiedades;
    private final JwtServicio jwtServicio;
    private final Clock reloj;
    private final SecureRandom secureRandom;

    public SegundoFactorServicio(IDesafioSegundoFactorRepositorio repositorio,
            PasswordEncoder passwordEncoder,
            java.util.List<IEnvioSegundoFactor> canales,
            SegundoFactorPropiedades propiedades,
            JwtServicio jwtServicio,
            Clock reloj,
            SecureRandom secureRandom) {
        this.repositorio = repositorio;
        this.passwordEncoder = passwordEncoder;
        this.canales = canales.stream().collect(Collectors.toUnmodifiableMap(IEnvioSegundoFactor::canal, Function.identity()));
        this.propiedades = propiedades;
        this.jwtServicio = jwtServicio;
        this.reloj = reloj;
        this.secureRandom = secureRandom;
    }

    @Override
    @Transactional
    public DesafioSegundoFactorRespuestaDTO crearDesafio(Usuario usuario, CanalSegundoFactor canal) {
        validarConfiguracion();
        IEnvioSegundoFactor servicioCanal = obtenerCanal(canal);
        validarDestino(usuario, canal, servicioCanal);
        repositorio.invalidarActivosDelUsuario(usuario.getId());

        Instant ahora = reloj.instant();
        String codigo = generarCodigo();
        DesafioSegundoFactor desafio = new DesafioSegundoFactor();
        desafio.setIdentificador(UUID.randomUUID().toString());
        desafio.setUsuario(usuario);
        desafio.setCodigoHash(passwordEncoder.encode(codigo));
        desafio.setCanal(canal);
        desafio.setCreadoEn(ahora);
        desafio.setExpiraEn(ahora.plusSeconds(propiedades.getExpiracionSegundos()));
        desafio.setReenvioDisponibleEn(ahora.plusSeconds(propiedades.getReenvioSegundos()));
        desafio.setIntentosFallidos(0);
        desafio.setUsado(false);
        desafio.setInvalidado(false);
        repositorio.save(desafio);

        servicioCanal.enviarCodigo(usuario, codigo, propiedades.getExpiracionSegundos());
        String mensajeRespuesta;
        if (!servicioCanal.estaConfigurado()) {
            mensajeRespuesta = "Código de verificación: " + codigo + " (Modo prueba - servicio " + canal + " sin configurar)";
        } else {
            String destino = canal == CanalSegundoFactor.CORREO ? "correo institucional" : "celular";
            mensajeRespuesta = "Enviamos un código de acceso a tu " + destino;
        }
        return respuesta(desafio, ahora, mensajeRespuesta);
    }


    @Override
    @Transactional(noRollbackFor = SegundoFactorVerificacionException.class)
    public AutenticacionSegundoFactorResultado verificar(String desafioId, String codigo) {
        validarIdentificador(desafioId);
        if (codigo == null || !codigo.trim().matches("\\d{" + CANTIDAD_DIGITOS + "}")) {
            throw new SegundoFactorVerificacionException(HttpStatus.BAD_REQUEST,
                    "El codigo debe contener exactamente seis digitos");
        }

        DesafioSegundoFactor desafio = buscarBloqueado(desafioId);
        Instant ahora = reloj.instant();
        validarUtilizable(desafio, ahora, false);

        if (!passwordEncoder.matches(codigo.trim(), desafio.getCodigoHash())) {
            int intentos = desafio.getIntentosFallidos() + 1;
            desafio.setIntentosFallidos(intentos);
            if (intentos >= propiedades.getMaxIntentos()) {
                desafio.setInvalidado(true);
            }
            repositorio.save(desafio);

            if (desafio.isInvalidado()) {
                throw new SegundoFactorVerificacionException(HttpStatus.TOO_MANY_REQUESTS,
                        "Se agotaron los intentos. Inicia sesion nuevamente");
            }

            int restantes = propiedades.getMaxIntentos() - intentos;
            throw new SegundoFactorVerificacionException(HttpStatus.UNAUTHORIZED,
                    "Codigo incorrecto. Intentos restantes: " + restantes);
        }

        desafio.setUsado(true);
        repositorio.save(desafio);
        Usuario usuario = desafio.getUsuario();
        return new AutenticacionSegundoFactorResultado(jwtServicio.generarToken(usuario), usuario);
    }

    @Override
    @Transactional
    public DesafioSegundoFactorRespuestaDTO reenviar(String desafioId) {
        validarConfiguracion();
        validarIdentificador(desafioId);
        DesafioSegundoFactor desafio = buscarBloqueado(desafioId);
        Instant ahora = reloj.instant();
        validarUtilizable(desafio, ahora, true);

        if (ahora.isBefore(desafio.getReenvioDisponibleEn())) {
            long espera = segundosRestantes(ahora, desafio.getReenvioDisponibleEn());
            throw new SegundoFactorException(HttpStatus.TOO_MANY_REQUESTS,
                    "Podras reenviar el codigo en " + espera + " segundos");
        }

        IEnvioSegundoFactor servicioCanal = obtenerCanal(desafio.getCanal());
        validarDestino(desafio.getUsuario(), desafio.getCanal(), servicioCanal);

        String codigo = generarCodigo();
        desafio.setCodigoHash(passwordEncoder.encode(codigo));
        // Un codigo reenviado inicia su propio margen de intentos. Mantener los
        // fallos del codigo anterior podia bloquear al usuario con un codigo
        // nuevo despues de un solo error, aunque el anterior ya no fuera valido.
        desafio.setIntentosFallidos(0);
        desafio.setExpiraEn(ahora.plusSeconds(propiedades.getExpiracionSegundos()));
        desafio.setReenvioDisponibleEn(ahora.plusSeconds(propiedades.getReenvioSegundos()));
        repositorio.save(desafio);

        servicioCanal.enviarCodigo(desafio.getUsuario(), codigo, propiedades.getExpiracionSegundos());
        String mensajeRespuesta;
        if (!servicioCanal.estaConfigurado()) {
            mensajeRespuesta = "Nuevo código de verificación: " + codigo + " (Modo prueba - servicio " + desafio.getCanal() + " sin configurar)";
        } else {
            String destino = desafio.getCanal() == CanalSegundoFactor.CORREO ? "correo institucional" : "celular";
            mensajeRespuesta = "Enviamos un nuevo código a tu " + destino;
        }
        return respuesta(desafio, ahora, mensajeRespuesta);
    }


    private void validarConfiguracion() {
        if (propiedades.getExpiracionSegundos() <= 0 || propiedades.getReenvioSegundos() < 0
                || propiedades.getMaxIntentos() <= 0) {
            throw new SegundoFactorException(HttpStatus.SERVICE_UNAVAILABLE,
                    "La configuracion del segundo factor no es valida");
        }
    }

    private void validarIdentificador(String desafioId) {
        if (desafioId == null || desafioId.isBlank()) {
            throw new SegundoFactorException(HttpStatus.BAD_REQUEST, "El desafioId es obligatorio");
        }
    }

    private DesafioSegundoFactor buscarBloqueado(String desafioId) {
        return repositorio.buscarPorIdentificadorParaActualizar(desafioId.trim())
                .orElseThrow(() -> new SegundoFactorException(HttpStatus.NOT_FOUND,
                        "El desafio de segundo factor no existe"));
    }

    private void validarUtilizable(DesafioSegundoFactor desafio, Instant ahora, boolean permitirExpiradoParaReenvio) {
        if (desafio.isUsado()) {
            throw new SegundoFactorException(HttpStatus.CONFLICT,
                    "Este codigo ya fue utilizado. Inicia sesion nuevamente");
        }
        if (desafio.isInvalidado() || desafio.getIntentosFallidos() >= propiedades.getMaxIntentos()) {
            throw new SegundoFactorException(HttpStatus.TOO_MANY_REQUESTS,
                    "El desafio fue bloqueado. Inicia sesion nuevamente");
        }
        if (!permitirExpiradoParaReenvio && !ahora.isBefore(desafio.getExpiraEn())) {
            desafio.setInvalidado(true);
            repositorio.save(desafio);
            throw new SegundoFactorVerificacionException(HttpStatus.GONE,
                    "El codigo expiro. Inicia sesion nuevamente o solicita otro codigo");
        }
    }

    private IEnvioSegundoFactor obtenerCanal(CanalSegundoFactor canal) {
        IEnvioSegundoFactor servicio = canales.get(canal);
        if (servicio == null) {
            throw new SegundoFactorException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El canal de segundo factor no esta disponible");
        }
        return servicio;
    }

    private void validarDestino(Usuario usuario, CanalSegundoFactor canal, IEnvioSegundoFactor servicioCanal) {
        if (!servicioCanal.disponible()) {
            String detalle = canal == CanalSegundoFactor.SMS
                    ? "El canal SMS requiere un proveedor Twilio configurado"
                    : "El servicio de correo no esta configurado";
            throw new SegundoFactorException(HttpStatus.SERVICE_UNAVAILABLE, detalle);
        }
        if (canal == CanalSegundoFactor.SMS && (usuario.getCelular() == null || usuario.getCelular().isBlank())) {
            throw new SegundoFactorException(HttpStatus.BAD_REQUEST,
                    "La cuenta no tiene un numero celular registrado para recibir SMS");
        }
    }



    private String generarCodigo() {
        return String.format("%0" + CANTIDAD_DIGITOS + "d", secureRandom.nextInt(LIMITE_CODIGO));
    }

    private DesafioSegundoFactorRespuestaDTO respuesta(DesafioSegundoFactor desafio, Instant ahora, String mensaje) {
        return new DesafioSegundoFactorRespuestaDTO(
                true,
                true,
                mensaje,
                desafio.getIdentificador(),
                desafio.getCanal().name(),
                enmascararDestino(desafio),
                segundosRestantes(ahora, desafio.getExpiraEn()),
                segundosRestantes(ahora, desafio.getReenvioDisponibleEn()));
    }

    private long segundosRestantes(Instant ahora, Instant objetivo) {
        return Math.max(0, Duration.between(ahora, objetivo).getSeconds());
    }

    private String enmascararCorreo(String correo) {
        String[] partes = correo.split("@", 2);
        String local = partes[0];
        String visible = local.length() <= 2
                ? local.substring(0, 1) + "***"
                : local.substring(0, 2) + "***" + local.substring(local.length() - 1);
        return visible + "@" + partes[1];
    }

    private String enmascararDestino(DesafioSegundoFactor desafio) {
        if (desafio.getCanal() == CanalSegundoFactor.CORREO) {
            return enmascararCorreo(desafio.getUsuario().getCorreo());
        }
        String celular = desafio.getUsuario().getCelular();
        return "***" + celular.substring(Math.max(0, celular.length() - 4));
    }
}
