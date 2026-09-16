
// Representa a un usuario registrado en el sistema
export interface Usuario {
    // Identificador único numérico del usuario
    id: number;
    // Nombre visible o apodo del usuario
    nombre: string;
    // Correo electrónico utilizado como credencial
    email: string;
    // Fecha y hora de creación de la cuenta en formato ISO (opcional)
    fechaRegistro?: string;
}

// Representa los datos requeridos para iniciar sesión
export interface LoginInput {
    // Email ingresado en el formulario de login
    email: string;
    // Contraseña ingresada en el formulario de login
    contrasena: string;
}

// Representa los datos requeridos para registrar una nueva cuenta
export interface RegisterInput {
    // Nombre que el usuario desea mostrar en la plataforma
    nombre: string;
    // Correo electrónico a registrar
    email: string;
    // Contraseña elegida por el usuario
    contrasena: string;
    // Confirmación de contraseña para prevenir errores de tipeo
    confirmarContrasena: string;
}

// Representa los posibles mensajes de error de validación en cada campo del formulario
export interface FormularioErrores {
    // Error en el campo nombre (ej: "El nombre es obligatorio")
    nombre?: string;
    // Error en el campo email (ej: "Formato de correo no válido")
    email?: string;
    // Error en la contraseña (ej: "Mínimo 6 caracteres")
    contrasena?: string;
    // Error si las contraseñas no coinciden
    confirmarContrasena?: string;
    // Mensaje de error general de la operación (ej: "Credenciales incorrectas")
    general?: string;
}
