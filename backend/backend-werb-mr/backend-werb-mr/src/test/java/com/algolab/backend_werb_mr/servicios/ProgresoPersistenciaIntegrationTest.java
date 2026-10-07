package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import com.algolab.backend_werb_mr.dtos.ActualizarReporteIaRequest;
import com.algolab.backend_werb_mr.dtos.GuardarProgresoRequest;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.IProgresoNivelRepositorio;

@SpringBootTest
class ProgresoPersistenciaIntegrationTest {
    @Autowired IProgresoServicio progreso;
    @Autowired IUsuarioServicio usuarios;
    @Autowired ReporteNivelServicio reportes;
    @Autowired IProgresoNivelRepositorio registros;

    @Test
    void confirmaCuatroPracticasYConservaResultadosAlReintentar() {
        Usuario usuario = usuarios.registrar(new Usuario(null, "Sincronización integración",
                "sincronizacion.integracion@campusucc.edu.co", Rol.ESTUDIANTE, "PruebaSegura123"));
        var uno = resultado(1, 87, 97, 23);
        var guardado = progreso.guardarProgreso(usuario, uno);
        assertEquals(87, guardado.getPuntajeTotal());
        assertEquals(2, guardado.getNivelActual());
        assertEquals(97, registros.findByUsuarioAndNivel(usuario, 1).orElseThrow().getTiempoRestante());
        assertEquals(1, reportes.listarUsuario(usuario).size());

        ActualizarReporteIaRequest informe = new ActualizarReporteIaRequest();
        informe.setPuntajeBase(87); informe.setTiempoRestanteBase(97);
        informe.setIntentosBase(1); informe.setCompletadoBase(true);
        informe.setDominio(73); informe.setResumen("Explicación basada en la práctica observada");
        informe.setAspectosMejora(List.of());
        reportes.actualizarConIa(usuario, 1, informe);
        progreso.guardarProgreso(usuario, uno);
        assertTrue(reportes.listarUsuario(usuario).getFirst().getGeneradoPorIa());

        progreso.guardarProgreso(usuario, resultado(2, 190, 100, 163));
        progreso.guardarProgreso(usuario, resultado(3, 100, 60, 403));
        var finalizado = progreso.guardarProgreso(usuario, resultado(4, 240, 250, 453));
        assertEquals(4, finalizado.getTotalNivelesVr());
        assertEquals(4, finalizado.getNivelesVrCompletados());
        assertTrue(finalizado.getRutaVrCompletada());
        assertEquals(4, finalizado.getNivelActual());
        assertEquals(617, finalizado.getPuntajeTotal());
        assertEquals(4, registros.findByUsuarioOrderByNivelAsc(usuario).size());
        assertEquals(4, reportes.listarUsuario(usuario).size());
        assertEquals(617, usuarios.buscarPorId(usuario.getId()).orElseThrow().getPuntaje());
        assertEquals(453, usuarios.buscarPorId(usuario.getId()).orElseThrow().getTiempoJugadoSegundos());
        var repetido = progreso.guardarProgreso(usuario, uno);
        assertEquals(617, repetido.getPuntajeTotal());
        assertEquals(453, repetido.getTiempoJugadoSegundos());
        assertThrows(IllegalArgumentException.class,
                () -> progreso.guardarProgreso(usuario, resultado(1, 121, 97, 23)));
        assertEquals(617, progreso.consultarProgreso(usuarios.buscarPorId(usuario.getId()).orElseThrow()).getPuntajeTotal());
    }

    static GuardarProgresoRequest resultado(int nivel, int puntos, int restante, int jugado) {
        GuardarProgresoRequest resultado = new GuardarProgresoRequest();
        resultado.setNivel(nivel); resultado.setPuntaje(puntos); resultado.setTiempoRestante(restante);
        resultado.setIntentos(1); resultado.setCompletado(true); resultado.setTiempoJugadoSegundos(jugado);
        return resultado;
    }
}
