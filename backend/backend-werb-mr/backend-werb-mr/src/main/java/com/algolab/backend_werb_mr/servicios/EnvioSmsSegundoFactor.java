package com.algolab.backend_werb_mr.servicios;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import com.algolab.backend_werb_mr.modelos.CanalSegundoFactor;
import com.algolab.backend_werb_mr.modelos.Usuario;

@Service
public class EnvioSmsSegundoFactor implements IEnvioSegundoFactor {
    private static final Logger logger = LoggerFactory.getLogger(EnvioSmsSegundoFactor.class);

    private final String accountSid;
    private final String authToken;
    private final String fromNumber;
    private final String textbeltApiKey;
    private final RestClient restClient;

    @Autowired
    public EnvioSmsSegundoFactor(
            @Value("${app.segundo-factor.twilio-account-sid:}") String accountSid,
            @Value("${app.segundo-factor.twilio-auth-token:}") String authToken,
            @Value("${app.segundo-factor.twilio-from-number:}") String fromNumber,
            @Value("${app.segundo-factor.textbelt-api-key:}") String textbeltApiKey) {
        this(accountSid, authToken, fromNumber, textbeltApiKey, RestClient.create());
    }

    EnvioSmsSegundoFactor(String accountSid, String authToken, String fromNumber, String textbeltApiKey, RestClient restClient) {
        this.accountSid = limpiar(accountSid);
        this.authToken = limpiar(authToken);
        this.fromNumber = limpiar(fromNumber);
        this.textbeltApiKey = limpiar(textbeltApiKey);
        this.restClient = restClient;
    }

    @Override
    public CanalSegundoFactor canal() {
        return CanalSegundoFactor.SMS;
    }

    @Override
    public boolean disponible() {
        return estaConfigurado();
    }

    @Override
    public boolean estaConfigurado() {
        boolean twilio = accountSid != null && authToken != null && fromNumber != null;
        boolean textbelt = textbeltApiKey != null;
        return twilio || textbelt;
    }

    @Override
    public void enviarCodigo(Usuario usuario, String codigo, long vigenciaSegundos) {
        if (usuario.getCelular() == null || usuario.getCelular().isBlank()) {
            throw new SegundoFactorException(HttpStatus.BAD_REQUEST,
                    "La cuenta no tiene un numero celular verificado para recibir SMS");
        }

        if (!estaConfigurado()) {
            logger.warn("[2FA SMS] Proveedor no configurado para el destino {}.", enmascararCelular(usuario.getCelular()));
            throw new SegundoFactorException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El servicio de mensajes no está disponible temporalmente");
        }

        long minutos = Math.max(1, (long) Math.ceil(vigenciaSegundos / 60.0));
        String textoMensaje = "AlgoLab: tu codigo de acceso es " + codigo
                + ". Expira en " + minutos + " min. No lo compartas.";

        // 1. Si Twilio está configurado: enviar por Twilio
        if (accountSid != null && authToken != null && fromNumber != null) {
            MultiValueMap<String, String> formulario = new LinkedMultiValueMap<>();
            formulario.add("To", usuario.getCelular());
            formulario.add("From", fromNumber);
            formulario.add("Body", textoMensaje);

            try {
                restClient.post()
                        .uri("https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json", accountSid)
                        .headers(headers -> headers.setBasicAuth(accountSid, authToken))
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .body(formulario)
                        .retrieve()
                        .toBodilessEntity();
                logger.info("[2FA SMS] Mensaje enviado vía Twilio a {}", enmascararCelular(usuario.getCelular()));
                return;
            } catch (Exception error) {
                logger.warn("Error enviando SMS vía Twilio a {}: {}", enmascararCelular(usuario.getCelular()), error.getMessage());
            }
        }

        // 2. Si TextBelt está configurado: enviar por TextBelt
        if (textbeltApiKey != null) {
            MultiValueMap<String, String> formulario = new LinkedMultiValueMap<>();
            formulario.add("phone", usuario.getCelular());
            formulario.add("message", textoMensaje);
            formulario.add("key", textbeltApiKey);

            try {
                restClient.post()
                        .uri("https://textbelt.com/text")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .body(formulario)
                        .retrieve()
                        .toBodilessEntity();
                logger.info("[2FA SMS] Mensaje enviado vía TextBelt a {}", enmascararCelular(usuario.getCelular()));
                return;
            } catch (Exception error) {
                logger.error("Error enviando SMS vía TextBelt a {}: {}", enmascararCelular(usuario.getCelular()), error.getMessage());
            }
        }

        throw new SegundoFactorException(HttpStatus.SERVICE_UNAVAILABLE,
                "No fue posible enviar el código de seguridad por mensaje");
    }

    private static String limpiar(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        return valor.trim();
    }

    private static String enmascararCelular(String celular) {
        if (celular == null || celular.length() < 4) return "***";
        return "***" + celular.substring(celular.length() - 4);
    }
}
