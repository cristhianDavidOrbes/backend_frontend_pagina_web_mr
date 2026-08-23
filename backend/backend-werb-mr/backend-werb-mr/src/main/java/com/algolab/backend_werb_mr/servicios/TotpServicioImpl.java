package com.algolab.backend_werb_mr.servicios;

import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TotpServicioImpl implements ITotpService {

    private static final String HMAC_ALGO = "HmacSHA1";
    private static final String AES_ALGO = "AES/GCM/NoPadding";
    private static final int DIGITOS = 6;
    private static final int PERIODO_SEGUNDOS = 30;
    private static final int GCM_TAG_LENGTH = 128;
    private static final int GCM_IV_LENGTH = 12;
    private static final String ISSUER = "AlgoLab UCC";

    // Base32 characters according to RFC 4648
    private static final String BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    private final byte[] claveMaestraAes;
    private final SecureRandom secureRandom;

    public TotpServicioImpl(@Value("${app.jwt.secret:default-secret-key-for-totp-encryption-32-chars-long!}") String jwtSecret) {
        this.secureRandom = new SecureRandom();
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            this.claveMaestraAes = digest.digest(jwtSecret.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Error inicializando SHA-256 para TOTP", e);
        }
    }

    @Override
    public String generarNuevoSecretBase32() {
        byte[] bytes = new byte[20]; // 160 bits
        secureRandom.nextBytes(bytes);
        return encodeBase32(bytes);
    }

    @Override
    public String cifrarSecret(String secretBase32) {
        if (secretBase32 == null || secretBase32.isBlank()) return null;
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(AES_ALGO);
            SecretKeySpec keySpec = new SecretKeySpec(claveMaestraAes, "AES");
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, gcmSpec);

            byte[] cipherText = cipher.doFinal(secretBase32.getBytes(StandardCharsets.UTF_8));

            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + cipherText.length);
            byteBuffer.put(iv);
            byteBuffer.put(cipherText);

            return Base64.getUrlEncoder().withoutPadding().encodeToString(byteBuffer.array());
        } catch (Exception e) {
            throw new IllegalStateException("Error cifrando secreto TOTP", e);
        }
    }

    @Override
    public String descifrarSecret(String secretCifrado) {
        if (secretCifrado == null || secretCifrado.isBlank()) return null;
        try {
            byte[] decoded = Base64.getUrlDecoder().decode(secretCifrado);
            ByteBuffer byteBuffer = ByteBuffer.wrap(decoded);

            byte[] iv = new byte[GCM_IV_LENGTH];
            byteBuffer.get(iv);

            byte[] cipherText = new byte[byteBuffer.remaining()];
            byteBuffer.get(cipherText);

            Cipher cipher = Cipher.getInstance(AES_ALGO);
            SecretKeySpec keySpec = new SecretKeySpec(claveMaestraAes, "AES");
            GCMParameterSpec gcmSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmSpec);

            byte[] plainText = cipher.doFinal(cipherText);
            return new String(plainText, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Error descifrando secreto TOTP", e);
        }
    }

    @Override
    public String generarUri(String cuenta, String secretBase32) {
        String issuerEncoded = URLEncoder.encode(ISSUER, StandardCharsets.UTF_8);
        String label = URLEncoder.encode(ISSUER + ":" + cuenta, StandardCharsets.UTF_8);
        return "otpauth://totp/" + label + "?secret=" + secretBase32 + "&issuer=" + issuerEncoded + "&algorithm=SHA1&digits=6&period=30";
    }

    @Override
    public boolean validarCodigo(String secretBase32, String codigo) {
        if (secretBase32 == null || codigo == null || !codigo.trim().matches("\\d{6}")) {
            return false;
        }

        byte[] keyBytes = decodeBase32(secretBase32.trim().toUpperCase());
        if (keyBytes.length == 0) return false;

        long pasoActual = Instant.now().getEpochSecond() / PERIODO_SEGUNDOS;
        int codigoIngresado = Integer.parseInt(codigo.trim());

        // Tolerancia de ±1 ventana (30s antes, actual, 30s después)
        for (long delta = -1; delta <= 1; delta++) {
            long paso = pasoActual + delta;
            int generado = generarCodigoParaPaso(keyBytes, paso);
            if (generado == codigoIngresado) {
                return true;
            }
        }
        return false;
    }

    private int generarCodigoParaPaso(byte[] key, long paso) {
        try {
            byte[] data = ByteBuffer.allocate(8).putLong(paso).array();
            SecretKeySpec signKey = new SecretKeySpec(key, HMAC_ALGO);
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(signKey);
            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0xF;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);

            return binary % 1_000_000;
        } catch (Exception e) {
            return -1;
        }
    }

    private String encodeBase32(byte[] data) {
        StringBuilder result = new StringBuilder();
        int buffer = 0;
        int bitsLeft = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                int index = (buffer >> (bitsLeft - 5)) & 0x1F;
                bitsLeft -= 5;
                result.append(BASE32_CHARS.charAt(index));
            }
        }
        if (bitsLeft > 0) {
            int index = (buffer << (5 - bitsLeft)) & 0x1F;
            result.append(BASE32_CHARS.charAt(index));
        }
        return result.toString();
    }

    private byte[] decodeBase32(String base32) {
        String clean = base32.toUpperCase().replaceAll("[^A-Z2-7]", "");
        ByteBuffer out = ByteBuffer.allocate(clean.length() * 5 / 8 + 1);
        int buffer = 0;
        int bitsLeft = 0;
        for (char c : clean.toCharArray()) {
            int val = BASE32_CHARS.indexOf(c);
            if (val < 0) continue;
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                out.put((byte) ((buffer >> (bitsLeft - 8)) & 0xFF));
                bitsLeft -= 8;
            }
        }
        return Arrays.copyOf(out.array(), out.position());
    }
}
