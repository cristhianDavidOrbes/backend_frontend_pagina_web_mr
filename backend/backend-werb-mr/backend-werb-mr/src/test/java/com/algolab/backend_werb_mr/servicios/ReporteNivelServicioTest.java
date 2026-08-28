package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
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
    private static ReporteNivelServicio crearServicio(IReporteNivelRepositorio repositorio) {
        ConfiguracionTutorNivelServicio configuracion = mock(ConfiguracionTutorNivelServicio.class);
        when(configuracion.buscarModelo(anyInt())).thenReturn(null);
        return new ReporteNivelServicio(repositorio, configuracion);
    }

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

        ReporteNivelServicio servicio = crearServicio(repositorio);
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
        ia.setPuntajeBase(78);
        ia.setTiempoRestanteBase(54);
        ia.setIntentosBase(2);
        ia.setCompletadoBase(true);

        ReporteNivelDTO enriquecido = servicio.actualizarConIa(usuario, 3, ia);

        assertEquals(84, enriquecido.getDominio());
        assertTrue(enriquecido.getGeneradoPorIa());
        assertEquals("Encapsulamiento", enriquecido.getTituloNivel());
        assertEquals(2, enriquecido.getFortalezas().size());
        assertEquals("Explicar la validación", enriquecido.getAspectosMejora().get(0));

        ReporteNivelDTO resincronizado = servicio.sincronizarDesdeProgreso(usuario, progreso);
        assertTrue(resincronizado.getGeneradoPorIa());
        assertEquals("Explicar la validación", resincronizado.getAspectosMejora().get(0));
    }

    @Test
    void desempenoCorrectoMantieneAspectosMejoraVacios() {
        IReporteNivelRepositorio repositorio = mock(IReporteNivelRepositorio.class);
        AtomicReference<ReporteNivel> guardado = new AtomicReference<>();
        Usuario usuario = new Usuario(8L, "Grace", "grace@test.com", Rol.ESTUDIANTE, "123456");

        when(repositorio.findByUsuarioAndNivel(usuario, 1))
                .thenAnswer(invocacion -> Optional.ofNullable(guardado.get()));
        when(repositorio.save(any(ReporteNivel.class))).thenAnswer(invocacion -> {
            ReporteNivel reporte = invocacion.getArgument(0);
            reporte.normalizar();
            guardado.set(reporte);
            return reporte;
        });

        ProgresoNivel progreso = new ProgresoNivel();
        progreso.setUsuario(usuario);
        progreso.setNivel(1);
        progreso.setCompletado(true);
        progreso.setPuntaje(100);
        progreso.setTiempoRestante(90);
        progreso.setIntentos(1);

        ReporteNivelServicio servicio = crearServicio(repositorio);
        ReporteNivelDTO base = servicio.sincronizarDesdeProgreso(usuario, progreso);
        assertTrue(base.getAspectosMejora().isEmpty());

        ActualizarReporteIaRequest ia = new ActualizarReporteIaRequest();
        ia.setDominio(100);
        ia.setResumen("Completó el nivel sin errores.");
        ia.setFortalezas(List.of("Comprensión conceptual"));
        ia.setAspectosMejora(List.of());
        ia.setRecomendaciones(List.of("Aplicar el concepto en otro caso"));
        ia.setPuntajeBase(100);
        ia.setTiempoRestanteBase(90);
        ia.setIntentosBase(1);
        ia.setCompletadoBase(true);

        ReporteNivelDTO enriquecido = servicio.actualizarConIa(usuario, 1, ia);
        assertTrue(enriquecido.getAspectosMejora().isEmpty());
    }

    @Test
    void rechazaUnInformeIaGeneradoConMetricasDeUnIntentoAnterior() {
        IReporteNivelRepositorio repositorio = mock(IReporteNivelRepositorio.class);
        Usuario usuario = new Usuario(9L, "Linus", "linus@campusucc.edu.co", Rol.ESTUDIANTE, "123456");
        ReporteNivel actual = new ReporteNivel();
        actual.setUsuario(usuario);
        actual.setNivel(4);
        actual.setPuntaje(210);
        actual.setTiempoRestante(120);
        actual.setIntentos(2);
        actual.setCompletado(true);
        when(repositorio.findByUsuarioAndNivel(usuario, 4)).thenReturn(Optional.of(actual));

        ActualizarReporteIaRequest anterior = new ActualizarReporteIaRequest();
        anterior.setResumen("Informe de un intento anterior");
        anterior.setPuntajeBase(170);
        anterior.setTiempoRestanteBase(80);
        anterior.setIntentosBase(1);
        anterior.setCompletadoBase(true);

        ReporteNivelServicio servicio = crearServicio(repositorio);
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> servicio.actualizarConIa(usuario, 4, anterior));

        assertTrue(error.getMessage().contains("progreso cambió"));
    }
}
