package com.algolab.backend_werb_mr.servicios;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.algolab.backend_werb_mr.dtos.ConfiguracionTutorNivelDTO;
import com.algolab.backend_werb_mr.modelos.ConfiguracionTutorNivel;
import com.algolab.backend_werb_mr.repositorio.IConfiguracionTutorNivelRepositorio;

@Service
public class ConfiguracionTutorNivelServicio {
    private final IConfiguracionTutorNivelRepositorio repositorio;

    public ConfiguracionTutorNivelServicio(IConfiguracionTutorNivelRepositorio repositorio) {
        this.repositorio = repositorio;
    }

    @Transactional(readOnly = true)
    public List<ConfiguracionTutorNivelDTO> listar() {
        return repositorio.findAllByOrderByNivelAsc().stream().map(ConfiguracionTutorNivelDTO::desdeModelo).toList();
    }

    @Transactional(readOnly = true)
    public ConfiguracionTutorNivelDTO buscar(int nivel) {
        return repositorio.findByNivel(nivel).map(ConfiguracionTutorNivelDTO::desdeModelo)
                .orElseThrow(() -> new IllegalArgumentException("No existe configuración para el nivel " + nivel));
    }

    @Transactional(readOnly = true)
    public ConfiguracionTutorNivel buscarModelo(int nivel) {
        return repositorio.findByNivel(nivel).orElse(null);
    }

    @Transactional
    public ConfiguracionTutorNivelDTO guardar(int nivel, ConfiguracionTutorNivelDTO dto) {
        validar(nivel, dto);
        ConfiguracionTutorNivel modelo = repositorio.findByNivel(nivel).orElseGet(ConfiguracionTutorNivel::new);
        dto.setNivel(nivel);
        dto.aplicarA(modelo);
        return ConfiguracionTutorNivelDTO.desdeModelo(repositorio.save(modelo));
    }

    @Transactional
    public void crearSiNoExiste(ConfiguracionTutorNivelDTO dto) {
        if (dto != null && dto.getNivel() != null && repositorio.findByNivel(dto.getNivel()).isEmpty()) {
            guardar(dto.getNivel(), dto);
        }
    }

    private static void validar(int nivel, ConfiguracionTutorNivelDTO dto) {
        if (nivel < 1 || nivel > 20) throw new IllegalArgumentException("El nivel debe estar entre 1 y 20");
        if (dto == null || vacio(dto.getNombreNivel()) || vacio(dto.getConceptoCentral())
                || vacio(dto.getObjetivoTutor())) {
            throw new IllegalArgumentException("Nombre, concepto central y objetivo del tutor son obligatorios");
        }
        if (dto.getPuntajeMaximo() == null || dto.getPuntajeMaximo() < 1) {
            throw new IllegalArgumentException("El puntaje máximo debe ser mayor que cero");
        }
        if (dto.getTiempoObjetivoSegundos() == null || dto.getTiempoObjetivoSegundos() < 1) {
            throw new IllegalArgumentException("El tiempo objetivo debe ser mayor que cero");
        }
    }

    private static boolean vacio(String valor) { return valor == null || valor.isBlank(); }
}
