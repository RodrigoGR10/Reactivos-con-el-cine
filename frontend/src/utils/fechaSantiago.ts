const ZONA_SANTIAGO = "America/Santiago";

/**
 * Obtiene la fecha calendario de Santiago sin depender de la zona horaria del navegador.
 * @param ahora Instante que se convierte; por defecto usa la hora actual.
 * @returns Fecha local chilena en formato `AAAA-MM-DD`.
 */
export function fechaHoySantiago(ahora = new Date()): string {
    try {
        const formatted = new Intl.DateTimeFormat("en-CA", {
            timeZone: ZONA_SANTIAGO,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(ahora);
        if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
            return formatted;
        }
    } catch {
        // Fallback al reloj local si Intl no soporta la zona horaria
    }
    const y = ahora.getFullYear();
    const m = String(ahora.getMonth() + 1).padStart(2, "0");
    const d = String(ahora.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
