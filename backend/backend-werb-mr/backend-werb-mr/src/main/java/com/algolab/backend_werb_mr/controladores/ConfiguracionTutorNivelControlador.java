package com.algolab.backend_werb_mr.controladores;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.algolab.backend_werb_mr.dtos.ConfiguracionTutorNivelDTO;
import com.algolab.backend_werb_mr.servicios.ConfiguracionTutorNivelServicio;
import com.algolab.backend_werb_mr.servicios.PoliticaTutorIa;

@RestController
@RequestMapping("/api/configuracion-tutor")
public class ConfiguracionTutorNivelControlador {
    private final ConfiguracionTutorNivelServicio servicio;

    public ConfiguracionTutorNivelControlador(ConfiguracionTutorNivelServicio servicio) {
        this.servicio = servicio;
    }

    @GetMapping("/reglas-sistema")
    public ResponseEntity<Map<String, Object>> reglasSistema() {
        return ResponseEntity.ok(PoliticaTutorIa.descripcionPublica());
    }

    @GetMapping("/niveles")
    public ResponseEntity<List<ConfiguracionTutorNivelDTO>> listar() {
        return ResponseEntity.ok(servicio.listar());
    }

    @GetMapping("/niveles/{nivel}")
    public ResponseEntity<ConfiguracionTutorNivelDTO> buscar(@PathVariable int nivel) {
        return ResponseEntity.ok(servicio.buscar(nivel));
    }

    @PutMapping("/niveles/{nivel}")
    public ResponseEntity<ConfiguracionTutorNivelDTO> guardar(@PathVariable int nivel,
            @RequestBody ConfiguracionTutorNivelDTO request) {
        return ResponseEntity.ok(servicio.guardar(nivel, request));
    }
}
