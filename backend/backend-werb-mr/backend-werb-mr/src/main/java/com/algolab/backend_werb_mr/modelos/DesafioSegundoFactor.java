package com.algolab.backend_werb_mr.modelos;

import java.time.Instant;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "desafios_segundo_factor")
public class DesafioSegundoFactor {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 36)
    private String identificador;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Usuario usuario;

    /** Solo se persiste el hash BCrypt; el codigo en claro nunca llega a la BD. */
    @Column(nullable = false, length = 100)
    private String codigoHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CanalSegundoFactor canal;

    @Column(nullable = false)
    private Instant creadoEn;

    @Column(nullable = false)
    private Instant expiraEn;

    @Column(nullable = false)
    private Instant reenvioDisponibleEn;

    @Column(nullable = false)
    private int intentosFallidos;

    @Column(nullable = false)
    private boolean usado;

    @Column(nullable = false)
    private boolean invalidado;

    @Version
    private long version;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getIdentificador() {
        return identificador;
    }

    public void setIdentificador(String identificador) {
        this.identificador = identificador;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    public String getCodigoHash() {
        return codigoHash;
    }

    public void setCodigoHash(String codigoHash) {
        this.codigoHash = codigoHash;
    }

    public CanalSegundoFactor getCanal() {
        return canal;
    }

    public void setCanal(CanalSegundoFactor canal) {
        this.canal = canal;
    }

    public Instant getCreadoEn() {
        return creadoEn;
    }

    public void setCreadoEn(Instant creadoEn) {
        this.creadoEn = creadoEn;
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

    public long getVersion() {
        return version;
    }

    public void setVersion(long version) {
        this.version = version;
    }
}
