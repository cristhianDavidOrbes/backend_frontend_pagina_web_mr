package com.algolab.backend_werb_mr.configuracion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.servicios.IUsuarioServicio;

@Configuration
public class DatosInicialesConfiguracion {
    @Bean
    public CommandLineRunner crearAdministradorInicial(
            IUsuarioServicio usuarioServicio,
            @Value("${app.admin.nombre:Cristhian David}") String nombre,
            @Value("${app.admin.correo:cristhian.david@admin.com}") String correo,
            @Value("${app.admin.contrasena:Cdol1122@}") String contrasena) {
        return args -> {
            String correoLimpio = correo.trim();

            if (usuarioServicio.existePorCorreo(correoLimpio)) {
                return;
            }

            Usuario administrador = new Usuario(
                    null,
                    nombre.trim(),
                    correoLimpio,
                    Rol.ADMINISTRADOR,
                    contrasena);

            usuarioServicio.registrar(administrador);
        };
    }
}
