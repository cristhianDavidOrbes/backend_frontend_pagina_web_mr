package com.algolab.backend_werb_mr.controladores;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.algolab.backend_werb_mr.dtos.ActualizarProgresoUsuarioRequest;
import com.algolab.backend_werb_mr.dtos.ActualizarPerfilRequest;
import com.algolab.backend_werb_mr.dtos.ActualizarUsuarioRequest;
import com.algolab.backend_werb_mr.dtos.AuthRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.DesafioSegundoFactorRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.LoginRequest;
import com.algolab.backend_werb_mr.dtos.ReenviarSegundoFactorRequest;
import com.algolab.backend_werb_mr.dtos.RegistroUsuarioRequest;
import com.algolab.backend_werb_mr.dtos.UsuarioSesionDTO;
import com.algolab.backend_werb_mr.dtos.UsuarioRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.VerificarSegundoFactorRequest;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.CanalSegundoFactor;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.seguridad.CorreoInstitucional;
import com.algolab.backend_werb_mr.seguridad.NumeroCelular;
import com.algolab.backend_werb_mr.servicios.AutenticacionSegundoFactorResultado;
import com.algolab.backend_werb_mr.servicios.ISegundoFactorServicio;
import com.algolab.backend_werb_mr.servicios.IUsuarioServicio;
import com.algolab.backend_werb_mr.servicios.SegundoFactorException;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioControlador {
    private static final Logger logger = LoggerFactory.getLogger(UsuarioControlador.class);
    private static final String VERSION_CONSENTIMIENTO_ACTUAL = "2026-08-26";

    private final IUsuarioServicio usuarioServicio;
    private final ISegundoFactorServicio segundoFactorServicio;

    public UsuarioControlador(IUsuarioServicio usuarioServicio, ISegundoFactorServicio segundoFactorServicio) {
        this.usuarioServicio = usuarioServicio;
        this.segundoFactorServicio = segundoFactorServicio;
    }

    @PostMapping(value = "/iniciar-sesion", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> iniciarSesion(@RequestBody LoginRequest request) {
        if (request == null) {
            return errorSegundoFactor(HttpStatus.BAD_REQUEST, "Debe enviar correo institucional y contrasena");
        }

        String correo = CorreoInstitucional.normalizar(request.getCorreo());
        String contrasena = request.getContrasena();

        if (correo == null || contrasena == null || contrasena.isBlank()) {
            return errorSegundoFactor(HttpStatus.BAD_REQUEST, "Debe enviar correo institucional y contrasena");
        }

        if (!CorreoInstitucional.esValido(correo)) {
            return errorSegundoFactor(HttpStatus.BAD_REQUEST,
                    "Solo se permite el correo institucional " + CorreoInstitucional.DOMINIO);
        }

        Usuario usuarioEncontrado = usuarioServicio.iniciarSesion(correo, contrasena).orElse(null);

        if (usuarioEncontrado == null) {
            // Una respuesta unica evita revelar si la cuenta institucional existe.
            return errorSegundoFactor(HttpStatus.UNAUTHORIZED, "Correo o contrasena incorrectos");
        }

        CanalSegundoFactor canal = obtenerCanalSegundoFactor(request.getCanal());
        if (canal == null) {
            return errorSegundoFactor(HttpStatus.BAD_REQUEST, "Canal invalido. Use CORREO o SMS");
        }

        try {
            return ResponseEntity.accepted().body(segundoFactorServicio.crearDesafio(usuarioEncontrado, canal));
        } catch (SegundoFactorException error) {
            return errorSegundoFactor(error.getEstado(), error.getMessage());
        }
    }

    @PostMapping(value = "/segundo-factor/verificar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AuthRespuestaDTO> verificarSegundoFactor(@RequestBody VerificarSegundoFactorRequest request) {
        if (request == null) {
            return ResponseEntity.badRequest().body(new AuthRespuestaDTO(
                    false, "Debe enviar desafioId y codigo", null, null));
        }

        try {
            AutenticacionSegundoFactorResultado resultado = segundoFactorServicio.verificar(
                    request.getDesafioId(), request.getCodigo());
            return ResponseEntity.ok(new AuthRespuestaDTO(
                    true,
                    "Inicio de sesion verificado correctamente",
                    resultado.token(),
                    UsuarioRespuestaDTO.desdeUsuario(resultado.usuario())));
        } catch (SegundoFactorException error) {
            return ResponseEntity.status(error.getEstado()).body(new AuthRespuestaDTO(
                    false, error.getMessage(), null, null));
        }
    }

    @PostMapping(value = "/segundo-factor/reenviar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<DesafioSegundoFactorRespuestaDTO> reenviarSegundoFactor(
            @RequestBody ReenviarSegundoFactorRequest request) {
        if (request == null) {
            return errorSegundoFactor(HttpStatus.BAD_REQUEST, "Debe enviar desafioId");
        }

        try {
            return ResponseEntity.ok(segundoFactorServicio.reenviar(request.getDesafioId()));
        } catch (SegundoFactorException error) {
            return errorSegundoFactor(error.getEstado(), error.getMessage());
        }
    }

    @PostMapping(value = "/registrar", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AuthRespuestaDTO> registrarUsuario(@RequestBody RegistroUsuarioRequest request) {
        return registrarUsuarioInterno(request, false);
    }

    private ResponseEntity<AuthRespuestaDTO> registrarUsuarioInterno(RegistroUsuarioRequest request,
            boolean permitirRolesPrivilegiados) {
        if (request == null) {
            return ResponseEntity.badRequest().body(new AuthRespuestaDTO(
                    false,
                    "Debe enviar nombre, correo, rol y contrasena",
                    null,
                    null));
        }

        String nombre = limpiar(request.getNombre());
        String correo = CorreoInstitucional.normalizar(request.getCorreo());
        String rolTexto = limpiar(request.getRol());
        String contrasena = request.getContrasena();

        if (nombre == null || correo == null || rolTexto == null || contrasena == null || contrasena.isBlank()) {
            return ResponseEntity.badRequest().body(new AuthRespuestaDTO(
                    false,
                    "Debe enviar nombre, correo, rol y contrasena",
                    null,
                    null));
        }

        if (!CorreoInstitucional.esValido(correo)) {
            return ResponseEntity.badRequest().body(new AuthRespuestaDTO(
                    false,
                    "Solo se permiten cuentas con correo institucional " + CorreoInstitucional.DOMINIO,
                    null,
                    null));
        }

        String celular = NumeroCelular.normalizar(request.getCelular());
        if (celular != null && !NumeroCelular.esValido(celular)) {
            return ResponseEntity.badRequest().body(new AuthRespuestaDTO(
                    false,
                    "El celular debe usar formato internacional E.164, por ejemplo +573001234567",
                    null,
                    null));
        }

        Rol rol;
        try {
            rol = Rol.valueOf(rolTexto.toUpperCase());
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(new AuthRespuestaDTO(
                    false,
                    "Rol invalido. Use ESTUDIANTE, DOCENTE o ADMINISTRADOR",
                    null,
                    null));
        }

        if (!permitirRolesPrivilegiados && rol != Rol.ESTUDIANTE) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new AuthRespuestaDTO(
                    false,
                    "El registro publico solo permite crear usuarios ESTUDIANTE",
                    null,
                    null));
        }

        if (!permitirRolesPrivilegiados) {
            if (!Boolean.TRUE.equals(request.getAceptaTerminos())
                    || !Boolean.TRUE.equals(request.getAceptaTratamientoDatos())) {
                return ResponseEntity.badRequest().body(new AuthRespuestaDTO(
                        false,
                        "Debes aceptar los Terminos y Condiciones y el Tratamiento de Datos Personales",
                        null,
                        null));
            }

            if (!VERSION_CONSENTIMIENTO_ACTUAL.equals(limpiar(request.getVersionConsentimiento()))) {
                return ResponseEntity.badRequest().body(new AuthRespuestaDTO(
                        false,
                        "La version de los documentos legales no esta vigente. Actualiza la pagina e intenta de nuevo",
                        null,
                        null));
            }
        }

        if (usuarioServicio.existePorCorreo(correo)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new AuthRespuestaDTO(
                    false,
                    "El usuario ya existe en la base de datos",
                    null,
                    null));
        }

        Usuario usuario = new Usuario(null, nombre, correo, rol, contrasena);
        usuario.setCelular(celular);
        if (!permitirRolesPrivilegiados) {
            LocalDateTime aceptadoEn = LocalDateTime.now();
            usuario.setTerminosAceptadosEn(aceptadoEn);
            usuario.setTratamientoDatosAceptadoEn(aceptadoEn);
            usuario.setVersionConsentimiento(VERSION_CONSENTIMIENTO_ACTUAL);
        }
        Usuario usuarioGuardado = usuarioServicio.registrar(usuario);

        return ResponseEntity.status(HttpStatus.CREATED).body(new AuthRespuestaDTO(
                true,
                "Usuario registrado correctamente",
                null,
                UsuarioRespuestaDTO.desdeUsuario(usuarioGuardado)));
    }

    @GetMapping
    public ResponseEntity<?> listarUsuarios(Authentication authentication) {
        if (!tieneRol(authentication, Rol.DOCENTE) && !tieneRol(authentication, Rol.ADMINISTRADOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "mensaje", "Solo el docente y el administrador pueden listar usuarios"));
        }

        List<UsuarioRespuestaDTO> usuarios = usuarioServicio.listar().stream()
                .map(UsuarioRespuestaDTO::desdeUsuario)
                .toList();

        return ResponseEntity.ok(usuarios);
    }

    @GetMapping("/me")
    public ResponseEntity<?> obtenerUsuarioAutenticado(Authentication authentication) {
        if (authentication == null) {
            logger.warn("No se encontro usuario autenticado al consultar /api/usuarios/me");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "mensaje", "No hay usuario autenticado"));
        }

        Usuario usuario = usuarioServicio.buscarPorCorreo(authentication.getName()).orElse(null);

        if (usuario == null) {
            logger.warn("No se encontro usuario autenticado con correo {}", authentication.getName());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "mensaje", "Usuario autenticado no encontrado"));
        }

        return ResponseEntity.ok(UsuarioSesionDTO.desdeUsuario(usuario));
    }

    @GetMapping("/me/perfil")
    public ResponseEntity<?> obtenerPerfilCompleto(Authentication authentication) {
        Usuario usuario = usuarioAutenticado(authentication);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "mensaje", "Usuario autenticado no encontrado"));
        }
        return ResponseEntity.ok(UsuarioSesionDTO.desdeUsuario(usuario));
    }

    @PatchMapping("/me/tutorial-completado")
    public ResponseEntity<?> marcarTutorialCompletado(Authentication authentication) {
        Usuario usuario = usuarioAutenticado(authentication);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "mensaje", "Usuario autenticado no encontrado"));
        }

        // Operación intencionalmente idempotente: repetirla desde otra gafa o
        // tras una reconexión nunca revierte el estado ni crea efectos laterales.
        if (!usuario.isTutorialCompletado()) {
            usuario.setTutorialCompletado(true);
            usuario = usuarioServicio.actualizar(usuario);
        }

        return ResponseEntity.ok(UsuarioSesionDTO.desdeUsuario(usuario));
    }

    @PutMapping(value = "/me/perfil", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> actualizarPerfil(@RequestBody ActualizarPerfilRequest request,
            Authentication authentication) {
        Usuario usuario = usuarioAutenticado(authentication);
        if (usuario == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "mensaje", "Usuario autenticado no encontrado"));
        }
        if (request == null || limpiar(request.getNombre()) == null) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "El nombre es obligatorio"));
        }

        String nombreUsuario = limpiar(request.getNombreUsuario());
        if (nombreUsuario != null) {
            if (!nombreUsuario.matches("[A-Za-z0-9._-]{3,30}")) {
                return ResponseEntity.badRequest().body(Map.of(
                        "mensaje", "El nombre de usuario debe tener entre 3 y 30 caracteres sin espacios"));
            }
            Usuario existente = usuarioServicio.listar().stream()
                    .filter(item -> nombreUsuario.equalsIgnoreCase(item.getNombreUsuario()))
                    .findFirst().orElse(null);
            if (existente != null && !existente.getId().equals(usuario.getId())) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "mensaje", "El nombre de usuario ya está en uso"));
            }
        }

        String avatar = limpiar(request.getAvatar());
        if (avatar != null && !List.of("orbita", "codigo", "robot", "nucleo").contains(avatar)) {
            return ResponseEntity.badRequest().body(Map.of("mensaje", "Avatar no válido"));
        }

        usuario.setNombre(limitarLongitud(request.getNombre(), 100));
        if (nombreUsuario != null) usuario.setNombreUsuario(nombreUsuario.toLowerCase());
        usuario.setBiografia(limitarLongitud(request.getBiografia(), 300));
        usuario.setInstitucion(limitarLongitud(request.getInstitucion(), 120));
        usuario.setPrograma(limitarLongitud(request.getPrograma(), 120));
        usuario.setAvatar(avatar == null ? usuario.getAvatar() : avatar);

        return ResponseEntity.ok(UsuarioSesionDTO.desdeUsuario(usuarioServicio.actualizar(usuario)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> buscarUsuario(@PathVariable Long id, Authentication authentication) {
        Usuario usuario = usuarioServicio.buscarPorId(id).orElse(null);

        if (usuario == null) {
            return ResponseEntity.notFound().build();
        }

        if (!puedeConsultarUsuario(authentication, usuario)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "mensaje", "No tiene permiso para consultar este usuario"));
        }

        return ResponseEntity.ok(UsuarioRespuestaDTO.desdeUsuario(usuario));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AuthRespuestaDTO> crearUsuario(@RequestBody RegistroUsuarioRequest request,
            Authentication authentication) {
        if (!tieneRol(authentication, Rol.ADMINISTRADOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new AuthRespuestaDTO(
                    false,
                    "Solo el administrador puede crear usuarios desde el CRUD",
                    null,
                    null));
        }

        return registrarUsuarioInterno(request, true);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> actualizarUsuario(@PathVariable Long id, @RequestBody ActualizarUsuarioRequest request,
            Authentication authentication) {
        if (request == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "mensaje", "Debe enviar los datos del usuario"));
        }

        Usuario usuario = usuarioServicio.buscarPorId(id).orElse(null);

        if (usuario == null) {
            return ResponseEntity.notFound().build();
        }

        if (!puedeActualizarUsuario(authentication, usuario)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "mensaje", "No tiene permiso para actualizar este usuario"));
        }

        String nombre = limpiar(request.getNombre());
        String correo = CorreoInstitucional.normalizar(request.getCorreo());

        if (nombre == null || correo == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "mensaje", "Debe enviar nombre y correo"));
        }

        if (!CorreoInstitucional.esValido(correo)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "mensaje", "Solo se permiten cuentas con correo institucional " + CorreoInstitucional.DOMINIO));
        }


        if (!tieneRol(authentication, Rol.ADMINISTRADOR)
                && !correo.equalsIgnoreCase(usuario.getCorreo())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "mensaje", "Cambiar el correo requiere verificacion y no esta permitido desde este endpoint"));
        }

        Usuario usuarioConCorreo = usuarioServicio.buscarPorCorreo(correo).orElse(null);
        if (usuarioConCorreo != null && !usuarioConCorreo.getId().equals(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "mensaje", "El correo ya esta registrado por otro usuario"));
        }

        if ((request.getNivelActual() != null || request.getPuntaje() != null)
                && !tieneRol(authentication, Rol.ADMINISTRADOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "mensaje", "El progreso se registra mediante el endpoint de progreso; solo un administrador puede corregirlo manualmente"));
        }

        usuario.setNombre(nombre);
        usuario.setCorreo(correo);

        ResponseEntity<Map<String, String>> errorProgreso = validarYAsignarProgreso(
                usuario,
                request.getNivelActual(),
                request.getPuntaje());

        if (errorProgreso != null) {
            return errorProgreso;
        }

        if (tieneRol(authentication, Rol.ADMINISTRADOR) && limpiar(request.getRol()) != null) {
            Rol rol = obtenerRol(request.getRol());
            if (rol == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "mensaje", "Rol invalido. Use ESTUDIANTE, DOCENTE o ADMINISTRADOR"));
            }

            if (esUsuarioAutenticado(authentication, usuario) && usuario.getRol() == Rol.ADMINISTRADOR
                    && rol != Rol.ADMINISTRADOR) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "mensaje", "No puede quitarse su propio rol de administrador"));
            }

            usuario.setRol(rol);
        }

        Usuario usuarioActualizado = usuarioServicio.actualizar(usuario);
        return ResponseEntity.ok(UsuarioRespuestaDTO.desdeUsuario(usuarioActualizado));
    }

    @PatchMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> actualizarProgresoUsuario(@PathVariable Long id,
            @RequestBody ActualizarProgresoUsuarioRequest request,
            Authentication authentication) {
        if (request == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "mensaje", "Debe enviar nivelActual o puntaje"));
        }

        Usuario usuario = usuarioServicio.buscarPorId(id).orElse(null);

        if (usuario == null) {
            return ResponseEntity.notFound().build();
        }

        if (!tieneRol(authentication, Rol.ADMINISTRADOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "mensaje", "Solo un administrador puede corregir el progreso manualmente"));
        }

        if (request.getNivelActual() == null && request.getPuntaje() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "mensaje", "Debe enviar nivelActual o puntaje"));
        }

        ResponseEntity<Map<String, String>> errorProgreso = validarYAsignarProgreso(
                usuario,
                request.getNivelActual(),
                request.getPuntaje());

        if (errorProgreso != null) {
            return errorProgreso;
        }

        Usuario usuarioActualizado = usuarioServicio.actualizar(usuario);
        return ResponseEntity.ok(UsuarioRespuestaDTO.desdeUsuario(usuarioActualizado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarUsuario(@PathVariable Long id, Authentication authentication) {
        if (!tieneRol(authentication, Rol.ADMINISTRADOR)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "mensaje", "Solo el administrador puede eliminar usuarios"));
        }

        Usuario usuario = usuarioServicio.buscarPorId(id).orElse(null);

        if (usuario == null) {
            return ResponseEntity.notFound().build();
        }

        if (esUsuarioAutenticado(authentication, usuario)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "mensaje", "No puede eliminar su propia cuenta de administrador"));
        }

        usuarioServicio.eliminarPorId(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/perfil")
    public ResponseEntity<Map<String, Object>> obtenerPerfil(Authentication authentication) {
        List<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        return ResponseEntity.ok(Map.of(
                "correo", authentication.getName(),
                "roles", roles));
    }

    private boolean puedeConsultarUsuario(Authentication authentication, Usuario usuario) {
        return tieneRol(authentication, Rol.ADMINISTRADOR)
                || tieneRol(authentication, Rol.DOCENTE)
                || usuario.getCorreo().equals(authentication.getName());
    }

    private boolean puedeActualizarUsuario(Authentication authentication, Usuario usuario) {
        return tieneRol(authentication, Rol.ADMINISTRADOR)
                || usuario.getCorreo().equals(authentication.getName());
    }

    private boolean esUsuarioAutenticado(Authentication authentication, Usuario usuario) {
        return authentication != null && usuario.getCorreo().equals(authentication.getName());
    }

    private boolean tieneRol(Authentication authentication, Rol rol) {
        if (authentication == null) {
            return false;
        }

        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority -> authority.equals("ROLE_" + rol.name()));
    }

    private Rol obtenerRol(String rolTexto) {
        String rolLimpio = limpiar(rolTexto);

        if (rolLimpio == null) {
            return null;
        }

        try {
            return Rol.valueOf(rolLimpio.toUpperCase());
        } catch (IllegalArgumentException error) {
            return null;
        }
    }

    private String limpiar(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }

        return valor.trim();
    }

    private Usuario usuarioAutenticado(Authentication authentication) {
        if (authentication == null) return null;
        return usuarioServicio.buscarPorCorreo(authentication.getName()).orElse(null);
    }

    private String limitarLongitud(String valor, int maximo) {
        String limpio = limpiar(valor);
        if (limpio == null) return null;
        return limpio.length() <= maximo ? limpio : limpio.substring(0, maximo);
    }

    private ResponseEntity<DesafioSegundoFactorRespuestaDTO> errorSegundoFactor(HttpStatus estado, String mensaje) {
        return ResponseEntity.status(estado).body(new DesafioSegundoFactorRespuestaDTO(
                false,
                false,
                mensaje,
                null,
                null,
                null,
                0,
                0));
    }

    private CanalSegundoFactor obtenerCanalSegundoFactor(String canalTexto) {
        String limpio = limpiar(canalTexto);
        if (limpio == null) {
            return CanalSegundoFactor.CORREO;
        }
        try {
            return CanalSegundoFactor.valueOf(limpio.toUpperCase());
        } catch (IllegalArgumentException error) {
            return null;
        }
    }

    private ResponseEntity<Map<String, String>> validarYAsignarProgreso(Usuario usuario, Integer nivelActual,
            Integer puntaje) {
        if (nivelActual != null) {
            if (nivelActual < 1 || nivelActual > 6) {
                return ResponseEntity.badRequest().body(Map.of(
                        "mensaje", "El nivel actual debe ser un numero entero entre 1 y 6"));
            }

            usuario.setNivelActual(nivelActual);
        }

        if (puntaje != null) {
            if (puntaje < 0) {
                return ResponseEntity.badRequest().body(Map.of(
                        "mensaje", "El puntaje no puede ser negativo"));
            }
            usuario.setPuntaje(puntaje);
        }

        return null;
    }
}
