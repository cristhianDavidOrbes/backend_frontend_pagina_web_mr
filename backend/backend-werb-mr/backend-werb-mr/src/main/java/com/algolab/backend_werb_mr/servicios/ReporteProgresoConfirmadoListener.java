package com.algolab.backend_werb_mr.servicios;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class ReporteProgresoConfirmadoListener {
    private static final Logger log = LoggerFactory.getLogger(ReporteProgresoConfirmadoListener.class);
    private final ReporteNivelServicio reportes;

    public ReporteProgresoConfirmadoListener(ReporteNivelServicio reportes) {
        this.reportes = reportes;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void prepararReporte(ProgresoConfirmado evento) {
        try {
            reportes.sincronizarConfirmado(evento.usuarioId(), evento.nivel());
        } catch (RuntimeException error) {
            log.error("Progreso confirmado para usuario {} nivel {}; informe pendiente de reintento",
                    evento.usuarioId(), evento.nivel(), error);
        }
    }
}
