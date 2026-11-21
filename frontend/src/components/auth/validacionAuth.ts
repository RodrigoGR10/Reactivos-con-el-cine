const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CredencialesLogin {
  email: string;
  contrasena: string;
}

export interface DatosRegistro {
  usuario: string;
  email: string;
  contrasena: string;
  confirmacion: string;
}

/** Devuelve el mensaje de error a mostrar, o null si las credenciales son válidas. */
export const validarCredenciales = ({
  email,
  contrasena,
}: CredencialesLogin): string | null => {
  const emailNormalizado = email.trim();

  if (!emailNormalizado) {
    return "Por favor ingresa tu correo electrónico.";
  }
  if (!REGEX_EMAIL.test(emailNormalizado)) {
    return "Ingresa un correo electrónico válido.";
  }
  if (!contrasena) {
    return "Por favor ingresa tu contraseña.";
  }

  return null;
};

/** Devuelve el mensaje de error a mostrar, o null si el formulario es válido. */
export const validarRegistro = ({
  usuario,
  email,
  contrasena,
  confirmacion,
}: DatosRegistro): string | null => {
  const usuarioNormalizado = usuario.trim();
  const emailNormalizado = email.trim();

  if (!usuarioNormalizado || usuarioNormalizado.length < 2) {
    return "El nombre de usuario debe tener al menos 2 caracteres.";
  }
  if (!emailNormalizado || !REGEX_EMAIL.test(emailNormalizado)) {
    return "Ingresa un correo electrónico válido.";
  }
  if (!contrasena || contrasena.length < 6) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (!confirmacion) {
    return "Por favor confirma tu contraseña.";
  }
  if (contrasena !== confirmacion) {
    return "Las contraseñas no coinciden.";
  }

  return null;
};
