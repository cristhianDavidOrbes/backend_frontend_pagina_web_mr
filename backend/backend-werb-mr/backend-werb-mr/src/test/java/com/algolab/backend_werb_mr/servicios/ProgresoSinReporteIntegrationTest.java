package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.IProgresoNivelRepositorio;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:progreso_sin_reportes;MODE=PostgreSQL;DB_CLOSE_DELAY=-1")
class ProgresoSinReporteIntegrationTest {
    @Autowired IProgresoServicio progreso;
    @Autowired IUsuarioServicio usuarios;
    @Autowired IProgresoNivelRepositorio registros;
    @MockitoBean ReporteNivelServicio reportes;

    @Test
    void fallaDelInformeNoRevierteNiBloqueaLaPracticaSiguiente() {
        Usuario usuario = usuarios.registrar(new Usuario(null, "IA no disponible integración",
                "sin.informe@campusucc.edu.co", Rol.ESTUDIANTE, "PruebaSegura123"));
        when(reportes.sincronizarConfirmado(any(), any())).thenThrow(new IllegalStateException("Fallo simulado de informes"));
        assertEquals(87, progreso.guardarProgreso(usuario,
                ProgresoPersistenciaIntegrationTest.resultado(1, 87, 97, 23)).getPuntajeTotal());
        assertTrue(registros.findByUsuarioAndNivel(usuario, 1).orElseThrow().getCompletado());
        assertEquals(277, progreso.guardarProgreso(usuario,
                ProgresoPersistenciaIntegrationTest.resultado(2, 190, 100, 163)).getPuntajeTotal());
        assertTrue(registros.findByUsuarioAndNivel(usuario, 2).orElseThrow().getCompletado());
        verify(reportes, timeout(3000)).sincronizarConfirmado(usuario.getId(), 1);
        verify(reportes, timeout(3000)).sincronizarConfirmado(usuario.getId(), 2);
    }
}
