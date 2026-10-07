package com.algolab.backend_werb_mr.servicios;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.algolab.backend_werb_mr.modelos.Usuario;
import com.algolab.backend_werb_mr.modelos.Rol;
import com.algolab.backend_werb_mr.repositorio.Repositorio;
import com.algolab.backend_werb_mr.seguridad.CorreoInstitucional;
import com.algolab.backend_werb_mr.seguridad.NumeroCelular;

@Service
public class UsuarioServicio implements IUsuarioServicio {
    private final Repositorio repositorio;
    private final PasswordEncoder passwordEncoder;
    @PersistenceContext
    private EntityManager entityManager;

    public UsuarioServicio(Repositorio repositorio, PasswordEncoder passwordEncoder) {
        this.repositorio = repositorio;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public Usuario guardar(Usuario usuario) {
        return repositorio.guardar(usuario);
    }

    @Override
    public Usuario registrar(Usuario usuario) {
        String correo = CorreoInstitucional.normalizar(usuario.getCorreo());
        if (!CorreoInstitucional.esValido(correo)) {
            throw new IllegalArgumentException("El correo electrónico no es válido");
        }
        usuario.setCorreo(correo);
        String celular = NumeroCelular.normalizar(usuario.getCelular());
        if (celular != null && !NumeroCelular.esValido(celular)) {
            throw new IllegalArgumentException("El celular debe usar formato internacional E.164, por ejemplo +573001234567");
        }
        usuario.setCelular(celular);

        if (usuario.getNombreUsuario() == null || usuario.getNombreUsuario().isBlank()) {
            usuario.setNombreUsuario(generarNombreUsuario(usuario.getCorreo()));
        }

        usuario.setContrasena(passwordEncoder.encode(usuario.getContrasena()));
        return repositorio.guardar(usuario);
    }

    @Override
    public Optional<Usuario> iniciarSesion(String identificador, String contrasena) {
        String correo = CorreoInstitucional.normalizar(identificador);
        if (!CorreoInstitucional.esValido(correo)) {
            return Optional.empty();
        }
        return repositorio.buscarPorCorreo(correo)
                .filter(usuario -> passwordEncoder.matches(contrasena, usuario.getContrasena()));
    }

    @Override
    public Optional<Usuario> buscarPorId(Long id) {
        return repositorio.buscarPorId(id);
    }

    @Override
    public List<Usuario> listar() {
        return repositorio.listar();
    }

    @Override
    public List<Usuario> listarRankingEstudiantes() {
        return repositorio.listarPorRolParaRanking(Rol.ESTUDIANTE);
    }

    @Override
    public Usuario actualizar(Usuario usuario) {
        if (usuario.getCorreo() != null) {
            String correo = CorreoInstitucional.normalizar(usuario.getCorreo());
            if (!CorreoInstitucional.esValido(correo)) {
                throw new IllegalArgumentException("El correo electrónico no es válido");
            }
            usuario.setCorreo(correo);
        }
        return repositorio.actualizar(usuario);
    }

    @Override
    @Transactional
    public Usuario actualizarPerfil(Usuario datos) {
        // Capturar la intención antes de refresh: con OpenEntityManagerInView,
        // datos y el perfil recargado pueden ser la misma instancia JPA.
        String nombre = datos.getNombre();
        String nombreUsuario = datos.getNombreUsuario();
        String biografia = datos.getBiografia();
        String institucion = datos.getInstitucion();
        String programa = datos.getPrograma();
        String avatar = datos.getAvatar();
        Usuario vigente = BloqueoUsuario.recargar(entityManager, datos);
        vigente.setNombre(nombre); vigente.setNombreUsuario(nombreUsuario);
        vigente.setBiografia(biografia); vigente.setInstitucion(institucion);
        vigente.setPrograma(programa); vigente.setAvatar(avatar);
        return actualizar(vigente);
    }

    @Override
    @Transactional
    public Usuario marcarTutorialCompletado(Usuario usuario) {
        Usuario vigente = BloqueoUsuario.recargar(entityManager, usuario);
        vigente.setTutorialCompletado(true);
        return actualizar(vigente);
    }

    @Override
    @Transactional
    public Usuario actualizarFicha(Usuario datos, boolean incluirRol, boolean incluirNivel, boolean incluirPuntaje) {
        String nombre = datos.getNombre();
        String correo = datos.getCorreo();
        Rol rol = datos.getRol();
        Integer nivel = datos.getNivelActual();
        Integer puntaje = datos.getPuntaje();
        Usuario vigente = BloqueoUsuario.recargar(entityManager, datos);
        vigente.setNombre(nombre); vigente.setCorreo(correo);
        if (incluirRol) vigente.setRol(rol);
        if (incluirNivel) vigente.setNivelActual(nivel);
        if (incluirPuntaje) vigente.setPuntaje(puntaje);
        return actualizar(vigente);
    }

    @Override
    @Transactional
    public Usuario corregirProgreso(Usuario datos, boolean incluirNivel, boolean incluirPuntaje) {
        Integer nivel = datos.getNivelActual();
        Integer puntaje = datos.getPuntaje();
        Usuario vigente = BloqueoUsuario.recargar(entityManager, datos);
        if (incluirNivel) vigente.setNivelActual(nivel);
        if (incluirPuntaje) vigente.setPuntaje(puntaje);
        return actualizar(vigente);
    }

    @Override
    public void eliminarPorId(Long id) {
        repositorio.eliminarPorId(id);
    }

    @Override
    public Optional<Usuario> buscarPorCorreo(String correo) {
        String normalizado = CorreoInstitucional.normalizar(correo);
        return normalizado == null ? Optional.empty() : repositorio.buscarPorCorreo(normalizado);
    }

    @Override
    public boolean existePorCorreo(String correo) {
        String normalizado = CorreoInstitucional.normalizar(correo);
        return normalizado != null && repositorio.existePorCorreo(normalizado);
    }

    @Override
    public boolean existePorNombreUsuario(String nombreUsuario) {
        return repositorio.existePorNombreUsuario(nombreUsuario);
    }

    @Override
    public boolean existePorCorreoONombreUsuario(String identificador) {
        return repositorio.existePorCorreoONombreUsuario(identificador);
    }

    private String generarNombreUsuario(String correo) {
        String base = correo.split("@", 2)[0]
                .toLowerCase()
                .replaceAll("[^a-z0-9._-]", "");

        if (base.isBlank()) {
            base = "usuario";
        }

        String candidato = base;
        int contador = 1;

        while (repositorio.existePorNombreUsuario(candidato)) {
            candidato = base + contador;
            contador++;
        }

        return candidato;
    }
}
