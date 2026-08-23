package com.algolab.backend_werb_mr.seguridad;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.IUsuarioRepositorio;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtFiltro extends OncePerRequestFilter {
    private static final String BEARER = "Bearer ";

    private final JwtServicio jwtServicio;
    private final IUsuarioRepositorio usuarioRepositorio;

    public JwtFiltro(JwtServicio jwtServicio, IUsuarioRepositorio usuarioRepositorio) {
        this.jwtServicio = jwtServicio;
        this.usuarioRepositorio = usuarioRepositorio;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith(BEARER)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(BEARER.length());

        if (jwtServicio.tokenValido(token) && !jwtServicio.esTokenTemporal2FA(token) && SecurityContextHolder.getContext().getAuthentication() == null) {
            String correo = jwtServicio.obtenerCorreo(token);
            Usuario usuarioActual = correo == null
                    ? null
                    : usuarioRepositorio.buscarPorCorreo(correo).orElse(null);

            // La autoridad siempre se toma de la base de datos. De este modo, una
            // cuenta eliminada o cuyo rol fue reducido pierde acceso inmediatamente,
            // aunque conserve un JWT que todavía no haya expirado.
            if (usuarioActual != null && usuarioActual.getRol() != null) {
                UsernamePasswordAuthenticationToken autenticacion = new UsernamePasswordAuthenticationToken(
                        usuarioActual.getCorreo(),
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + usuarioActual.getRol().name())));

                autenticacion.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(autenticacion);
            }
        }

        filterChain.doFilter(request, response);
    }
}
