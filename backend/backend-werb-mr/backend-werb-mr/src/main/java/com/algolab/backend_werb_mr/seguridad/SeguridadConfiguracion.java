package com.algolab.backend_werb_mr.seguridad;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SeguridadConfiguracion {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtFiltro jwtFiltro) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .oauth2ResourceServer(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex.authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"mensaje\":\"Sesión expirada o no autorizada. Por favor, inicia sesión nuevamente.\"}");
                }))
                .authorizeHttpRequests(auth -> auth
                        // Rutas públicas de autenticación y registro
                        .requestMatchers("/api/usuarios/registrar").permitAll()
                        .requestMatchers("/api/usuarios/iniciar-sesion").permitAll()
                        .requestMatchers("/api/usuarios/segundo-factor/**").permitAll()
                        .requestMatchers("/api/auth/2fa/iniciar-sesion").permitAll()
                        .requestMatchers("/api/auth/2fa/metodos").permitAll()
                        .requestMatchers("/api/auth/2fa/email/**").permitAll()
                        .requestMatchers("/api/auth/2fa/totp/verificar").permitAll()
                        .requestMatchers("/api/auth/2fa/passkey/auth/**").permitAll()
                        .requestMatchers("/api/auth/2fa/recuperacion/verificar").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/ranking", "/api/ranking/**").permitAll()
                        // Rutas protegidas
                        .requestMatchers(HttpMethod.GET, "/api/niveles", "/api/niveles/**").authenticated()
                        .requestMatchers("/api/niveles/**").hasAnyRole("DOCENTE", "ADMINISTRADOR")
                        .requestMatchers("/api/descripciones-niveles/**").hasAnyRole("DOCENTE", "ADMINISTRADOR")
                        .anyRequest().authenticated())
                .addFilterBefore(jwtFiltro, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
