// El proveedor usa este nombre y su slug como sustitutos del título real.
// El patrón se comparte con PostgreSQL para ocultar registros ya importados.
export const PATRON_FUNCION_SECRETA = String.raw`^\s*(funci[oóÓ]n[\s_-]+secreta|funciones[\s_-]+secretas)([\s_-]+[0-9]+)?\s*$`;

const FUNCION_SECRETA = new RegExp(PATRON_FUNCION_SECRETA, "i");

export function esFuncionSecreta(titulo: string): boolean {
    return FUNCION_SECRETA.test(titulo);
}
