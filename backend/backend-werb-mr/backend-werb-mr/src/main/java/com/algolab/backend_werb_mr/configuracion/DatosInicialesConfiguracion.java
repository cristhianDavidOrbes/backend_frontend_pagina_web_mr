package com.algolab.backend_werb_mr.configuracion;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.dtos.ConfiguracionTutorNivelDTO;
import com.algolab.backend_werb_mr.seguridad.CorreoInstitucional;
import com.algolab.backend_werb_mr.servicios.ConfiguracionTutorNivelServicio;
import com.algolab.backend_werb_mr.servicios.IUsuarioServicio;

@Configuration
public class DatosInicialesConfiguracion {
    @Bean
    public CommandLineRunner crearAdministradorInicial(
            IUsuarioServicio usuarioServicio,
            ConfiguracionTutorNivelServicio configuracionTutorServicio,
            @Value("${app.admin.nombre:Cristhian David}") String nombre,
            @Value("${app.admin.correo:administrador@campusucc.edu.co}") String correo,
            @Value("${app.admin.contrasena:}") String contrasena) {
        return args -> {
            String correoLimpio = CorreoInstitucional.normalizar(correo);

            if (!contrasena.isBlank() && CorreoInstitucional.esValido(correoLimpio) &&
                    !usuarioServicio.existePorCorreo(correoLimpio)) {
                Usuario administrador = new Usuario(
                        null,
                        nombre.trim(),
                        correoLimpio,
                        Rol.ADMINISTRADOR,
                        contrasena);

                usuarioServicio.registrar(administrador);
            }

            usuarioServicio.listar().stream()
                    .filter(usuario -> usuario.getNombreUsuario() == null || usuario.getNombreUsuario().isBlank())
                    .forEach(usuario -> {
                        usuario.setNombreUsuario(generarNombreUsuario(usuario.getCorreo(), usuarioServicio));
                        usuarioServicio.actualizar(usuario);
                    });

            configuracionesTutorIniciales().forEach(configuracionTutorServicio::crearSiNoExiste);
        };
    }

    private List<ConfiguracionTutorNivelDTO> configuracionesTutorIniciales() {
        return List.of(
                config(1, "Clases y objetos", "Identidad, estado e instanciación",
                        "Ayudar a reconocer una clase como plantilla y cada objeto como una instancia con estado propio.",
                        80, 300,
                        List.of("tema", "práctica de puerta"),
                        List.of("Identificar atributos de la puerta", "Abrir y cerrar mediante métodos", "Distinguir clase de instancia"),
                        List.of("Confundir atributo con método", "Modificar el estado sin usar una acción", "Tratar dos instancias como el mismo objeto"),
                        List.of("puerta", "diagrama UML", "controlador"),
                        List.of("Diferenciar plantilla e instancia", "Reconocer estado y comportamiento"),
                        List.of("Explica qué pertenece a la clase", "Predice qué cambia solo en una instancia"),
                        List.of("Señala primero el dato que describe al objeto", "Busca el verbo que representa la acción pública"),
                        "Crea mentalmente una clase Lámpara con color y estado, y explica qué cambia al encender una sola instancia."),
                config(2, "Atributos y métodos", "Estado, comportamiento y construcción de objetos",
                        "Guiar la construcción y manipulación de vehículos relacionando cada pieza y acción con atributos y métodos.",
                        240, 300,
                        List.of("tema", "práctica de vehículos"),
                        List.of("Seleccionar un vehículo", "Asignar un destino", "Reconocer atributos y métodos", "Lanzar y manipular con física"),
                        List.of("Confundir una propiedad con una acción", "Seleccionar lejos del vehículo", "No confirmar el destino"),
                        List.of("vehículo", "garaje", "punto de destino", "diagrama UML"),
                        List.of("Elegir el método correcto", "Relacionar parámetros con el resultado"),
                        List.of("Predice el cambio antes de ejecutar", "Explica qué dato conserva cada vehículo"),
                        List.of("Los sustantivos suelen representar datos", "Los verbos suelen representar métodos"),
                        "Describe una clase Bicicleta y el método avanzar(distancia), indicando qué atributo debería cambiar."),
                config(3, "Encapsulamiento", "Protección del estado interno",
                        "Enseñar a reparar el robot usando métodos públicos sin alterar directamente batería, temperatura o estado privados.",
                        100, 300,
                        List.of("tema", "diagnóstico", "reparación", "robot reparado"),
                        List.of("Apagar el robot", "Cargar mediante el puerto", "Enfriar con el ventilador", "Encender tras validar"),
                        List.of("Reemplazar directamente batería privada", "Reemplazar módulo privado", "Encender sin reparar", "Agotar el contador"),
                        List.of("robot", "batería", "módulo de temperatura", "cargador", "ventilador", "diagrama UML"),
                        List.of("Entender por qué un atributo es privado", "Usar métodos públicos en el orden correcto", "Separar acceso de modificación directa"),
                        List.of("Elige métodos públicos sin tocar datos internos", "Justifica la validación antes de encender"),
                        List.of("Primero coloca el robot en un estado seguro", "Busca una acción pública que proteja cada dato privado"),
                        "Propón métodos públicos para una CuentaBancaria que protejan un saldo privado e indica una validación necesaria."),
                config(4, "Abstracción", "Selección de información esencial según el contexto",
                        "Ayudar a clasificar atributos y métodos esenciales entre biblioteca y librería sin mezclar detalles irrelevantes.",
                        255, 300,
                        List.of("tema", "clasificación de libros", "defensa ante error"),
                        List.of("Leer la portada", "Clasificar en biblioteca o librería", "Reconocer elementos compartidos", "Atrapar un libro incorrecto"),
                        List.of("Asignar una característica al contexto equivocado", "No distinguir prestar de vender", "Ignorar el elemento compartido"),
                        List.of("libros", "biblioteca", "librería", "diagramas UML", "mesa"),
                        List.of("Elegir solo lo relevante", "Distinguir contextos con objetos similares", "Reconocer una abstracción compartida"),
                        List.of("Clasifica correctamente características exclusivas y comunes", "Explica qué detalle puede ocultarse"),
                        List.of("Pregunta qué problema resuelve cada edificio", "Título puede servir en ambos contextos; vender y prestar no"),
                        "Compara una canción en una tienda y en una aplicación: selecciona tres datos esenciales para cada contexto."),
                config(5, "Herencia", "Reutilización y especialización",
                        "Guiar la identificación de características heredadas y las especializaciones propias de una clase hija.",
                        300, 300,
                        List.of("tema", "práctica de jerarquía"),
                        List.of("Reconocer la clase base", "Asignar miembros heredados", "Separar miembros especializados"),
                        List.of("Duplicar un miembro heredado", "Ubicar una característica específica en la clase base", "Invertir padre e hijo"),
                        List.of("jerarquía", "clase base", "clases derivadas", "diagrama UML"),
                        List.of("Relación es-un", "Diferenciar herencia de composición", "Evitar duplicación"),
                        List.of("Explica qué comparten todas las clases hijas", "Justifica por qué una propiedad pertenece al padre"),
                        List.of("Sube a la clase base solo lo que todas las hijas comparten", "Comprueba la relación es-un"),
                        "Diseña la jerarquía Vehículo, Carro y Bicicleta con dos miembros heredados y uno específico por hija."),
                config(6, "Polimorfismo", "Un mensaje, múltiples comportamientos",
                        "Lograr que el estudiante prediga cómo distintas clases responden al mismo método según su implementación.",
                        300, 300,
                        List.of("tema", "práctica polimórfica"),
                        List.of("Enviar el mismo mensaje", "Observar respuestas distintas", "Relacionar cada respuesta con su implementación"),
                        List.of("Esperar el mismo resultado", "Confundir sobrecarga con sobrescritura", "Elegir por tipo concreto en vez del contrato"),
                        List.of("formas", "mensajes", "clase base", "implementaciones", "diagrama UML"),
                        List.of("Sobrescritura", "Despacho dinámico", "Contrato común"),
                        List.of("Predice cada respuesta antes de ejecutar", "Explica por qué el código llamador no necesita conocer el subtipo"),
                        List.of("Observa el mensaje común, luego la implementación concreta", "Busca un contrato que todas las clases puedan cumplir"),
                        "Imagina Animal.hablar() implementado por Perro y Gato; predice el resultado de una lista de animales sin preguntar su tipo."));
    }

    private ConfiguracionTutorNivelDTO config(int nivel, String nombre, String concepto, String objetivo,
            int puntajeMaximo, int tiempo, List<String> etapas, List<String> acciones, List<String> errores,
            List<String> objetos, List<String> dificultades, List<String> criterios, List<String> pistas,
            String proximoEjercicio) {
        ConfiguracionTutorNivelDTO dto = new ConfiguracionTutorNivelDTO();
        dto.setNivel(nivel);
        dto.setNombreNivel(nombre);
        dto.setConceptoCentral(concepto);
        dto.setObjetivoTutor(objetivo);
        dto.setPuntajeMaximo(puntajeMaximo);
        dto.setTiempoObjetivoSegundos(tiempo);
        dto.setEtapas(etapas);
        dto.setAccionesEsperadas(acciones);
        dto.setErroresObservables(errores);
        dto.setObjetosClave(objetos);
        dto.setDificultadesComunes(dificultades);
        dto.setCriteriosDominio(criterios);
        dto.setPistasTutor(pistas);
        dto.setProximoEjercicio(proximoEjercicio);
        dto.setPromptAdicional("");
        dto.setActivo(true);
        return dto;
    }

    private String generarNombreUsuario(String correo, IUsuarioServicio usuarioServicio) {
        String base = correo.split("@", 2)[0]
                .toLowerCase()
                .replaceAll("[^a-z0-9._-]", "");

        if (base.isBlank()) {
            base = "usuario";
        }

        String candidato = base;
        int contador = 1;

        while (usuarioServicio.existePorNombreUsuario(candidato)) {
            candidato = base + contador;
            contador++;
        }

        return candidato;
    }
}
