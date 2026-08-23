package com.algolab.backend_werb_mr.modelos;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "webauthn_credenciales")
public class WebauthnCredencial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, unique = true, length = 512)
    private String credentialId; // Base64URL

    @Column(nullable = false, length = 2048)
    private String publicKey; // Base64 DER/COSE or standard public key representation

    @Column(nullable = false)
    private long signCount = 0;

    @Column(nullable = false, length = 120)
    private String nombreDispositivo = "Dispositivo biométrico";

    @Column(length = 64)
    private String aaguid;

    @Column(nullable = false)
    private Instant creadoEn;

    private Instant ultimoUsoEn;

    public WebauthnCredencial() {
    }

    public WebauthnCredencial(Usuario usuario, String credentialId, String publicKey, long signCount, String nombreDispositivo) {
        this.usuario = usuario;
        this.credentialId = credentialId;
        this.publicKey = publicKey;
        this.signCount = signCount;
        this.nombreDispositivo = nombreDispositivo;
    }

    @PrePersist
    protected void onCreate() {
        if (creadoEn == null) {
            creadoEn = Instant.now();
        }
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

    public String getCredentialId() {
        return credentialId;
    }

    public void setCredentialId(String credentialId) {
        this.credentialId = credentialId;
    }

    public String getPublicKey() {
        return publicKey;
    }

    public void setPublicKey(String publicKey) {
        this.publicKey = publicKey;
    }

    public long getSignCount() {
        return signCount;
    }

    public void setSignCount(long signCount) {
        this.signCount = signCount;
    }

    public String getNombreDispositivo() {
        return nombreDispositivo;
    }

    public void setNombreDispositivo(String nombreDispositivo) {
        this.nombreDispositivo = nombreDispositivo;
    }

    public String getAaguid() {
        return aaguid;
    }

    public void setAaguid(String aaguid) {
        this.aaguid = aaguid;
    }

    public Instant getCreadoEn() {
        return creadoEn;
    }

    public void setCreadoEn(Instant creadoEn) {
        this.creadoEn = creadoEn;
    }

    public Instant getUltimoUsoEn() {
        return ultimoUsoEn;
    }

    public void setUltimoUsoEn(Instant ultimoUsoEn) {
        this.ultimoUsoEn = ultimoUsoEn;
    }
}
