package com.algolab.backend_werb_mr.controladores;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.algolab.backend_werb_mr.dtos.ActualizarUsuarioRequest;
import com.algolab.backend_werb_mr.dtos.ActualizarProgresoUsuarioRequest;
import com.algolab.backend_werb_mr.dtos.ActualizarPerfilRequest;
import com.algolab.backend_werb_mr.dtos.AuthRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.DesafioSegundoFactorRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.LoginRequest;
import com.algolab.backend_werb_mr.dtos.RegistroUsuarioRequest;
import com.algolab.backend_werb_mr.dtos.UsuarioRespuestaDTO;
import com.algolab.backend_werb_mr.dtos.UsuarioSesionDTO;
import com.algolab.backend_werb_mr.dtos.VerificarSegundoFactorRequest;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.modelos.CanalSegundoFactor;
import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.seguridad.CorreoInstitucional;
import com.algolab.backend_werb_mr.servicios.AutenticacionSegundoFactorResultado;
import com.algolab.backend_werb_mr.servicios.ISegundoFactorServicio;
import com.algolab.backend_werb_mr.servicios.IUsuarioServicio;

class UsuarioControladorTest {
    private final UsuarioServicioPrueba usuarioServicio = new UsuarioServicioPrueba();
    private final SegundoFactorServicioPrueba segundoFactorServicio = new SegundoFactorServicioPrueba();
    private final UsuarioControlador controlador = new UsuarioControlador(usuarioServicio, segundoFactorServicio);

    @Test
    void registroPublicoRechazaRolesPrivilegiados() {
        ResponseEntity<AuthRespuestaDTO> respuesta = controlador.registrarUsuario(
                solicitudRegistro("Admin", "admin@campusucc.edu.co", Rol.ADMINISTRADOR, "123456"));

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        assertFalse(respuesta.getBody().isExitoso());
    }

    @Test
    void registroPublicoCreaEstudianteSinToken() {
        ResponseEntity<AuthRespuestaDTO> respuesta = controlador.registrarUsuario(
                solicitudRegistro("Estudiante", " ESTUDIANTE@CAMPUSUCC.EDU.CO ", Rol.ESTUDIANTE, "123456"));

        assertEquals(HttpStatus.CREATED, respuesta.getStatusCode());
        assertNull(respuesta.getBody().getToken());
        assertEquals(Rol.ESTUDIANTE, respuesta.getBody().getUsuario().getRol());
        assertEquals("estudiante@campusucc.edu.co", respuesta.getBody().getUsuario().getCorreo());
    }

    @Test
    void registroPublicoRechazaCorreoNoInstitucional() {
        ResponseEntity<AuthRespuestaDTO> respuesta = controlador.registrarUsuario(
                solicitudRegistro("Estudiante", "estudiante@gmail.com", Rol.ESTUDIANTE, "123456"));

        assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
        assertFalse(respuesta.getBody().isExitoso());
    }

    @Test
    void inicioSesionExitosoConCorreoCreaDesafioSinToken() {
        Usuario usuario = usuarioServicio.registrar(
                new Usuario(null, "Estudiante", "estudiante@campusucc.edu.co", Rol.ESTUDIANTE, "123456"));
        usuario.setNombreUsuario("estudiante");

        LoginRequest request = new LoginRequest();
        request.setCorreo(" ESTUDIANTE@CAMPUSUCC.EDU.CO ");
        request.setContrasena("123456");

        ResponseEntity<?> respuesta = controlador.iniciarSesion(request);

        assertEquals(HttpStatus.ACCEPTED, respuesta.getStatusCode());
        DesafioSegundoFactorRespuestaDTO desafio = assertInstanceOf(
                DesafioSegundoFactorRespuestaDTO.class, respuesta.getBody());
        assertTrue(desafio.isRequiereSegundoFactor());
        assertEquals("desafio-prueba", desafio.getDesafioId());
    }

    @Test
    void jwtSoloSeEntregaDespuesDeVerificarSegundoFactor() {
        usuarioServicio.registrar(
                new Usuario(null, "Estudiante", "verificado@campusucc.edu.co", Rol.ESTUDIANTE, "123456"));
        LoginRequest login = new LoginRequest();
        login.setCorreo("verificado@campusucc.edu.co");
        login.setContrasena("123456");

        ResponseEntity<?> inicio = controlador.iniciarSesion(login);
        assertEquals(HttpStatus.ACCEPTED, inicio.getStatusCode());
        assertInstanceOf(DesafioSegundoFactorRespuestaDTO.class, inicio.getBody());

        VerificarSegundoFactorRequest verificacion = new VerificarSegundoFactorRequest();
        verificacion.setDesafioId("desafio-prueba");
        verificacion.setCodigo("123456");
        ResponseEntity<AuthRespuestaDTO> respuesta = controlador.verificarSegundoFactor(verificacion);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals("token-prueba", respuesta.getBody().getToken());
        assertEquals("verificado@campusucc.edu.co", respuesta.getBody().getUsuario().getCorreo());
    }

    @Test
    void inicioSesionRechazaNombreUsuarioPorqueExigeCorreoInstitucional() {
        LoginRequest request = new LoginRequest();
        request.setCorreo("estudiante");
        request.setContrasena("123456");

        ResponseEntity<?> respuesta = controlador.iniciarSesion(request);

        assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
        assertFalse(assertInstanceOf(DesafioSegundoFactorRespuestaDTO.class, respuesta.getBody()).isExitoso());
    }

    @Test
    void inicioSesionRechazaContrasenaIncorrecta() {
        Usuario usuario = usuarioServicio.registrar(
                new Usuario(null, "Estudiante", "estudiante@campusucc.edu.co", Rol.ESTUDIANTE, "123456"));
        usuario.setNombreUsuario("estudiante");

        LoginRequest request = new LoginRequest();
        request.setCorreo("estudiante@campusucc.edu.co");
        request.setContrasena("incorrecta");

        ResponseEntity<?> respuesta = controlador.iniciarSesion(request);

        assertEquals(HttpStatus.UNAUTHORIZED, respuesta.getStatusCode());
        assertFalse(assertInstanceOf(DesafioSegundoFactorRespuestaDTO.class, respuesta.getBody()).isExitoso());
    }

    @Test
    void inicioSesionRechazaUsuarioInexistente() {
        LoginRequest request = new LoginRequest();
        request.setCorreo("noexiste@campusucc.edu.co");
        request.setContrasena("123456");

        ResponseEntity<?> respuesta = controlador.iniciarSesion(request);

        assertEquals(HttpStatus.UNAUTHORIZED, respuesta.getStatusCode());
        assertFalse(assertInstanceOf(DesafioSegundoFactorRespuestaDTO.class, respuesta.getBody()).isExitoso());
    }

    @Test
    void administradorPuedeCrearDocentesDesdeCrud() {
        ResponseEntity<AuthRespuestaDTO> respuesta = controlador.crearUsuario(
                solicitudRegistro("Docente", "docente@campusucc.edu.co", Rol.DOCENTE, "123456"),
                autenticacion("admin@campusucc.edu.co", Rol.ADMINISTRADOR));

        assertEquals(HttpStatus.CREATED, respuesta.getStatusCode());
        assertNull(respuesta.getBody().getToken());
        assertEquals(Rol.DOCENTE, respuesta.getBody().getUsuario().getRol());
    }

    @Test
    void estudianteNoPuedeListarUsuarios() {
        ResponseEntity<?> respuesta = controlador.listarUsuarios(autenticacion("estudiante@test.com", Rol.ESTUDIANTE));

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
    }

    @Test
    void docentePuedeListarUsuarios() {
        usuarioServicio.registrar(new Usuario(null, "Estudiante", "estudiante@test.com", Rol.ESTUDIANTE, "123456"));

        ResponseEntity<?> respuesta = controlador.listarUsuarios(autenticacion("docente@test.com", Rol.DOCENTE));

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(1, assertInstanceOf(List.class, respuesta.getBody()).size());
    }

    @Test
    void estudianteSoloPuedeActualizarSuUsuarioYSuRolNoCambia() {
        Usuario estudiante = usuarioServicio.registrar(
                new Usuario(null, "Estudiante", "estudiante@campusucc.edu.co", Rol.ESTUDIANTE, "123456"));
        Usuario otroUsuario = usuarioServicio.registrar(
                new Usuario(null, "Otro", "otro@campusucc.edu.co", Rol.ESTUDIANTE, "123456"));

        ActualizarUsuarioRequest solicitud = solicitudActualizacion("Estudiante Editado", "estudiante@campusucc.edu.co",
                Rol.ADMINISTRADOR);
        ResponseEntity<?> respuestaPropia = controlador.actualizarUsuario(
                estudiante.getId(),
                solicitud,
                autenticacion("estudiante@campusucc.edu.co", Rol.ESTUDIANTE));

        assertEquals(HttpStatus.OK, respuestaPropia.getStatusCode());
        UsuarioRespuestaDTO usuario = assertInstanceOf(UsuarioRespuestaDTO.class, respuestaPropia.getBody());
        assertEquals("Estudiante Editado", usuario.getNombre());
        assertEquals(Rol.ESTUDIANTE, usuario.getRol());

        ResponseEntity<?> respuestaAjena = controlador.actualizarUsuario(
                otroUsuario.getId(),
                solicitudActualizacion("Otro Editado", "otro@campusucc.edu.co", Rol.ESTUDIANTE),
                autenticacion("estudiante@campusucc.edu.co", Rol.ESTUDIANTE));

        assertEquals(HttpStatus.FORBIDDEN, respuestaAjena.getStatusCode());
    }

    @Test
    void usuarioNoAdministradorNoPuedeCambiarCorreoDesdeEndpointLegado() {
        Usuario estudiante = usuarioServicio.registrar(
                new Usuario(null, "Estudiante", "original@campusucc.edu.co", Rol.ESTUDIANTE, "123456"));

        ResponseEntity<?> respuesta = controlador.actualizarUsuario(
                estudiante.getId(),
                solicitudActualizacion("Estudiante", "nuevo@campusucc.edu.co", Rol.ESTUDIANTE),
                autenticacion("original@campusucc.edu.co", Rol.ESTUDIANTE));

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        assertEquals("original@campusucc.edu.co", estudiante.getCorreo());
    }

    @Test
    void administradorSiPuedeCambiarCorreoInstitucional() {
        Usuario estudiante = usuarioServicio.registrar(
                new Usuario(null, "Estudiante", "original-admin@campusucc.edu.co", Rol.ESTUDIANTE, "123456"));

        ResponseEntity<?> respuesta = controlador.actualizarUsuario(
                estudiante.getId(),
                solicitudActualizacion("Estudiante", "nuevo-admin@campusucc.edu.co", Rol.ESTUDIANTE),
                autenticacion("admin@campusucc.edu.co", Rol.ADMINISTRADOR));

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals("nuevo-admin@campusucc.edu.co", estudiante.getCorreo());
    }

    @Test
    void estudianteNoPuedeAlterarSuPuntajeFueraDelEndpointDeProgreso() {
        Usuario estudiante = usuarioServicio.registrar(
                new Usuario(null, "Estudiante", "progreso@test.com", Rol.ESTUDIANTE, "123456"));
        estudiante.setPuntaje(40);
        ActualizarProgresoUsuarioRequest request = new ActualizarProgresoUsuarioRequest();
        request.setPuntaje(99999);

        ResponseEntity<?> respuesta = controlador.actualizarProgresoUsuario(
                estudiante.getId(), request, autenticacion(estudiante.getCorreo(), Rol.ESTUDIANTE));

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        assertEquals(40, estudiante.getPuntaje());
    }

    @Test
    void administradorPuedeCambiarRolYEliminarUsuarios() {
        Usuario usuario = usuarioServicio.registrar(
                new Usuario(null, "Usuario", "usuario@campusucc.edu.co", Rol.ESTUDIANTE, "123456"));

        ResponseEntity<?> respuestaActualizar = controlador.actualizarUsuario(
                usuario.getId(),
                solicitudActualizacion("Usuario", "usuario@campusucc.edu.co", Rol.DOCENTE),
                autenticacion("admin@campusucc.edu.co", Rol.ADMINISTRADOR));

        assertEquals(HttpStatus.OK, respuestaActualizar.getStatusCode());
        assertEquals(Rol.DOCENTE, assertInstanceOf(UsuarioRespuestaDTO.class, respuestaActualizar.getBody()).getRol());

        ResponseEntity<?> respuestaEliminar = controlador.eliminarUsuario(
                usuario.getId(),
                autenticacion("admin@campusucc.edu.co", Rol.ADMINISTRADOR));

        assertEquals(HttpStatus.NO_CONTENT, respuestaEliminar.getStatusCode());
    }

    @Test
    void administradorNoPuedeQuitarSuPropioRolAdministrador() {
        Usuario administrador = usuarioServicio.registrar(
                new Usuario(null, "Admin", "admin@campusucc.edu.co", Rol.ADMINISTRADOR, "123456"));

        ResponseEntity<?> respuesta = controlador.actualizarUsuario(
                administrador.getId(),
                solicitudActualizacion("Admin", "admin@campusucc.edu.co", Rol.DOCENTE),
                autenticacion("admin@campusucc.edu.co", Rol.ADMINISTRADOR));

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
    }

    @Test
    void administradorNoPuedeEliminarSuPropiaCuenta() {
        Usuario administrador = usuarioServicio.registrar(
                new Usuario(null, "Admin", "admin@campusucc.edu.co", Rol.ADMINISTRADOR, "123456"));

        ResponseEntity<?> respuesta = controlador.eliminarUsuario(
                administrador.getId(),
                autenticacion("admin@campusucc.edu.co", Rol.ADMINISTRADOR));

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
    }

    @Test
    void cualquierUsuarioAutenticadoPuedeEditarSuPerfilSinAlterarRolNiPuntaje() {
        Usuario estudiante = usuarioServicio.registrar(
                new Usuario(null, "Ada", "ada@test.com", Rol.ESTUDIANTE, "123456"));
        estudiante.setPuntaje(240);

        ActualizarPerfilRequest request = new ActualizarPerfilRequest();
        request.setNombre("Ada Lovelace");
        request.setNombreUsuario("ada.codigo");
        request.setBiografia("Aprendo POO con realidad mixta.");
        request.setInstitucion("AlgoLab Academy");
        request.setPrograma("Ingeniería de sistemas");
        request.setAvatar("codigo");

        ResponseEntity<?> respuesta = controlador.actualizarPerfil(
                request,
                autenticacion("ada@test.com", Rol.ESTUDIANTE));

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        UsuarioSesionDTO perfil = assertInstanceOf(UsuarioSesionDTO.class, respuesta.getBody());
        assertEquals("Ada Lovelace", perfil.getNombre());
        assertEquals("ada.codigo", perfil.getNombreUsuario());
        assertEquals("AlgoLab Academy", perfil.getInstitucion());
        assertEquals("Ingeniería de sistemas", perfil.getPrograma());
        assertEquals("codigo", perfil.getAvatar());
        assertEquals(Rol.ESTUDIANTE, perfil.getRol());
        assertEquals(240, perfil.getPuntaje());
    }

    @Test
    void sesionExponeAvatarPersonalizadoSinReemplazarElPreset() {
        Usuario estudiante = usuarioServicio.registrar(
                new Usuario(null, "Ada", "ada-avatar@test.com", Rol.ESTUDIANTE, "123456"));
        estudiante.setAvatar("codigo");
        estudiante.setAvatarVersion("version123");

        ResponseEntity<?> respuesta = controlador.obtenerUsuarioAutenticado(
                autenticacion(estudiante.getCorreo(), Rol.ESTUDIANTE));

        UsuarioSesionDTO perfil = assertInstanceOf(UsuarioSesionDTO.class, respuesta.getBody());
        assertEquals("codigo", perfil.getAvatar());
        assertEquals("version123", perfil.getAvatarVersion());
        assertEquals("/api/usuarios/" + estudiante.getId() + "/avatar?v=version123", perfil.getAvatarUrl());
    }

    @Test
    void sesionExponeEstadoDelTutorialConValorInicialSeguro() {
        Usuario estudiante = usuarioServicio.registrar(
                new Usuario(null, "Ada", "ada-tutorial@test.com", Rol.ESTUDIANTE, "123456"));

        UsuarioSesionDTO perfil = UsuarioSesionDTO.desdeUsuario(estudiante);

        assertFalse(perfil.isTutorialCompletado());
        estudiante.setTutorialCompletado(true);
        assertTrue(UsuarioSesionDTO.desdeUsuario(estudiante).isTutorialCompletado());
    }

    @Test
    void usuarioAutenticadoMarcaTutorialCompletadoDeFormaIdempotente() {
        Usuario estudiante = usuarioServicio.registrar(
                new Usuario(null, "Ada", "ada-tutorial-endpoint@test.com", Rol.ESTUDIANTE, "123456"));
        Authentication autenticacion = autenticacion(estudiante.getCorreo(), Rol.ESTUDIANTE);

        ResponseEntity<?> primera = controlador.marcarTutorialCompletado(autenticacion);
        ResponseEntity<?> segunda = controlador.marcarTutorialCompletado(autenticacion);

        assertEquals(HttpStatus.OK, primera.getStatusCode());
        assertEquals(HttpStatus.OK, segunda.getStatusCode());
        assertTrue(estudiante.isTutorialCompletado());
        assertTrue(assertInstanceOf(UsuarioSesionDTO.class, primera.getBody()).isTutorialCompletado());
        assertTrue(assertInstanceOf(UsuarioSesionDTO.class, segunda.getBody()).isTutorialCompletado());
    }

    @Test
    void marcarTutorialCompletadoRequiereSesionAutenticada() {
        ResponseEntity<?> respuesta = controlador.marcarTutorialCompletado(null);

        assertEquals(HttpStatus.UNAUTHORIZED, respuesta.getStatusCode());
    }

    private static RegistroUsuarioRequest solicitudRegistro(String nombre, String correo, Rol rol, String contrasena) {
        RegistroUsuarioRequest request = new RegistroUsuarioRequest();
        request.setNombre(nombre);
        request.setCorreo(correo);
        request.setRol(rol.name());
        request.setContrasena(contrasena);
        return request;
    }

    private static ActualizarUsuarioRequest solicitudActualizacion(String nombre, String correo, Rol rol) {
        ActualizarUsuarioRequest request = new ActualizarUsuarioRequest();
        request.setNombre(nombre);
        request.setCorreo(correo);
        request.setRol(rol.name());
        return request;
    }

    private static Authentication autenticacion(String correo, Rol rol) {
        return new UsernamePasswordAuthenticationToken(
                correo,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + rol.name())));
    }

    private static class SegundoFactorServicioPrueba implements ISegundoFactorServicio {
        private Usuario ultimoUsuario;

        @Override
        public DesafioSegundoFactorRespuestaDTO crearDesafio(Usuario usuario, CanalSegundoFactor canal) {
            ultimoUsuario = usuario;
            return new DesafioSegundoFactorRespuestaDTO(
                    true, true, "Codigo enviado", "desafio-prueba", canal.name(),
                    "es***e@campusucc.edu.co", 300, 60);
        }

        @Override
        public AutenticacionSegundoFactorResultado verificar(String desafioId, String codigo) {
            return new AutenticacionSegundoFactorResultado("token-prueba", ultimoUsuario);
        }

        @Override
        public DesafioSegundoFactorRespuestaDTO reenviar(String desafioId) {
            return new DesafioSegundoFactorRespuestaDTO(
                    true, true, "Codigo reenviado", desafioId, "CORREO",
                    "es***e@campusucc.edu.co", 300, 60);
        }
    }

    private static class UsuarioServicioPrueba implements IUsuarioServicio {
        private final Map<Long, Usuario> usuarios = new LinkedHashMap<>();
        private long siguienteId = 1;

        @Override
        public Usuario guardar(Usuario usuario) {
            return guardarUsuario(usuario);
        }

        @Override
        public Usuario registrar(Usuario usuario) {
            usuario.setCorreo(CorreoInstitucional.normalizar(usuario.getCorreo()));
            return guardarUsuario(usuario);
        }

        @Override
        public Optional<Usuario> iniciarSesion(String identificador, String contrasena) {
            return buscarPorCorreoONombreUsuario(identificador)
                    .filter(usuario -> usuario.getContrasena().equals(contrasena));
        }

        @Override
        public Optional<Usuario> buscarPorId(Long id) {
            return Optional.ofNullable(usuarios.get(id));
        }

        @Override
        public List<Usuario> listar() {
            return new ArrayList<>(usuarios.values());
        }

        @Override
        public List<Usuario> listarRankingEstudiantes() {
            return usuarios.values().stream()
                    .filter(usuario -> usuario.getRol() == Rol.ESTUDIANTE)
                    .sorted((a, b) -> Integer.compare(b.getPuntaje(), a.getPuntaje()))
                    .toList();
        }

        @Override
        public Usuario actualizar(Usuario usuario) {
            return guardarUsuario(usuario);
        }

        @Override
        public void eliminarPorId(Long id) {
            usuarios.remove(id);
        }

        @Override
        public Optional<Usuario> buscarPorCorreo(String correo) {
            return usuarios.values().stream()
                    .filter(usuario -> usuario.getCorreo().equals(correo))
                    .findFirst();
        }

        @Override
        public boolean existePorCorreo(String correo) {
            return buscarPorCorreo(correo).isPresent();
        }

        @Override
        public boolean existePorNombreUsuario(String nombreUsuario) {
            return usuarios.values().stream()
                    .anyMatch(usuario -> nombreUsuario.equals(usuario.getNombreUsuario()));
        }

        @Override
        public boolean existePorCorreoONombreUsuario(String identificador) {
            return buscarPorCorreoONombreUsuario(identificador).isPresent();
        }

        private Optional<Usuario> buscarPorCorreoONombreUsuario(String identificador) {
            return usuarios.values().stream()
                    .filter(usuario -> usuario.getCorreo().equals(identificador)
                            || identificador.equals(usuario.getNombreUsuario()))
                    .findFirst();
        }

        private Usuario guardarUsuario(Usuario usuario) {
            if (usuario.getId() == null) {
                usuario.setId(siguienteId++);
            }

            if (usuario.getNombreUsuario() == null) {
                usuario.setNombreUsuario(usuario.getCorreo().split("@", 2)[0]);
            }

            usuarios.put(usuario.getId(), usuario);
            return usuario;
        }
    }
}
