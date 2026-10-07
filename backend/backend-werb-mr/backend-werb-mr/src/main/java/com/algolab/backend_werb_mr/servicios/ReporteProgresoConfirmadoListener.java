package com.algolab.backend_werb_mr.servicios;

import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class ReporteProgresoConfirmadoListener {
    private static final Logger log = LoggerFactory.getLogger(ReporteProgresoConfirmadoListener.class);
    private final ReporteNivelServicio reportes;
    private final Executor executor;

    public ReporteProgresoConfirmadoListener(ReporteNivelServicio reportes,
            @Qualifier("reportesConfirmadosExecutor") Executor executor) {
        this.reportes = reportes;
        this.executor = executor;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void prepararReporte(ProgresoConfirmado evento) {
        try {
            executor.execute(() -> sincronizarReporte(evento));
        } catch (RejectedExecutionException error) {
            // El progreso es la cola durable. GET/PUT reparan el informe base
            // desde él incluso si un reinicio o saturación descarta esta tarea.
            log.warn("Progreso confirmado para usuario {} nivel {}; cola de informes ocupada, informe pendiente",
                    evento.usuarioId(), evento.nivel());
        }
    }

    private void sincronizarReporte(ProgresoConfirmado evento) {
        try {
            reportes.sincronizarConfirmado(evento.usuarioId(), evento.nivel());
        } catch (RuntimeException error) {
            log.error("Progreso confirmado para usuario {} nivel {}; informe pendiente de reintento",
                    evento.usuarioId(), evento.nivel(), error);
        }
    }
}
