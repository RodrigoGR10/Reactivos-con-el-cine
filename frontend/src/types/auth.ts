/** Perfil devuelto por la API de autenticación. */
export interface Usuario {
    id: string;
    nombre: string;
    email: string;
    fechaRegistro?: string;
    peliculasFavoritas?: string[];
    cinesFavoritos?: string[];
}

/** Campos que envía el formulario de inicio de sesión. */
export interface LoginInput {
    email: string;
    contrasena: string;
}

/** Campos que envía el formulario para crear una cuenta. */
export interface RegisterInput {
    nombre: string;
    email: string;
    contrasena: string;
    confirmarContrasena: string;
}

/** Errores de validación asociados a los campos de autenticación. */
export interface FormularioErrores {
    nombre?: string;
    email?: string;
    contrasena?: string;
    confirmarContrasena?: string;
    general?: string;
}
