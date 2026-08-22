package com.algolab.backend_werb_mr.configuracion;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.segundo-factor")
public class SegundoFactorPropiedades {
    private String remitente;
    private String nombreRemitente = "AlgoLab";
    private long expiracionSegundos = 300;
    private long reenvioSegundos = 60;
    private int maxIntentos = 5;

    public String getRemitente() {
        return remitente;
    }

    public void setRemitente(String remitente) {
        this.remitente = remitente;
    }

    public String getNombreRemitente() {
        return nombreRemitente;
    }

    public void setNombreRemitente(String nombreRemitente) {
        this.nombreRemitente = nombreRemitente;
    }

    public long getExpiracionSegundos() {
        return expiracionSegundos;
    }

    public void setExpiracionSegundos(long expiracionSegundos) {
        this.expiracionSegundos = expiracionSegundos;
    }

    public long getReenvioSegundos() {
        return reenvioSegundos;
    }

    public void setReenvioSegundos(long reenvioSegundos) {
        this.reenvioSegundos = reenvioSegundos;
    }

    public int getMaxIntentos() {
        return maxIntentos;
    }

    public void setMaxIntentos(int maxIntentos) {
        this.maxIntentos = maxIntentos;
    }
}
