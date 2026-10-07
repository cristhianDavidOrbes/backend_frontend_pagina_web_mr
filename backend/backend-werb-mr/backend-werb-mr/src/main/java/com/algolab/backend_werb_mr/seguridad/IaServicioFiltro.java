package com.algolab.backend_werb_mr.seguridad;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Acceso técnico de lectura, sin cuenta humana, JWT ni permisos administrativos. */
@Component
public class IaServicioFiltro extends OncePerRequestFilter {
    public static final String HEADER = "X-AlgoLab-IA-Key";
    private final byte[] clave;

    public IaServicioFiltro(@Value("${ALGOLAB_IA_SERVICE_KEY:}") String claveConfigurada) {
        String valor = claveConfigurada == null ? "" : claveConfigurada.trim();
        // Una configuración vacía o insegura desactiva este mecanismo.
        clave = valor.length() >= 32 ? valor.getBytes(StandardCharsets.UTF_8) : new byte[0];
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        if (clave.length > 0 && SecurityContextHolder.getContext().getAuthentication() == null
                && permiteLectura(request)) {
            List<String> valores = Collections.list(request.getHeaders(HEADER));
            if (valores.size() == 1 && valores.get(0).length() <= 512
                    && MessageDigest.isEqual(clave, valores.get(0).getBytes(StandardCharsets.UTF_8))) {
                SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken("algolab-servicio-ia", null,
                                List.of(new SimpleGrantedAuthority("ROLE_SERVICIO_IA"))));
            }
        }
        filterChain.doFilter(request, response);
    }

    private static boolean permiteLectura(HttpServletRequest request) {
        if (!"GET".equals(request.getMethod())) {
            return false;
        }
        String ruta = request.getRequestURI().substring(request.getContextPath().length());
        return "/api/niveles".equals(ruta)
                || ruta.matches("/api/configuracion-tutor/niveles/[1-9][0-9]{0,8}");
    }
}
