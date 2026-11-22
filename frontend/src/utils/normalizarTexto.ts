/**
 * Quita tildes y convierte texto a minúsculas para comparar búsquedas.
 * @param texto Texto original ingresado o recibido de la API.
 * @returns Texto normalizado para búsquedas sin distinguir tildes ni mayúsculas.
 */
export function normalizarTexto(texto: string): string {
    return texto
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase("es-CL");
}
