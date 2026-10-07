package com.algolab.backend_werb_mr.seguridad;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:servicio_ia;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "ALGOLAB_IA_SERVICE_KEY=clave-ficticia-solo-pruebas-no-produccion-123456"
})
@AutoConfigureMockMvc
class IaServicioAccesoIntegrationTest {
    private static final String CLAVE = "clave-ficticia-solo-pruebas-no-produccion-123456";
    @Autowired MockMvc http;

    @Test void leeLosNivelesYLaConfiguracionSinCuentaAdministradora() throws Exception {
        http.perform(get("/api/niveles").header(IaServicioFiltro.HEADER, CLAVE)).andExpect(status().isOk());
        for (int nivel = 1; nivel <= 4; nivel++) {
            http.perform(get("/api/configuracion-tutor/niveles/" + nivel).header(IaServicioFiltro.HEADER, CLAVE))
                    .andExpect(status().isOk());
        }
    }

    @Test void sinClaveOConClaveIncorrectaNoLeeConfiguracionPrivada() throws Exception {
        http.perform(get("/api/niveles")).andExpect(status().isUnauthorized());
        http.perform(get("/api/configuracion-tutor/niveles/1").header(IaServicioFiltro.HEADER, "incorrecta"))
                .andExpect(status().isUnauthorized());
    }

    @Test void laClaveNoAccedeACuentasResultadosNiConfiguracionGlobal() throws Exception {
        for (String ruta : new String[] {"/api/usuarios/me", "/api/usuarios", "/api/progreso/me",
                "/api/reportes-nivel/me", "/api/configuracion-tutor/niveles", "/api/configuracion-tutor/reglas-sistema",
                "/api/niveles/1", "/api/configuracion-tutor/niveles/1/extra"}) {
            http.perform(get(ruta).header(IaServicioFiltro.HEADER, CLAVE)).andExpect(status().isUnauthorized());
        }
    }

    @Test void laClaveNoModificaConfiguracionProgresoInformesNiCuentas() throws Exception {
        for (String ruta : new String[] {"/api/configuracion-tutor/niveles/1", "/api/reportes-nivel/1/ia",
                "/api/usuarios/1"}) {
            http.perform(put(ruta).header(IaServicioFiltro.HEADER, CLAVE)
                    .contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isUnauthorized());
        }
        http.perform(post("/api/progreso").header(IaServicioFiltro.HEADER, CLAVE)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        http.perform(delete("/api/niveles/1").header(IaServicioFiltro.HEADER, CLAVE))
                .andExpect(status().isUnauthorized());
    }

    @Test void unaLecturaTecnicaNoDejaSesionParaLaSiguientePeticion() throws Exception {
        http.perform(get("/api/niveles").header(IaServicioFiltro.HEADER, CLAVE)).andExpect(status().isOk());
        http.perform(get("/api/niveles")).andExpect(status().isUnauthorized());
        http.perform(get("/api/usuarios/me")).andExpect(status().isUnauthorized());
    }
}
