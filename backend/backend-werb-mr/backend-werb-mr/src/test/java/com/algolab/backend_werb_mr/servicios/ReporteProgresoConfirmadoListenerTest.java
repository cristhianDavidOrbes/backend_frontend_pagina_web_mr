package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;

class ReporteProgresoConfirmadoListenerTest {
    @Test
    void unInformeLentoNoMantieneBloqueadaLaPeticionDelProgresoConfirmado() throws Exception {
        ReporteNivelServicio reportes = mock(ReporteNivelServicio.class);
        CountDownLatch comenzo = new CountDownLatch(1);
        CountDownLatch continuar = new CountDownLatch(1);
        CountDownLatch termino = new CountDownLatch(1);
        Thread peticion = Thread.currentThread();
        when(reportes.sincronizarConfirmado(9L, 1)).thenAnswer(invocacion -> {
            assertNotSame(peticion, Thread.currentThread());
            comenzo.countDown();
            assertTrue(continuar.await(3, TimeUnit.SECONDS));
            termino.countDown();
            return null;
        });
        try (var executor = Executors.newSingleThreadExecutor()) {
            var listener = new ReporteProgresoConfirmadoListener(reportes, executor);
            try {
                listener.prepararReporte(new ProgresoConfirmado(9L, 1));
                assertTrue(comenzo.await(2, TimeUnit.SECONDS));
                assertEquals(1, termino.getCount());
            } finally {
                continuar.countDown();
            }
            assertTrue(termino.await(2, TimeUnit.SECONDS));
        }
    }

    @Test
    void unaColaLlenaDejaElInformePendienteSinRomperElCommitDeLaPractica() {
        ReporteNivelServicio reportes = mock(ReporteNivelServicio.class);
        var listener = new ReporteProgresoConfirmadoListener(reportes,
                tarea -> { throw new RejectedExecutionException("Cola de prueba llena"); });
        assertDoesNotThrow(() -> listener.prepararReporte(new ProgresoConfirmado(9L, 1)));
        verifyNoInteractions(reportes);
    }
}
