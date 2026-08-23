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
        return true;
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
            logger.info("════════════════════════════════════════════════════════════════════");
            logger.info("[2FA SMS] Proveedor SMS no configurado. Código OTP para {}: {}", usuario.getCelular(), codigo);
            logger.info("════════════════════════════════════════════════════════════════════");
            return;
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
                logger.info("[2FA SMS] SMS enviado exitosamente via Twilio a {}", usuario.getCelular());
                return;
            } catch (Exception error) {
                logger.error("Error enviando SMS via Twilio a {}: {}. Código OTP de respaldo: {}", usuario.getCelular(), error.getMessage(), codigo);
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
                logger.info("[2FA SMS] SMS enviado exitosamente via TextBelt a {}", usuario.getCelular());
            } catch (Exception error) {
                logger.error("Error enviando SMS via TextBelt a {}: {}. Código OTP de respaldo: {}", usuario.getCelular(), error.getMessage(), codigo);
            }
        }
    }

    private static String limpiar(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        return valor.trim();
    }
}
