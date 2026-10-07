package com.algolab.backend_werb_mr.seguridad;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.servicios.IUsuarioServicio;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:seguridad_integracion;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "app.segundo-factor.obligatorio=false",
        "app.segundo-factor.habilitado=false"
})
@AutoConfigureMockMvc
class AutenticacionAislamientoIntegrationTest {
    private static final ObjectMapper JSON = new ObjectMapper();
    @Autowired MockMvc http;
    @Autowired IUsuarioServicio usuarios;
    @Autowired JwtServicio jwt;

    @Test
    void loginRealValidaContrasenaYNoExponeSuHash() throws Exception {
        Usuario estudiante = usuario(Rol.ESTUDIANTE);
        http.perform(post("/api/usuarios/iniciar-sesion").contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("correo", estudiante.getCorreo(), "contrasena", "Incorrecta"))))
                .andExpect(status().isUnauthorized());
        String token = iniciar(estudiante);
        assertTrue(jwt.tokenValido(token));
        http.perform(get("/api/usuarios/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.contrasena").doesNotExist())
                .andExpect(jsonPath("$.correo").value(estudiante.getCorreo()));
    }

    @Test
    void tokenInvalidoExpiradoODelSegundoFactorNoPermiteLeerProgreso() throws Exception {
        Usuario estudiante = usuario(Rol.ESTUDIANTE);
        http.perform(get("/api/progreso/me")).andExpect(status().isUnauthorized());
        http.perform(get("/api/progreso/me").header("Authorization", "Bearer token-invalido"))
                .andExpect(status().isUnauthorized());
        String expirado = new JwtServicio("clave-de-pruebas-algolab-suficientemente-larga-y-segura", -1000)
                .generarToken(estudiante);
        http.perform(get("/api/progreso/me").header("Authorization", "Bearer " + expirado))
                .andExpect(status().isUnauthorized());
        http.perform(get("/api/progreso/me").header("Authorization", "Bearer " + jwt.generarTokenTemporal2FA(estudiante)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void estudianteNoPuedeConsultarOtraCuentaNiAdministrarRolesOConfiguracion() throws Exception {
        Usuario estudiante = usuario(Rol.ESTUDIANTE);
        Usuario otraCuenta = usuario(Rol.ESTUDIANTE);
        String token = iniciar(estudiante);
        for (String ruta : new String[] {"/api/usuarios", "/api/reportes-nivel",
                "/api/reportes-nivel/usuario/" + otraCuenta.getId(), "/api/progreso/usuario/" + otraCuenta.getId(),
                "/api/configuracion-tutor/niveles"}) {
            http.perform(get(ruta).header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        }
        http.perform(put("/api/configuracion-tutor/niveles/1").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        http.perform(get("/api/configuracion-tutor/niveles/1").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void docenteConsultaResultadosYAdministradorGestionaSinCompartirTokens() throws Exception {
        Usuario estudiante = usuario(Rol.ESTUDIANTE);
        String docente = iniciar(usuario(Rol.DOCENTE));
        String administrador = iniciar(usuario(Rol.ADMINISTRADOR));
        http.perform(get("/api/progreso/usuario/" + estudiante.getId()).header("Authorization", "Bearer " + docente))
                .andExpect(status().isOk()).andExpect(jsonPath("$.usuarioId").value(estudiante.getId()));
        http.perform(get("/api/reportes-nivel/usuario/" + estudiante.getId()).header("Authorization", "Bearer " + docente))
                .andExpect(status().isOk());
        http.perform(get("/api/configuracion-tutor/niveles").header("Authorization", "Bearer " + docente))
                .andExpect(status().isForbidden());
        http.perform(get("/api/configuracion-tutor/niveles").header("Authorization", "Bearer " + administrador))
                .andExpect(status().isOk());
    }

    @Test
    void reducirRolEnBaseDeDatosRevocaPermisosDelJwtAnterior() throws Exception {
        Usuario administrador = usuario(Rol.ADMINISTRADOR);
        String token = iniciar(administrador);
        http.perform(get("/api/configuracion-tutor/niveles").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        administrador.setRol(Rol.ESTUDIANTE);
        usuarios.actualizar(administrador);
        http.perform(get("/api/configuracion-tutor/niveles").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void registroPublicoNoCreaAdministradorYUnaCuentaEliminadaNoConservaAcceso() throws Exception {
        http.perform(post("/api/usuarios/registrar").contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("nombre", "Registro protegido", "correo",
                        "administrador-" + UUID.randomUUID() + "@campusucc.edu.co", "contrasena", "PruebaSegura123", "rol", "ADMINISTRADOR"))))
                .andExpect(status().isForbidden());
        Usuario estudiante = usuario(Rol.ESTUDIANTE);
        String token = iniciar(estudiante);
        usuarios.eliminarPorId(estudiante.getId());
        http.perform(get("/api/usuarios/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void practicasHttpSeConfirmanYLosInformesSonPropiosDeLaCuenta() throws Exception {
        Usuario estudiante = usuario(Rol.ESTUDIANTE);
        Usuario otraCuenta = usuario(Rol.ESTUDIANTE);
        String token = iniciar(estudiante);
        http.perform(post("/api/progreso").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(resultado(2, 190, 100, 163)))
                .andExpect(status().isBadRequest());
        int[] puntos = {87, 190, 100, 240};
        int[] restante = {97, 100, 60, 250};
        int[] tiempo = {23, 163, 403, 453};
        for (int nivel = 1; nivel <= 4; nivel++) {
            http.perform(post("/api/progreso").header("Authorization", "Bearer " + token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(resultado(nivel, puntos[nivel - 1], restante[nivel - 1], tiempo[nivel - 1])))
                    .andExpect(status().isOk());
        }
        http.perform(get("/api/progreso/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nivelActual").value(4))
                .andExpect(jsonPath("$.puntajeTotal").value(617)).andExpect(jsonPath("$.tiempoJugadoSegundos").value(453))
                .andExpect(jsonPath("$.nivelesVrCompletados").value(4)).andExpect(jsonPath("$.rutaVrCompletada").value(true));
        http.perform(put("/api/reportes-nivel/1/ia").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"puntajeBase":87,"tiempoRestanteBase":97,"intentosBase":1,"completadoBase":true,
                         "dominio":73,"resumen":"Evaluación de la práctica propia","aspectosMejora":[]}
                        """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.generadoPorIa").value(true));
        http.perform(get("/api/reportes-nivel/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(4));
        String otroToken = iniciar(otraCuenta);
        http.perform(get("/api/progreso/me").header("Authorization", "Bearer " + otroToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.puntajeTotal").value(0));
        http.perform(get("/api/reportes-nivel/me").header("Authorization", "Bearer " + otroToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        http.perform(put("/api/reportes-nivel/1/ia").header("Authorization", "Bearer " + otroToken)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"puntajeBase":87,"tiempoRestanteBase":97,"intentosBase":1,"completadoBase":true,"resumen":"No autorizado"}
                        """))
                .andExpect(status().isConflict());
    }

    @Test
    void administradorPuedeEliminarCuentaConPracticasSinBorrarOtraCuenta() throws Exception {
        Usuario estudiante = usuario(Rol.ESTUDIANTE);
        Usuario conservado = usuario(Rol.ESTUDIANTE);
        String token = iniciar(estudiante);
        http.perform(post("/api/progreso").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(resultado(1, 87, 97, 23)))
                .andExpect(status().isOk());
        http.perform(get("/api/reportes-nivel/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
        http.perform(post("/api/oop/progreso").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nivel\":1,\"lenguaje\":\"python\",\"completado\":true,\"puntaje\":10,\"intentos\":1,\"usoPista\":false}"))
                .andExpect(status().isOk());
        String administrador = iniciar(usuario(Rol.ADMINISTRADOR));
        http.perform(delete("/api/usuarios/" + estudiante.getId()).header("Authorization", "Bearer " + administrador))
                .andExpect(status().isNoContent());
        assertTrue(usuarios.buscarPorId(estudiante.getId()).isEmpty());
        assertTrue(usuarios.buscarPorId(conservado.getId()).isPresent());
        http.perform(get("/api/progreso/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    private Usuario usuario(Rol rol) {
        return usuarios.registrar(new Usuario(null, "Integración " + rol,
                "seguridad-" + UUID.randomUUID() + "@campusucc.edu.co", rol, "PruebaSegura123"));
    }

    private String iniciar(Usuario usuario) throws Exception {
        var respuesta = http.perform(post("/api/usuarios/iniciar-sesion").contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("correo", usuario.getCorreo(), "contrasena", "PruebaSegura123"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.exitoso").value(true))
                .andExpect(jsonPath("$.usuario.contrasena").doesNotExist()).andReturn().getResponse().getContentAsString();
        return JSON.readTree(respuesta).get("token").asText();
    }

    private static String resultado(int nivel, int puntos, int restante, int jugado) throws Exception {
        return JSON.writeValueAsString(Map.of("nivel", nivel, "puntaje", puntos, "tiempoRestante", restante,
                "tiempoJugadoSegundos", jugado, "intentos", 1, "completado", true));
    }
}
