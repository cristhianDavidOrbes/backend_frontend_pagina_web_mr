package com.algolab.backend_werb_mr.servicios;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.algolab.backend_werb_mr.dtos.WebAuthnAuthOpcionesDTO;
import com.algolab.backend_werb_mr.dtos.WebAuthnAuthVerificarRequest;
import com.algolab.backend_werb_mr.dtos.WebAuthnRegistroOpcionesDTO;
import com.algolab.backend_werb_mr.dtos.WebAuthnRegistroVerificarRequest;
import com.algolab.backend_werb_mr.modelos.Desafio2fa;
import com.algolab.backend_werb_mr.modelos.TipoDesafio2fa;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.modelos.WebauthnCredencial;
import com.algolab.backend_werb_mr.repositorio.IDesafio2faRepositorio;
import com.algolab.backend_werb_mr.repositorio.IWebauthnCredencialRepositorio;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class WebAuthnServicioImpl implements IWebAuthnService {
    private static final Logger logger = LoggerFactory.getLogger(WebAuthnServicioImpl.class);

    private final IWebauthnCredencialRepositorio credencialRepositorio;
    private final IDesafio2faRepositorio desafioRepositorio;
    private final SecureRandom secureRandom;
    private final ObjectMapper objectMapper;

    public WebAuthnServicioImpl(
            IWebauthnCredencialRepositorio credencialRepositorio,
            IDesafio2faRepositorio desafioRepositorio) {
        this.credencialRepositorio = credencialRepositorio;
        this.desafioRepositorio = desafioRepositorio;
        this.secureRandom = new SecureRandom();
        this.objectMapper = new ObjectMapper();
    }

    private String generarChallengeBase64Url() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    @Override
    @Transactional
    public WebAuthnRegistroOpcionesDTO generarOpcionesRegistro(Usuario usuario, String rpId) {
        String challenge = generarChallengeBase64Url();
        Instant ahora = Instant.now();

        // Invalidate active registration challenges for user
        desafioRepositorio.invalidarDesafiosActivos(usuario.getId(), TipoDesafio2fa.WEBAUTHN_REGISTRO);

        Desafio2fa desafio = new Desafio2fa();
        desafio.setDesafioId(UUID.randomUUID().toString());
        desafio.setUsuario(usuario);
        desafio.setTipo(TipoDesafio2fa.WEBAUTHN_REGISTRO);
        desafio.setChallengeData(challenge);
        desafio.setExpiraEn(ahora.plusSeconds(300));
        desafioRepositorio.save(desafio);

        WebAuthnRegistroOpcionesDTO dto = new WebAuthnRegistroOpcionesDTO();
        dto.setChallenge(challenge);
        dto.setRpName("AlgoLab UCC");
        dto.setRpId(rpId);

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", Base64.getUrlEncoder().withoutPadding().encodeToString(usuario.getId().toString().getBytes(StandardCharsets.UTF_8)));
        userInfo.put("name", usuario.getCorreo());
        userInfo.put("displayName", usuario.getNombre());
        dto.setUser(userInfo);

        // Standard algorithms: ES256 (-7), RS256 (-257)
        dto.setPubKeyCredParams(List.of(
                Map.of("type", "public-key", "alg", -7),
                Map.of("type", "public-key", "alg", -257)
        ));

        Map<String, Object> authSelection = new HashMap<>();
        authSelection.put("userVerification", "preferred");
        authSelection.put("residentKey", "preferred");
        dto.setAuthenticatorSelection(authSelection);

        // Exclude existing credentials
        List<WebauthnCredencial> existentes = credencialRepositorio.findByUsuarioIdOrderByCreadoEnDesc(usuario.getId());
        List<Map<String, Object>> excludes = new ArrayList<>();
        for (WebauthnCredencial cred : existentes) {
            excludes.add(Map.of(
                    "type", "public-key",
                    "id", cred.getCredentialId()
            ));
        }
        dto.setExcludeCredentials(excludes);

        return dto;
    }

    @Override
    @Transactional
    public WebauthnCredencial verificarRegistro(Usuario usuario, WebAuthnRegistroVerificarRequest request, String rpId) {
        if (request == null || request.getId() == null || request.getClientDataJSON() == null) {
            throw new SegundoFactorException(HttpStatus.BAD_REQUEST, "Datos de registro WebAuthn incompletos");
        }

        JsonNode clientData = parseClientData(request.getClientDataJSON());
        String type = clientData.path("type").asText();
        if (!"webauthn.create".equals(type)) {
            throw new SegundoFactorException(HttpStatus.BAD_REQUEST, "Tipo de operación WebAuthn inválida: " + type);
        }

        String challengeReceived = clientData.path("challenge").asText();
        validarChallengeUsuario(usuario, challengeReceived, TipoDesafio2fa.WEBAUTHN_REGISTRO);

        String credentialId = request.getId().trim();
        if (credencialRepositorio.findByCredentialId(credentialId).isPresent()) {
            throw new SegundoFactorException(HttpStatus.CONFLICT, "Este dispositivo o passkey ya está registrado");
        }

        String rawPublicKey = request.getAttestationObject() != null && !request.getAttestationObject().isBlank()
                ? request.getAttestationObject()
                : request.getId();

        String nombreDispositivo = request.getNombreDispositivo() != null && !request.getNombreDispositivo().isBlank()
                ? request.getNombreDispositivo().trim()
                : "Dispositivo biométrico";

        WebauthnCredencial credencial = new WebauthnCredencial(
                usuario,
                credentialId,
                rawPublicKey,
                0,
                nombreDispositivo
        );
        credencial.setUltimoUsoEn(Instant.now());

        return credencialRepositorio.save(credencial);
    }

    @Override
    @Transactional
    public WebAuthnAuthOpcionesDTO generarOpcionesAutenticacion(Usuario usuario, String rpId) {
        List<WebauthnCredencial> credenciales = credencialRepositorio.findByUsuarioIdOrderByCreadoEnDesc(usuario.getId());
        if (credenciales.isEmpty()) {
            throw new SegundoFactorException(HttpStatus.BAD_REQUEST, "El usuario no tiene passkeys o biometría registrada");
        }

        String challenge = generarChallengeBase64Url();
        Instant ahora = Instant.now();

        desafioRepositorio.invalidarDesafiosActivos(usuario.getId(), TipoDesafio2fa.WEBAUTHN_AUTH);

        Desafio2fa desafio = new Desafio2fa();
        desafio.setDesafioId(UUID.randomUUID().toString());
        desafio.setUsuario(usuario);
        desafio.setTipo(TipoDesafio2fa.WEBAUTHN_AUTH);
        desafio.setChallengeData(challenge);
        desafio.setExpiraEn(ahora.plusSeconds(300));
        desafioRepositorio.save(desafio);

        WebAuthnAuthOpcionesDTO dto = new WebAuthnAuthOpcionesDTO();
        dto.setChallenge(challenge);
        dto.setRpId(rpId);

        List<Map<String, Object>> allowCredentials = new ArrayList<>();
        for (WebauthnCredencial cred : credenciales) {
            allowCredentials.add(Map.of(
                    "type", "public-key",
                    "id", cred.getCredentialId()
            ));
        }
        dto.setAllowCredentials(allowCredentials);
        return dto;
    }

    @Override
    @Transactional
    public boolean verificarAutenticacion(Usuario usuario, WebAuthnAuthVerificarRequest request, String rpId) {
        if (request == null || request.getId() == null || request.getClientDataJSON() == null) {
            throw new SegundoFactorException(HttpStatus.BAD_REQUEST, "Datos de autenticación WebAuthn incompletos");
        }

        JsonNode clientData = parseClientData(request.getClientDataJSON());
        String type = clientData.path("type").asText();
        if (!"webauthn.get".equals(type)) {
            throw new SegundoFactorException(HttpStatus.BAD_REQUEST, "Tipo de operación WebAuthn inválida: " + type);
        }

        String challengeReceived = clientData.path("challenge").asText();
        validarChallengeUsuario(usuario, challengeReceived, TipoDesafio2fa.WEBAUTHN_AUTH);

        WebauthnCredencial credencial = credencialRepositorio.findByCredentialId(request.getId().trim())
                .orElseThrow(() -> new SegundoFactorException(HttpStatus.UNAUTHORIZED, "Credencial de dispositivo no reconocida"));

        if (!credencial.getUsuario().getId().equals(usuario.getId())) {
            throw new SegundoFactorException(HttpStatus.FORBIDDEN, "La credencial no pertenece a esta cuenta");
        }

        // Update signCount and usage timestamp
        credencial.setSignCount(credencial.getSignCount() + 1);
        credencial.setUltimoUsoEn(Instant.now());
        credencialRepositorio.save(credencial);

        logger.info("[WebAuthn] Autenticación biométrica exitosa para usuario {} con dispositivo '{}'", usuario.getCorreo(), credencial.getNombreDispositivo());
        return true;
    }

    @Override
    public List<WebauthnCredencial> listarCredenciales(Long usuarioId) {
        return credencialRepositorio.findByUsuarioIdOrderByCreadoEnDesc(usuarioId);
    }

    @Override
    @Transactional
    public void eliminarCredencial(Usuario usuario, Long credencialId) {
        WebauthnCredencial cred = credencialRepositorio.findById(credencialId)
                .orElseThrow(() -> new SegundoFactorException(HttpStatus.NOT_FOUND, "Dispositivo no encontrado"));

        if (!cred.getUsuario().getId().equals(usuario.getId())) {
            throw new SegundoFactorException(HttpStatus.FORBIDDEN, "No tienes permiso para eliminar este dispositivo");
        }

        credencialRepositorio.delete(cred);
        logger.info("[WebAuthn] Dispositivo {} eliminado para usuario {}", cred.getNombreDispositivo(), usuario.getCorreo());
    }

    private void validarChallengeUsuario(Usuario usuario, String challengeReceived, TipoDesafio2fa tipo) {
        Instant ahora = Instant.now();
        List<Desafio2fa> desafios = desafioRepositorio.findAll().stream()
                .filter(d -> d.getUsuario().getId().equals(usuario.getId())
                        && d.getTipo() == tipo
                        && !d.isUsado()
                        && !d.isInvalidado()
                        && !d.estaVencido(ahora)
                        && challengeReceived.equals(d.getChallengeData()))
                .toList();

        if (desafios.isEmpty()) {
            throw new SegundoFactorException(HttpStatus.UNAUTHORIZED, "El desafío WebAuthn ha expirado o ya fue utilizado. Intenta nuevamente.");
        }

        Desafio2fa match = desafios.get(0);
        match.setUsado(true);
        desafioRepositorio.save(match);
    }

    private JsonNode parseClientData(String clientDataJSONBase64) {
        try {
            byte[] bytes = Base64.getUrlDecoder().decode(clientDataJSONBase64);
            return objectMapper.readTree(bytes);
        } catch (Exception e) {
            throw new SegundoFactorException(HttpStatus.BAD_REQUEST, "Formato de clientDataJSON inválido");
        }
    }
}
