package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionTemplate;

import com.algolab.backend_werb_mr.dtos.ActualizarReporteIaRequest;
import com.algolab.backend_werb_mr.dtos.GuardarProgresoOopRequest;
import com.algolab.backend_werb_mr.modelos.ProgresoNivel;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.IProgresoNivelRepositorio;
import com.algolab.backend_werb_mr.repositorio.IProgresoOopRepositorio;
import com.algolab.backend_werb_mr.repositorio.IReporteNivelRepositorio;

/** Transacciones reales concurrentes; no simula PostgreSQL ni capacidad del despliegue. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:sincronizacion_concurrente;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=15000",
        "spring.datasource.hikari.maximum-pool-size=8",
        "spring.datasource.hikari.connection-timeout=5000"
})
class SincronizacionConcurrenteIntegrationTest {
    @Autowired IUsuarioServicio usuarios;
    @Autowired IProgresoServicio progreso;
    @Autowired IProgresoOopServicio oop;
    @Autowired ReporteNivelServicio reportes;
    @Autowired IProgresoNivelRepositorio niveles;
    @Autowired IProgresoOopRepositorio nivelesWeb;
    @Autowired IReporteNivelRepositorio informes;
    @Autowired AvatarServicio avatar;
    @Autowired TransactionTemplate transacciones;
    @PersistenceContext EntityManager entityManager;

    @Test
    void laWebNoRevierteNivelNiTiempoConfirmadoEnLasGafasConUnPerfilDesactualizado() {
        Usuario perfilAnterior = usuario("perfil-desactualizado");
        progreso.guardarProgreso(perfilAnterior, ProgresoPersistenciaIntegrationTest.resultado(1, 87, 97, 23));

        oop.guardarProgreso(perfilAnterior, ejercicioWeb(1, 10));

        Usuario confirmado = usuarios.buscarPorId(perfilAnterior.getId()).orElseThrow();
        assertEquals(2, confirmado.getNivelActual());
        assertEquals(23, confirmado.getTiempoJugadoSegundos());
        assertEquals(97, confirmado.getPuntaje());
    }

    @Test
    void doceReintentosConcurrentesNoDuplicanResultadosNiPierdenElMejorPuntaje() throws Exception {
        Usuario usuario = usuario("reintentos");
        List<Callable<Void>> operaciones = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            int puntos = 80 + i;
            int jugado = 20 + i;
            operaciones.add(() -> {
                progreso.guardarProgreso(usuario, ProgresoPersistenciaIntegrationTest.resultado(1, puntos, 97, jugado));
                return null;
            });
        }
        concurrentemente(operaciones);

        Usuario confirmado = usuarios.buscarPorId(usuario.getId()).orElseThrow();
        assertEquals(91, confirmado.getPuntaje());
        assertEquals(31, confirmado.getTiempoJugadoSegundos());
        assertEquals(2, confirmado.getNivelActual());
        assertEquals(1, niveles.findByUsuarioOrderByNivelAsc(usuario).size());
        assertEquals(91, reportes.listarUsuario(usuario).getFirst().getPuntaje());
        assertEquals(1, informes.findByUsuarioOrderByNivelAsc(usuario).size());
    }

    @Test
    void doceLectoresReparanUnReportePendienteSinInsercionesDuplicadas() throws Exception {
        Usuario usuario = usuario("reporte-pendiente");
        ProgresoNivel confirmado = new ProgresoNivel();
        confirmado.setUsuario(usuario); confirmado.setNivel(1); confirmado.setCompletado(true);
        confirmado.setPuntaje(87); confirmado.setTiempoRestante(97); confirmado.setIntentos(1);
        niveles.saveAndFlush(confirmado);

        List<Callable<Void>> consultas = new ArrayList<>();
        for (int i = 0; i < 12; i++) consultas.add(() -> {
            assertEquals(1, reportes.listarUsuario(usuario).size());
            return null;
        });
        concurrentemente(consultas);
        assertEquals(1, informes.findByUsuarioOrderByNivelAsc(usuario).size());
    }

    @Test
    void lecturaConcurrenteNoBorraInformeDeIaConMetricasConfirmadas() throws Exception {
        Usuario usuario = usuario("reporte-ia");
        progreso.guardarProgreso(usuario, ProgresoPersistenciaIntegrationTest.resultado(1, 87, 97, 23));
        reportes.listarUsuario(usuario);
        List<Callable<Void>> operaciones = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            operaciones.add(() -> { reportes.listarUsuario(usuario); return null; });
            operaciones.add(() -> { reportes.actualizarConIa(usuario, 1, informe(87, 97)); return null; });
        }
        concurrentemente(operaciones);
        var confirmado = informes.findByUsuarioAndNivel(usuario, 1).orElseThrow();
        assertTrue(confirmado.getGeneradoPorIa());
        assertEquals("Evidencia propia de esta cuenta", confirmado.getResumen());
        assertEquals(87, confirmado.getPuntaje());
    }

    @Test
    void seisUsuariosCompletanVrYWebAlMismoTiempoSinMezclarCuentas() throws Exception {
        List<Usuario> participantes = new ArrayList<>();
        List<Callable<Void>> operaciones = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            Usuario participante = usuario("multiusuario-" + i);
            participantes.add(participante);
            int puntosUno = 87 + i;
            operaciones.add(() -> {
                progreso.guardarProgreso(participante, ProgresoPersistenciaIntegrationTest.resultado(1, puntosUno, 97, 23));
                progreso.guardarProgreso(participante, ProgresoPersistenciaIntegrationTest.resultado(2, 190, 100, 163));
                progreso.guardarProgreso(participante, ProgresoPersistenciaIntegrationTest.resultado(3, 100, 60, 403));
                progreso.guardarProgreso(participante, ProgresoPersistenciaIntegrationTest.resultado(4, 240, 250, 453));
                return null;
            });
            operaciones.add(() -> {
                oop.guardarProgreso(participante, ejercicioWeb(1, 10));
                oop.guardarProgreso(participante, ejercicioWeb(2, 15));
                return null;
            });
        }
        concurrentemente(operaciones);
        for (int i = 0; i < participantes.size(); i++) {
            Usuario participante = participantes.get(i);
            Usuario confirmado = usuarios.buscarPorId(participante.getId()).orElseThrow();
            assertEquals(642 + i, confirmado.getPuntaje());
            assertEquals(453, confirmado.getTiempoJugadoSegundos());
            assertEquals(4, confirmado.getNivelActual());
            assertEquals(4, niveles.findByUsuarioOrderByNivelAsc(participante).size());
            assertEquals(2, nivelesWeb.findByUsuarioOrderByNivelAsc(participante).size());
            var reportesPropios = reportes.listarUsuario(participante);
            assertEquals(4, reportesPropios.size());
            assertEquals(87 + i, reportesPropios.getFirst().getPuntaje());
            assertTrue(progreso.consultarProgreso(confirmado).getRutaVrCompletada());
        }
    }

    @Test
    void informeDeUnIntentoAnteriorNoSobrescribeUnaMejoraConfirmada() {
        Usuario usuario = usuario("reporte-obsoleto");
        progreso.guardarProgreso(usuario, ProgresoPersistenciaIntegrationTest.resultado(1, 87, 97, 23));
        progreso.guardarProgreso(usuario, ProgresoPersistenciaIntegrationTest.resultado(1, 110, 100, 40));
        assertThrows(IllegalArgumentException.class, () -> reportes.actualizarConIa(usuario, 1, informe(87, 97)));
        assertEquals(110, reportes.listarUsuario(usuario).getFirst().getPuntaje());
        assertEquals(110, usuarios.buscarPorId(usuario.getId()).orElseThrow().getPuntaje());
    }

    @Test
    void editarPerfilOMarcarTutorialNoRevierteProgresoDesdeUnPerfilAnterior() {
        Usuario perfilAnterior = usuario("edicion-perfil");
        progreso.guardarProgreso(perfilAnterior, ProgresoPersistenciaIntegrationTest.resultado(1, 87, 97, 23));
        perfilAnterior.setNombre("Nombre editado");
        perfilAnterior.setAvatar("robot");
        usuarios.actualizarPerfil(perfilAnterior);
        usuarios.marcarTutorialCompletado(perfilAnterior);
        Usuario confirmado = usuarios.buscarPorId(perfilAnterior.getId()).orElseThrow();
        assertEquals("Nombre editado", confirmado.getNombre());
        assertEquals("robot", confirmado.getAvatar());
        assertTrue(confirmado.isTutorialCompletado());
        assertEquals(87, confirmado.getPuntaje());
        assertEquals(23, confirmado.getTiempoJugadoSegundos());
        assertEquals(2, confirmado.getNivelActual());
    }

    @Test
    void actualizarLaFichaNoCorrigeResultadosSiNoSePidioExplicitamente() {
        Usuario perfilAnterior = usuario("ficha");
        progreso.guardarProgreso(perfilAnterior, ProgresoPersistenciaIntegrationTest.resultado(1, 87, 97, 23));
        perfilAnterior.setNombre("Ficha actualizada");
        usuarios.actualizarFicha(perfilAnterior, false, false, false);
        Usuario confirmado = usuarios.buscarPorId(perfilAnterior.getId()).orElseThrow();
        assertEquals("Ficha actualizada", confirmado.getNombre());
        assertEquals(87, confirmado.getPuntaje());
        assertEquals(23, confirmado.getTiempoJugadoSegundos());
        assertEquals(2, confirmado.getNivelActual());
        perfilAnterior.setPuntaje(42);
        usuarios.corregirProgreso(perfilAnterior, false, true);
        confirmado = usuarios.buscarPorId(perfilAnterior.getId()).orElseThrow();
        assertEquals(42, confirmado.getPuntaje());
        assertEquals(23, confirmado.getTiempoJugadoSegundos());
        assertEquals(2, confirmado.getNivelActual());
    }

    @Test
    void cambiarYEliminarAvatarNoRevierteResultadosConfirmados() throws Exception {
        Usuario perfilAnterior = usuario("avatar-con-progreso");
        progreso.guardarProgreso(perfilAnterior, ProgresoPersistenciaIntegrationTest.resultado(1, 87, 97, 23));
        BufferedImage imagen = new BufferedImage(32, 32, BufferedImage.TYPE_INT_ARGB);
        try (var salida = new ByteArrayOutputStream()) {
            ImageIO.write(imagen, "png", salida);
            avatar.guardarBytes(perfilAnterior, salida.toByteArray());
        }
        Usuario confirmado = usuarios.buscarPorId(perfilAnterior.getId()).orElseThrow();
        assertNotNull(confirmado.getAvatarVersion());
        assertEquals(87, confirmado.getPuntaje());
        assertEquals(23, confirmado.getTiempoJugadoSegundos());
        assertEquals(2, confirmado.getNivelActual());
        avatar.eliminar(perfilAnterior);
        confirmado = usuarios.buscarPorId(perfilAnterior.getId()).orElseThrow();
        assertNull(confirmado.getAvatarVersion());
        assertEquals(87, confirmado.getPuntaje());
        assertEquals(23, confirmado.getTiempoJugadoSegundos());
        assertEquals(2, confirmado.getNivelActual());
    }

    @Test
    void perfilYaCargadoEnContextoJpaSeRecargaTrasUnaConfirmacionConcurrente() throws Exception {
        Usuario usuario = usuario("contexto-jpa-previo");
        CountDownLatch perfilLeido = new CountDownLatch(1);
        CountDownLatch practicaConfirmada = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var perfil = executor.submit(() -> transacciones.execute(estado -> {
                Usuario antiguo = entityManager.find(Usuario.class, usuario.getId());
                perfilLeido.countDown();
                try {
                    assertTrue(practicaConfirmada.await(10, TimeUnit.SECONDS));
                } catch (InterruptedException error) { throw new IllegalStateException(error); }
                antiguo.setNombre("Perfil que estaba abierto");
                return usuarios.actualizarPerfil(antiguo);
            }));
            var practica = executor.submit(() -> {
                assertTrue(perfilLeido.await(10, TimeUnit.SECONDS));
                progreso.guardarProgreso(usuario, ProgresoPersistenciaIntegrationTest.resultado(1, 87, 97, 23));
                practicaConfirmada.countDown();
                return null;
            });
            practica.get(20, TimeUnit.SECONDS);
            perfil.get(20, TimeUnit.SECONDS);
        }
        Usuario confirmado = usuarios.buscarPorId(usuario.getId()).orElseThrow();
        assertEquals("Perfil que estaba abierto", confirmado.getNombre());
        assertEquals(87, confirmado.getPuntaje());
        assertEquals(23, confirmado.getTiempoJugadoSegundos());
        assertEquals(2, confirmado.getNivelActual());
    }

    private Usuario usuario(String nombre) {
        return usuarios.registrar(new Usuario(null, nombre,
                nombre + "-" + UUID.randomUUID() + "@campusucc.edu.co", Rol.ESTUDIANTE, "PruebaSegura123"));
    }

    private static GuardarProgresoOopRequest ejercicioWeb(int nivel, int puntos) {
        return new GuardarProgresoOopRequest(nivel, "python", true, puntos, 1, false);
    }

    private static ActualizarReporteIaRequest informe(int puntos, int restante) {
        var informe = new ActualizarReporteIaRequest();
        informe.setPuntajeBase(puntos); informe.setTiempoRestanteBase(restante);
        informe.setIntentosBase(1); informe.setCompletadoBase(true);
        informe.setDominio(73); informe.setResumen("Evidencia propia de esta cuenta");
        informe.setAspectosMejora(List.of());
        return informe;
    }

    private static void concurrentemente(List<Callable<Void>> operaciones) throws Exception {
        CountDownLatch comenzar = new CountDownLatch(1);
        try (var ejecutor = Executors.newFixedThreadPool(operaciones.size())) {
            var trabajos = operaciones.stream().map(operacion -> ejecutor.submit(() -> {
                assertTrue(comenzar.await(10, TimeUnit.SECONDS));
                return operacion.call();
            })).toList();
            comenzar.countDown();
            for (var trabajo : trabajos) trabajo.get(60, TimeUnit.SECONDS);
        }
    }
}
