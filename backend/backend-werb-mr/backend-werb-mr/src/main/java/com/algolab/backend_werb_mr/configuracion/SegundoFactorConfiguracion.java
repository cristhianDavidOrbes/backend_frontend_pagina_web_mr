package com.algolab.backend_werb_mr.configuracion;

import java.security.SecureRandom;
import java.time.Clock;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(SegundoFactorPropiedades.class)
public class SegundoFactorConfiguracion {
    @Bean
    public Clock relojSegundoFactor() {
        return Clock.systemUTC();
    }

    @Bean
    public SecureRandom generadorSeguroSegundoFactor() {
        return new SecureRandom();
    }
}
