package com.algolab.backend_werb_mr.servicios;

public interface IEmailService {
    boolean estaHabilitado();
    boolean estaDisponible();
    void enviarOtp(String destinatario, String codigoOtp, int vigenciaMinutos);
    int getUsoActual();
    int getLimite();
}
