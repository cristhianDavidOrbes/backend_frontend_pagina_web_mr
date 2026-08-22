package com.algolab.backend_werb_mr.seguridad;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.IUsuarioRepositorio;

import jakarta.servlet.FilterChain;

class JwtFiltroTest {
    private JwtServicio jwtServicio;
    private IUsuarioRepositorio usuarioRepositorio;
    private JwtFiltro filtro;

    @BeforeEach
    void preparar() {
        SecurityContextHolder.clearContext();
        jwtServicio = mock(JwtServicio.class);
        usuarioRepositorio = mock(IUsuarioRepositorio.class);
        filtro = new JwtFiltro(jwtServicio, usuarioRepositorio);
    }

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void usaElRolActualDeLaBaseDeDatosYNoElRolAntiguoDelToken() throws Exception {
        String token = "token-valido";
        Usuario usuario = new Usuario(4L, "Ada", "ada@campusucc.edu.co", Rol.ESTUDIANTE, "hash");
        when(jwtServicio.tokenValido(token)).thenReturn(true);
        when(jwtServicio.obtenerCorreo(token)).thenReturn(usuario.getCorreo());
        when(usuarioRepositorio.buscarPorCorreo(usuario.getCorreo())).thenReturn(Optional.of(usuario));

        ejecutar(token);

        assertEquals("ada@campusucc.edu.co",
                SecurityContextHolder.getContext().getAuthentication().getName());
        assertEquals("ROLE_ESTUDIANTE",
                SecurityContextHolder.getContext().getAuthentication().getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void unaCuentaEliminadaNoConservaAccesoConUnTokenSinExpirar() throws Exception {
        String token = "token-valido";
        when(jwtServicio.tokenValido(token)).thenReturn(true);
        when(jwtServicio.obtenerCorreo(token)).thenReturn("eliminado@campusucc.edu.co");
        when(usuarioRepositorio.buscarPorCorreo("eliminado@campusucc.edu.co")).thenReturn(Optional.empty());

        ejecutar(token);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    private void ejecutar(String token) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        filtro.doFilter(request, response, chain);
    }
}
