// Sinónimos y errores frecuentes del scraping -> nombre canónico.
// La clave va en minúsculas y sin tildes.
const ALIAS: Record<string, string> = {
    accion: "Acción",
    animacion: "Animación",
    animada: "Animación",
    aventura: "Aventura",
    aventuras: "Aventura",
    "ciencia ficcion": "Ciencia ficción",
    comedia: "Comedia",
    drama: "Drama",
    familiar: "Familiar",
    fantasia: "Fantasía",
    horror: "Terror",
    terror: "Terror",
    suspenso: "Suspenso",
    suspense: "Suspenso",
    thriler: "Thriller",
    thriller: "Thriller",
};

function clave(texto: string): string {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function formatear(genero: string): string {
    const limpio = genero.replace(/\s+/g, " ").trim();
    const canonico = ALIAS[clave(limpio)];
    if (canonico) return canonico;
    const minusculas = limpio.toLowerCase();
    return minusculas.charAt(0).toUpperCase() + minusculas.slice(1);
}

// "ACCION, aventuras" -> "Acción, Aventura"
export function normalizarGeneros(valor: string): string {
    if (typeof valor !== "string") return valor;

    const generos = valor
        .split(/[,/;|]+/)
        .map((genero) => genero.trim())
        .filter(Boolean)
        .map(formatear);

    return generos.length > 0 ? [...new Set(generos)].join(", ") : valor.trim();
}
