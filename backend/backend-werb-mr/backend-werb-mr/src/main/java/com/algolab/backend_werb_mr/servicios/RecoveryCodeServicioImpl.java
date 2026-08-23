package com.algolab.backend_werb_mr.servicios;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.algolab.backend_werb_mr.modelos.CodigoRecuperacion;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.ICodigoRecuperacionRepositorio;

@Service
public class RecoveryCodeServicioImpl implements IRecoveryCodeService {
    private static final Logger logger = LoggerFactory.getLogger(RecoveryCodeServicioImpl.class);

    private static final String CARACTERES = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sin O, 0, 1, I
    private final ICodigoRecuperacionRepositorio repositorio;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom;

    public RecoveryCodeServicioImpl(
            ICodigoRecuperacionRepositorio repositorio,
            PasswordEncoder passwordEncoder) {
        this.repositorio = repositorio;
        this.passwordEncoder = passwordEncoder;
        this.secureRandom = new SecureRandom();
    }

    private String generarCodigoIndividual() {
        StringBuilder sb = new StringBuilder(9);
        for (int i = 0; i < 8; i++) {
            if (i == 4) sb.append('-');
            sb.append(CARACTERES.charAt(secureRandom.nextInt(CARACTERES.length())));
        }
        return sb.toString();
    }

    private String normalizarCodigo(String codigo) {
        if (codigo == null) return "";
        return codigo.trim().replace("-", "").toUpperCase();
    }

    @Override
    @Transactional
    public List<String> generarYGuardarCodigos(Usuario usuario, int cantidad) {
        repositorio.eliminarPorUsuarioId(usuario.getId());

        int total = Math.max(4, Math.min(16, cantidad));
        List<String> codigosPlanos = new ArrayList<>(total);

        for (int i = 0; i < total; i++) {
            String plano = generarCodigoIndividual();
            codigosPlanos.add(plano);

            String normalizado = normalizarCodigo(plano);
            CodigoRecuperacion entidad = new CodigoRecuperacion(usuario, passwordEncoder.encode(normalizado));
            repositorio.save(entidad);
        }

        logger.info("[2FA RecoveryCodes] Generados {} nuevos códigos de recuperación para {}", total, usuario.getCorreo());
        return codigosPlanos;
    }

    @Override
    @Transactional
    public boolean validarYConsumirCodigo(Usuario usuario, String codigoPlano) {
        if (codigoPlano == null || codigoPlano.isBlank()) return false;

        String normalizado = normalizarCodigo(codigoPlano);
        List<CodigoRecuperacion> disponibles = repositorio.findByUsuarioIdAndUsadoFalse(usuario.getId());

        for (CodigoRecuperacion item : disponibles) {
            if (passwordEncoder.matches(normalizado, item.getCodigoHash())) {
                item.setUsado(true);
                item.setUsadoEn(Instant.now());
                repositorio.save(item);
                logger.info("[2FA RecoveryCodes] Código de recuperación utilizado exitosamente por {}", usuario.getCorreo());
                return true;
            }
        }

        logger.warn("[2FA RecoveryCodes] Intento fallido de uso de código de recuperación para {}", usuario.getCorreo());
        return false;
    }

    @Override
    public int contarCodigosDisponibles(Long usuarioId) {
        return (int) repositorio.countByUsuarioIdAndUsadoFalse(usuarioId);
    }
}
