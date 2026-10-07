package com.algolab.backend_werb_mr.configuracion;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class ReportesAsincronosConfiguracion {
    @Bean("reportesConfirmadosExecutor")
    public ThreadPoolTaskExecutor reportesConfirmadosExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(256);
        executor.setThreadNamePrefix("reporte-confirmado-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(15);
        // No usar CallerRunsPolicy: volvería a preparar el informe en la petición
        // y mantendría ocupada la conexión del progreso ya confirmado.
        return executor;
    }
}
