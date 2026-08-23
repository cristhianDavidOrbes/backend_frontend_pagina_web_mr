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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "desafios_2fa")
public class Desafio2fa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String desafioId; // UUID

    @ManyToOne(optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private TipoDesafio2fa tipo;

    @Column(length = 256)
    private String codigoHash;

    @Column(length = 2048)
    private String challengeData; // For WebAuthn challenge or temporary TOTP secret

    @Column(nullable = false)
    private Instant expiraEn;

    private Instant reenvioDisponibleEn;

    @Column(nullable = false)
    private int intentosFallidos = 0;

    @Column(nullable = false)
    private boolean usado = false;

    @Column(nullable = false)
    private boolean invalidado = false;

    @Column(nullable = false)
    private Instant creadoEn;

    public Desafio2fa() {
    }

    @PrePersist
    protected void onCreate() {
        if (creadoEn == null) {
            creadoEn = Instant.now();
        }
    }

    public boolean estaVencido(Instant ahora) {
        return ahora.isAfter(expiraEn);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDesafioId() {
        return desafioId;
    }

    public void setDesafioId(String desafioId) {
        this.desafioId = desafioId;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public TipoDesafio2fa getTipo() {
        return tipo;
    }

    public void setTipo(TipoDesafio2fa tipo) {
        this.tipo = tipo;
    }

    public String getCodigoHash() {
        return codigoHash;
    }

    public void setCodigoHash(String codigoHash) {
        this.codigoHash = codigoHash;
    }

    public String getChallengeData() {
        return challengeData;
    }

    public void setChallengeData(String challengeData) {
        this.challengeData = challengeData;
    }

    public Instant getExpiraEn() {
        return expiraEn;
    }

    public void setExpiraEn(Instant expiraEn) {
        this.expiraEn = expiraEn;
    }

    public Instant getReenvioDisponibleEn() {
        return reenvioDisponibleEn;
    }

    public void setReenvioDisponibleEn(Instant reenvioDisponibleEn) {
        this.reenvioDisponibleEn = reenvioDisponibleEn;
    }

    public int getIntentosFallidos() {
        return intentosFallidos;
    }

    public void setIntentosFallidos(int intentosFallidos) {
        this.intentosFallidos = intentosFallidos;
    }

    public boolean isUsado() {
        return usado;
    }

    public void setUsado(boolean usado) {
        this.usado = usado;
    }

    public boolean isInvalidado() {
        return invalidado;
    }

    public void setInvalidado(boolean invalidado) {
        this.invalidado = invalidado;
    }

    public Instant getCreadoEn() {
        return creadoEn;
    }

    public void setCreadoEn(Instant creadoEn) {
        this.creadoEn = creadoEn;
    }
}
