
export interface Usuario {
    id: number;
    nombre: string;
    email: string;
    fechaRegistro?: string;
}

export interface LoginInput {
    email: string;
    contrasena: string;
}

export interface RegisterInput {
    nombre: string;
    email: string;
    contrasena: string;
    confirmarContrasena: string;
}

export interface FormularioErrores {
    nombre?: string;
    email?: string;
    contrasena?: string;
    confirmarContrasena?: string;
    general?: string;
}
