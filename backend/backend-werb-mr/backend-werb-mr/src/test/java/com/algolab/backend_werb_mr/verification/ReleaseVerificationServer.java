package com.algolab.backend_werb_mr.verification;

import org.springframework.boot.SpringApplication;
import com.algolab.backend_werb_mr.BackendWerbMrApplication;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.servicios.IUsuarioServicio;

/** Servidor real local para Next → Spring, con base de datos efímera y cuentas ficticias. */
public final class ReleaseVerificationServer {
    public static final String PASSWORD = "VerificacionLocal2026!";

    private ReleaseVerificationServer() { }

    public static void main(String[] args) {
        // No se llama al main de producción: su inicializador de DATABASE_URL
        // no debe poder seleccionar una base de datos remota para esta prueba.
        var contexto = new SpringApplication(BackendWerbMrApplication.class).run(
                "--server.address=127.0.0.1",
                "--server.port=18080",
                "--spring.datasource.url=jdbc:h2:mem:release_verification_20261007;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=15000",
                "--spring.datasource.driver-class-name=org.h2.Driver",
                "--spring.datasource.username=sa", "--spring.datasource.password=",
                "--spring.jpa.hibernate.ddl-auto=create-drop",
                "--spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
                "--spring.datasource.hikari.maximum-pool-size=12",
                "--spring.datasource.hikari.connection-timeout=5000",
                "--app.jwt.secret=solo-pruebas-locales-algolab-20261007-nunca-produccion",
                "--app.jwt.expiracion-ms=86400000",
                "--app.admin.contrasena=", "--app.admin.correo=admin.disabled@example.test",
                "--app.segundo-factor.habilitado=false", "--app.segundo-factor.obligatorio=false",
                "--app.email2fa.enabled=false", "--app.segundo-factor.remitente=no-mail@example.test",
                "--app.segundo-factor.twilio-account-sid=", "--app.segundo-factor.twilio-auth-token=",
                "--app.segundo-factor.twilio-from-number=", "--app.segundo-factor.textbelt-api-key=",
                "--spring.mail.host=127.0.0.1", "--spring.mail.port=1",
                "--spring.mail.username=no-mail@example.test", "--spring.mail.password=solo-pruebas",
                "--spring.mail.properties.mail.smtp.connectiontimeout=1000",
                "--spring.mail.properties.mail.smtp.timeout=1000",
                "--spring.mail.properties.mail.smtp.writetimeout=1000");
        String url = contexto.getEnvironment().getProperty("spring.datasource.url", "");
        if (!url.startsWith("jdbc:h2:mem:release_verification_")) {
            contexto.close();
            throw new IllegalStateException("La verificación solo admite H2 efímera");
        }
        IUsuarioServicio usuarios = contexto.getBean(IUsuarioServicio.class);
        registrar(usuarios, "Estudiante verificación", "estudiante.release@example.test", Rol.ESTUDIANTE);
        registrar(usuarios, "Docente verificación", "docente.release@example.test", Rol.DOCENTE);
        registrar(usuarios, "Administrador verificación", "admin.release@example.test", Rol.ADMINISTRADOR);
        System.out.println("ALGOLAB_RELEASE_VERIFICATION_READY port=18080 database=H2_IN_MEMORY fixtures=3 mail=DISABLED");
    }

    private static void registrar(IUsuarioServicio usuarios, String nombre, String correo, Rol rol) {
        usuarios.registrar(new Usuario(null, nombre, correo, rol, PASSWORD));
    }
}
