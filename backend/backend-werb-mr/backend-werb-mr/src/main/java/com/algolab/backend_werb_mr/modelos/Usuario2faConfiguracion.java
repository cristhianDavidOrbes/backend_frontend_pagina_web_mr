package com.algolab.backend_werb_mr.modelos;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuario_2fa_configuraciones")
public class Usuario2faConfiguracion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "usuario_id", referencedColumnName = "id", unique = true, nullable = false)
    private Usuario usuario;

    @Column(nullable = false)
    private boolean emailHabilitado = true;

    @Column(nullable = false)
    private boolean totpHabilitado = false;

    @Column(nullable = false)
    private boolean passkeyHabilitado = false;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    private Metodo2fa metodoPreferido = Metodo2fa.EMAIL;

    @Column(length = 512)
    private String totpSecretCifrado;

    @Column(nullable = false)
    private boolean totpConfigurado = false;

    @Column(nullable = false)
    private Instant creadoEn;

    @Column(nullable = false)
    private Instant actualizadoEn;

    public Usuario2faConfiguracion() {
    }

    public Usuario2faConfiguracion(Usuario usuario) {
        this.usuario = usuario;
        this.emailHabilitado = true;
        this.totpHabilitado = false;
        this.passkeyHabilitado = false;
        this.metodoPreferido = Metodo2fa.EMAIL;
    }

    @PrePersist
    protected void onCreate() {
        if (creadoEn == null) {
            creadoEn = Instant.now();
        }
        if (actualizadoEn == null) {
            actualizadoEn = Instant.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        actualizadoEn = Instant.now();
    }

    public boolean tiene2faHabilitado() {
        return emailHabilitado || totpHabilitado || passkeyHabilitado;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public boolean isEmailHabilitado() {
        return emailHabilitado;
    }

    public void setEmailHabilitado(boolean emailHabilitado) {
        this.emailHabilitado = emailHabilitado;
    }

    public boolean isTotpHabilitado() {
        return totpHabilitado;
    }

    public void setTotpHabilitado(boolean totpHabilitado) {
        this.totpHabilitado = totpHabilitado;
    }

    public boolean isPasskeyHabilitado() {
        return passkeyHabilitado;
    }

    public void setPasskeyHabilitado(boolean passkeyHabilitado) {
        this.passkeyHabilitado = passkeyHabilitado;
    }

    public Metodo2fa getMetodoPreferido() {
        return metodoPreferido;
    }

    public void setMetodoPreferido(Metodo2fa metodoPreferido) {
        this.metodoPreferido = metodoPreferido;
    }

    public String getTotpSecretCifrado() {
        return totpSecretCifrado;
    }

    public void setTotpSecretCifrado(String totpSecretCifrado) {
        this.totpSecretCifrado = totpSecretCifrado;
    }

    public boolean isTotpConfigurado() {
        return totpConfigurado;
    }

    public void setTotpConfigurado(boolean totpConfigurado) {
        this.totpConfigurado = totpConfigurado;
    }

    public Instant getCreadoEn() {
        return creadoEn;
    }

    public void setCreadoEn(Instant creadoEn) {
        this.creadoEn = creadoEn;
    }

    public Instant getActualizadoEn() {
        return actualizadoEn;
    }

    public void setActualizadoEn(Instant actualizadoEn) {
        this.actualizadoEn = actualizadoEn;
    }
}
