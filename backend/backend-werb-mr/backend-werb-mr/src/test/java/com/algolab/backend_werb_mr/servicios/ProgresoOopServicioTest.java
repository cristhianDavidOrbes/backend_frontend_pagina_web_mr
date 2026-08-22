package com.algolab.backend_werb_mr.servicios;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.algolab.backend_werb_mr.dtos.GuardarProgresoOopRequest;
import com.algolab.backend_werb_mr.dtos.ProgresoOopUsuarioDTO;
import com.algolab.backend_werb_mr.modelos.ProgresoOop;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.repositorio.IProgresoNivelRepositorio;
import com.algolab.backend_werb_mr.repositorio.IProgresoOopRepositorio;

class ProgresoOopServicioTest {
    @Test
    void resincronizarElMismoResultadoNoAumentaIntentos() {
        IProgresoOopRepositorio repositorio = mock(IProgresoOopRepositorio.class);
        IProgresoNivelRepositorio repositorioPrincipal = mock(IProgresoNivelRepositorio.class);
        IUsuarioServicio usuarios = mock(IUsuarioServicio.class);
        Usuario usuario = new Usuario(5L, "Ada", "ada@test.com", Rol.ESTUDIANTE, "123456");
        List<ProgresoOop> guardados = new ArrayList<>();

        when(repositorio.findByUsuarioAndNivel(usuario, 1)).thenAnswer(invocacion -> guardados.stream().findFirst());
        when(repositorio.findByUsuarioOrderByNivelAsc(usuario)).thenAnswer(invocacion -> List.copyOf(guardados));
        when(repositorio.save(any(ProgresoOop.class))).thenAnswer(invocacion -> {
            ProgresoOop progreso = invocacion.getArgument(0);
            if (!guardados.contains(progreso)) guardados.add(progreso);
            return progreso;
        });
        when(repositorioPrincipal.findByUsuarioOrderByNivelAsc(usuario)).thenReturn(List.of());
        when(usuarios.actualizar(usuario)).thenReturn(usuario);

        ProgresoOopServicio servicio = new ProgresoOopServicio(repositorio, repositorioPrincipal, usuarios);
        GuardarProgresoOopRequest request = new GuardarProgresoOopRequest(1, "python", true, 10, 1, false);
        servicio.guardarProgreso(usuario, request);
        ProgresoOopUsuarioDTO repetido = servicio.guardarProgreso(usuario, request);

        assertEquals(1, repetido.getNiveles().get(0).getIntentos());
    }

    @Test
    void rechazaPuntajeFueraDelCatalogo() {
        IProgresoOopRepositorio repositorio = mock(IProgresoOopRepositorio.class);
        IProgresoNivelRepositorio repositorioPrincipal = mock(IProgresoNivelRepositorio.class);
        IUsuarioServicio usuarios = mock(IUsuarioServicio.class);
        Usuario usuario = new Usuario(6L, "Grace", "grace@test.com", Rol.ESTUDIANTE, "123456");
        ProgresoOopServicio servicio = new ProgresoOopServicio(repositorio, repositorioPrincipal, usuarios);

        GuardarProgresoOopRequest request = new GuardarProgresoOopRequest(1, "python", true, 9999, 1, false);

        assertThrows(IllegalArgumentException.class, () -> servicio.guardarProgreso(usuario, request));
    }

    @Test
    void permiteAvanzarConSolucionCompletaSinOtorgarPuntos() {
        IProgresoOopRepositorio repositorio = mock(IProgresoOopRepositorio.class);
        IProgresoNivelRepositorio repositorioPrincipal = mock(IProgresoNivelRepositorio.class);
        IUsuarioServicio usuarios = mock(IUsuarioServicio.class);
        Usuario usuario = new Usuario(8L, "Katherine", "katherine@test.com", Rol.ESTUDIANTE, "123456");
        List<ProgresoOop> guardados = new ArrayList<>();
        when(repositorio.findByUsuarioAndNivel(usuario, 1)).thenReturn(java.util.Optional.empty());
        when(repositorio.findByUsuarioOrderByNivelAsc(usuario)).thenAnswer(invocacion -> List.copyOf(guardados));
        when(repositorio.save(any(ProgresoOop.class))).thenAnswer(invocacion -> {
            ProgresoOop progreso = invocacion.getArgument(0);
            guardados.add(progreso);
            return progreso;
        });
        when(repositorioPrincipal.findByUsuarioOrderByNivelAsc(usuario)).thenReturn(List.of());
        when(usuarios.actualizar(usuario)).thenReturn(usuario);
        ProgresoOopServicio servicio = new ProgresoOopServicio(repositorio, repositorioPrincipal, usuarios);

        ProgresoOopUsuarioDTO respuesta = servicio.guardarProgreso(
                usuario, new GuardarProgresoOopRequest(1, "python", true, 0, 1, false));

        assertEquals(true, respuesta.getNiveles().get(0).getCompletado());
        assertEquals(0, respuesta.getNiveles().get(0).getPuntaje());
    }

    @Test
    void rechazaSaltarElNivelAnterior() {
        IProgresoOopRepositorio repositorio = mock(IProgresoOopRepositorio.class);
        IProgresoNivelRepositorio repositorioPrincipal = mock(IProgresoNivelRepositorio.class);
        IUsuarioServicio usuarios = mock(IUsuarioServicio.class);
        Usuario usuario = new Usuario(7L, "Linus", "linus@test.com", Rol.ESTUDIANTE, "123456");
        when(repositorio.findByUsuarioAndNivel(usuario, 1)).thenReturn(java.util.Optional.empty());
        ProgresoOopServicio servicio = new ProgresoOopServicio(repositorio, repositorioPrincipal, usuarios);

        GuardarProgresoOopRequest request = new GuardarProgresoOopRequest(2, "java", true, 15, 1, false);

        assertThrows(IllegalArgumentException.class, () -> servicio.guardarProgreso(usuario, request));
    }
}
