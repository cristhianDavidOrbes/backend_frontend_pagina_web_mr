package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;

import com.algolab.backend_werb_mr.dtos.ActualizarReporteIaRequest;
import com.algolab.backend_werb_mr.dtos.ReporteNivelDTO;
import com.algolab.backend_werb_mr.modelos.ProgresoNivel;
import com.algolab.backend_werb_mr.modelos.ReporteNivel;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.IReporteNivelRepositorio;

class ReporteNivelServicioTest {
    @Test
    void creaReporteBaseYPermiteEnriquecerloConIaSinInventarElNivel() {
        IReporteNivelRepositorio repositorio = mock(IReporteNivelRepositorio.class);
        AtomicReference<ReporteNivel> guardado = new AtomicReference<>();
        Usuario usuario = new Usuario(7L, "Ada", "ada@test.com", Rol.ESTUDIANTE, "123456");

        when(repositorio.findByUsuarioAndNivel(usuario, 3))
                .thenAnswer(invocacion -> Optional.ofNullable(guardado.get()));
        when(repositorio.save(any(ReporteNivel.class))).thenAnswer(invocacion -> {
            ReporteNivel reporte = invocacion.getArgument(0);
            reporte.normalizar();
            guardado.set(reporte);
            return reporte;
        });

        ProgresoNivel progreso = new ProgresoNivel();
        progreso.setUsuario(usuario);
        progreso.setNivel(3);
        progreso.setCompletado(true);
        progreso.setPuntaje(78);
        progreso.setTiempoRestante(54);
        progreso.setIntentos(2);

        ReporteNivelServicio servicio = new ReporteNivelServicio(repositorio);
        ReporteNivelDTO base = servicio.sincronizarDesdeProgreso(usuario, progreso);

        assertEquals("Encapsulamiento", base.getTituloNivel());
        assertEquals(78, base.getDominio());
        assertFalse(base.getGeneradoPorIa());
        assertFalse(base.getFortalezas().isEmpty());
        assertFalse(base.getRecomendaciones().isEmpty());

        ActualizarReporteIaRequest ia = new ActualizarReporteIaRequest();
        ia.setDominio(84);
        ia.setResumen("Ada protege correctamente el estado interno del objeto.");
        ia.setFortalezas(List.of("Distingue miembros privados", "Usa métodos públicos"));
        ia.setAspectosMejora(List.of("Explicar la validación"));
        ia.setRecomendaciones(List.of("Crear otro ejemplo de encapsulamiento"));

        ReporteNivelDTO enriquecido = servicio.actualizarConIa(usuario, 3, ia);

        assertEquals(84, enriquecido.getDominio());
        assertTrue(enriquecido.getGeneradoPorIa());
        assertEquals("Encapsulamiento", enriquecido.getTituloNivel());
        assertEquals(2, enriquecido.getFortalezas().size());
        assertEquals("Explicar la validación", enriquecido.getAspectosMejora().get(0));
    }
}
