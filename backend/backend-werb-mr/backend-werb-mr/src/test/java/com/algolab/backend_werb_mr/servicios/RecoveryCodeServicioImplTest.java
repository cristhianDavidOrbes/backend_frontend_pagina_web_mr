package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.algolab.backend_werb_mr.modelos.CodigoRecuperacion;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.ICodigoRecuperacionRepositorio;

class RecoveryCodeServicioImplTest {

    private ICodigoRecuperacionRepositorio repo;
    private PasswordEncoder passwordEncoder;
    private RecoveryCodeServicioImpl service;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        repo = mock(ICodigoRecuperacionRepositorio.class);
        passwordEncoder = new BCryptPasswordEncoder();
        service = new RecoveryCodeServicioImpl(repo, passwordEncoder);
        usuario = new Usuario(1L, "Ada Lovelace", "ada@campusucc.edu.co", Rol.ESTUDIANTE, "hash");
    }

    @Test
    void generaCodigosFormateadosYGuardaHashes() {
        List<String> codigos = service.generarYGuardarCodigos(usuario, 8);
        assertNotNull(codigos);
        assertEquals(8, codigos.size());
        for (String c : codigos) {
            assertTrue(c.matches("[A-Z0-9]{4}-[A-Z0-9]{4}"));
        }
        verify(repo).eliminarPorUsuarioId(usuario.getId());
    }

    @Test
    void validaYConsumeCodigoCorrectamente() {
        String plano = "AB39-KP27";
        String hash = passwordEncoder.encode("AB39KP27");
        CodigoRecuperacion entidad = new CodigoRecuperacion(usuario, hash);

        List<CodigoRecuperacion> lista = new ArrayList<>();
        lista.add(entidad);
        when(repo.findByUsuarioIdAndUsadoFalse(usuario.getId())).thenReturn(lista);

        boolean valido = service.validarYConsumirCodigo(usuario, "ab39-kp27");
        assertTrue(valido);
        assertTrue(entidad.isUsado());
        assertNotNull(entidad.getUsadoEn());
        verify(repo).save(entidad);
    }

    @Test
    void rechazaCodigoInvalido() {
        when(repo.findByUsuarioIdAndUsadoFalse(usuario.getId())).thenReturn(List.of());
        boolean valido = service.validarYConsumirCodigo(usuario, "INVALIDO");
        assertFalse(valido);
    }
}
