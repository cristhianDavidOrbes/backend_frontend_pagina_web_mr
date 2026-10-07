package com.algolab.backend_werb_mr.seguridad;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.servlet.FilterChain;

class IaServicioFiltroTest {
    private static final String CLAVE = "clave-ficticia-solo-pruebas-no-produccion-123456";

    @AfterEach void limpiar() { SecurityContextHolder.clearContext(); }

    @Test void claveValidaSoloOtorgaUnRolTecnico() throws Exception {
        for (String ruta : List.of("/api/niveles", "/api/configuracion-tutor/niveles/1", "/api/configuracion-tutor/niveles/4")) {
            SecurityContextHolder.clearContext();
            ejecutar(new IaServicioFiltro(CLAVE), "GET", ruta, CLAVE);
            var auth = SecurityContextHolder.getContext().getAuthentication();
            assertEquals("algolab-servicio-ia", auth.getName());
            assertEquals(List.of(new SimpleGrantedAuthority("ROLE_SERVICIO_IA")), List.copyOf(auth.getAuthorities()));
            assertNull(auth.getCredentials());
        }
    }

    @Test void claveAusenteIncorrectaVaciaOCortaNoAutentica() throws Exception {
        for (String clave : List.of("", "incorrecta", CLAVE + "x", " " + CLAVE)) {
            ejecutar(new IaServicioFiltro(CLAVE), "GET", "/api/niveles", clave);
            assertNull(SecurityContextHolder.getContext().getAuthentication());
        }
        ejecutar(new IaServicioFiltro(CLAVE), "GET", "/api/niveles", null);
        ejecutar(new IaServicioFiltro(""), "GET", "/api/niveles", "");
        ejecutar(new IaServicioFiltro("corta"), "GET", "/api/niveles", "corta");
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test void ningunaMutacionNiOtroEndpointRecibeAutenticacionTecnica() throws Exception {
        for (String metodo : List.of("POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS")) {
            ejecutar(new IaServicioFiltro(CLAVE), metodo, "/api/niveles", CLAVE);
            ejecutar(new IaServicioFiltro(CLAVE), metodo, "/api/configuracion-tutor/niveles/1", CLAVE);
            assertNull(SecurityContextHolder.getContext().getAuthentication());
        }
        for (String ruta : List.of("/api/usuarios", "/api/progreso/me", "/api/reportes-nivel/me",
                "/api/configuracion-tutor/niveles", "/api/niveles/1", "/api/niveles/",
                "/api/configuracion-tutor/niveles/0", "/api/configuracion-tutor/niveles/1/extra",
                "/api/configuracion-tutor/niveles/1;otra", "/api/configuracion-tutor/niveles/%31")) {
            ejecutar(new IaServicioFiltro(CLAVE), "GET", ruta, CLAVE);
            assertNull(SecurityContextHolder.getContext().getAuthentication(), ruta);
        }
    }

    @Test void noReemplazaSesionHumanaNiAceptaHeadersDuplicados() throws Exception {
        var humano = new UsernamePasswordAuthenticationToken("estudiante@example.test", null,
                List.of(new SimpleGrantedAuthority("ROLE_ESTUDIANTE")));
        SecurityContextHolder.getContext().setAuthentication(humano);
        ejecutar(new IaServicioFiltro(CLAVE), "GET", "/api/niveles", CLAVE);
        assertSame(humano, SecurityContextHolder.getContext().getAuthentication());
        SecurityContextHolder.clearContext();
        var request = new MockHttpServletRequest("GET", "/api/niveles");
        request.addHeader(IaServicioFiltro.HEADER, CLAVE);
        request.addHeader(IaServicioFiltro.HEADER, CLAVE);
        new IaServicioFiltro(CLAVE).doFilter(request, new MockHttpServletResponse(), mock(FilterChain.class));
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    private static void ejecutar(IaServicioFiltro filtro, String metodo, String ruta, String clave) throws Exception {
        var request = new MockHttpServletRequest(metodo, ruta);
        if (clave != null) request.addHeader(IaServicioFiltro.HEADER, clave);
        var chain = mock(FilterChain.class);
        filtro.doFilter(request, new MockHttpServletResponse(), chain);
        verify(chain).doFilter(any(), any());
    }
}
