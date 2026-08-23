package com.algolab.backend_werb_mr.controladores;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import com.algolab.backend_werb_mr.servicios.SegundoFactorException;
import com.algolab.backend_werb_mr.servicios.SegundoFactorVerificacionException;

@RestControllerAdvice
public class GlobalExcepcionControlador {
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> manejarArchivoDemasiadoGrande() {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(Map.of(
                "mensaje", "La imagen no puede superar 1 MB"));
    }

    @ExceptionHandler(SegundoFactorException.class)
    public ResponseEntity<Map<String, Object>> manejarSegundoFactorException(SegundoFactorException ex) {
        return ResponseEntity.status(ex.getEstado()).body(Map.of(
                "exitoso", false,
                "mensaje", ex.getMessage() != null ? ex.getMessage() : "Error en la verificación 2FA"
        ));
    }

    @ExceptionHandler(SegundoFactorVerificacionException.class)
    public ResponseEntity<Map<String, Object>> manejarSegundoFactorVerificacionException(SegundoFactorVerificacionException ex) {
        return ResponseEntity.status(ex.getEstado()).body(Map.of(
                "exitoso", false,
                "mensaje", ex.getMessage() != null ? ex.getMessage() : "Error de verificación"
        ));
    }
}
