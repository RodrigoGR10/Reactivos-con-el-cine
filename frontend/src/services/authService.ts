import type { Usuario, LoginInput, RegisterInput } from '../types/auth';

const STORAGE_KEY_USUARIO_ACTIVO = 'cine_usuario_activo';
const STORAGE_KEY_USUARIOS = 'cine_usuarios_registrados';

// Obtiene la lista de usuarios registrados desde localStorage
const obtenerUsuariosRegistrados = (): (Usuario & { contrasena: string })[] => {
    const data = localStorage.getItem(STORAGE_KEY_USUARIOS);
    if (!data) return [];
    try {
        return JSON.parse(data);
    } catch {
        return [];
    }
};

// Autentica un usuario verificando correo y contraseña
const login = async (credenciales: LoginInput): Promise<Usuario> => {
    const usuarios = obtenerUsuariosRegistrados();
    const usuario = usuarios.find(
        (u) => u.email.toLowerCase() === credenciales.email.trim().toLowerCase() && 
               u.contrasena === credenciales.contrasena
    );

    if (!usuario) {
        throw new Error('El correo o la contraseña son incorrectos.');
    }

    const { contrasena, ...usuarioSinContrasena } = usuario;
    localStorage.setItem(STORAGE_KEY_USUARIO_ACTIVO, JSON.stringify(usuarioSinContrasena));
    return usuarioSinContrasena;
};

// Registra un nuevo usuario verificando que el correo no esté duplicado
const register = async (datos: RegisterInput): Promise<Usuario> => {
    const usuarios = obtenerUsuariosRegistrados();
    const emailExiste = usuarios.some(
        (u) => u.email.toLowerCase() === datos.email.trim().toLowerCase()
    );

    if (emailExiste) {
        throw new Error('Este correo electrónico ya se encuentra registrado.');
    }

    const nuevoUsuario: Usuario & { contrasena: string } = {
        id: Date.now(),
        nombre: datos.nombre.trim(),
        email: datos.email.trim().toLowerCase(),
        contrasena: datos.contrasena,
        fechaRegistro: new Date().toISOString()
    };

    usuarios.push(nuevoUsuario);
    localStorage.setItem(STORAGE_KEY_USUARIOS, JSON.stringify(usuarios));

    const { contrasena, ...usuarioSinContrasena } = nuevoUsuario;
    localStorage.setItem(STORAGE_KEY_USUARIO_ACTIVO, JSON.stringify(usuarioSinContrasena));
    return usuarioSinContrasena;
};

// Elimina la sesión activa
const logout = (): void => {
    localStorage.removeItem(STORAGE_KEY_USUARIO_ACTIVO);
};

// Retorna el usuario activo si existe una sesión válida
const getCurrentUser = (): Usuario | null => {
    const data = localStorage.getItem(STORAGE_KEY_USUARIO_ACTIVO);
    if (!data) return null;
    try {
        return JSON.parse(data) as Usuario;
    } catch {
        logout();
        return null;
    }
};

export default {
    login,
    register,
    logout,
    getCurrentUser
};
