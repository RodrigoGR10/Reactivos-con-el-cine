import { query, pool } from "../db.ts";
import { normalizarGeneros } from "../utils/generos.ts";

// Uso: node src/scripts/normalizar-generos.ts [--write]
// Sin --write solo muestra qué cambiaría.

async function main() {
    const escribir = process.argv.includes("--write");

    const { rows: peliculas } = await query<{
        id: number;
        titulo: string;
        genero: string;
    }>("SELECT id, titulo, genero FROM peliculas");

    let cambios = 0;
    const finales = new Set<string>();

    for (const pelicula of peliculas) {
        const nuevo = normalizarGeneros(pelicula.genero);

        nuevo.split(", ").forEach((genero) => finales.add(genero));

        if (nuevo === pelicula.genero) continue;

        cambios++;
        console.log(`${pelicula.titulo}: "${pelicula.genero}" -> "${nuevo}"`);

        if (escribir) {
            await query("UPDATE peliculas SET genero = $1 WHERE id = $2", [
                nuevo,
                pelicula.id,
            ]);
        }
    }

    console.log(
        `\n${cambios} de ${peliculas.length} películas ${
            escribir ? "actualizadas" : "cambiarían (usa --write para guardar)"
        }.`,
    );

    console.log(
        `Géneros resultantes: ${[...finales]
            .sort((a, b) => a.localeCompare(b, "es"))
            .join(" | ")}`,
    );
}

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
