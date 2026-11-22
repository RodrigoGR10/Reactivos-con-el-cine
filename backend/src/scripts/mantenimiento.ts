import { pool, query } from "../db.ts";
import { extraerCartelera } from "../scraper/extraer-cartelera.ts";
import { importarDatosScraped } from "../scraper/import-data.ts";
import { sincronizarMetadatosTmdb } from "../scraper/sync-tmdb/index.ts";
import { exigirApiKey } from "../scraper/tmdb/client.ts";
import { ORIGENES, type Origen, type ScrapeOptions } from "../scraper/types.ts";
import { localNow } from "../utils/localNow.ts";

type ResumenImportacion = Awaited<ReturnType<typeof importarDatosScraped>>;

interface ResumenCadena {
    cadena: Origen;
    estado: string;
    cines?: number;
    peliculas?: number;
    horarios?: number;
    importacion?: ResumenImportacion;
}

function mostrarResumen(
    filas: ResumenCadena[],
    apply: boolean,
    apiDisponible: boolean,
    postgresDisponible: boolean,
) {
    console.log("\nResumen de mantenimiento");
    console.log(
        `API: ${apiDisponible ? "OK" : "Error"} | PostgreSQL: ${postgresDisponible ? "OK" : "Error"}`,
    );
    const tabla = filas.map((fila) => ({
        Cadena: fila.cadena,
        Estado: fila.estado,
        Cines: fila.cines,
        "Películas": fila.peliculas,
        Horarios: fila.horarios,
        ...(apply && {
            "Horarios insertados": fila.importacion?.horariosInsertados,
            "Horarios actualizados": fila.importacion?.horariosActualizados,
            "Horarios eliminados": fila.importacion?.horariosEliminados,
        }),
    }));
    const sumar = (columna: keyof (typeof tabla)[number]) =>
        tabla.reduce((total, fila) => {
            const valor = fila[columna];
            return total + (typeof valor === "number" ? valor : 0);
        }, 0);

    console.table([
        ...tabla,
        {
            Cadena: "Total",
            Estado: "",
            Cines: sumar("Cines"),
            "Películas": sumar("Películas"),
            Horarios: sumar("Horarios"),
            ...(apply && {
                "Horarios insertados": sumar("Horarios insertados"),
                "Horarios actualizados": sumar("Horarios actualizados"),
                "Horarios eliminados": sumar("Horarios eliminados"),
            }),
        },
    ]);
}

async function comprobarApi() {
    const base =
        process.env.MANTENIMIENTO_API_URL ||
        `http://localhost:${process.env.PORT || 3001}`;
    const url = new URL("/api/cines", base);
    const destino = `${url.origin}${url.pathname}`;
    const respuesta = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        redirect: "error",
    }).catch((error: Error) => {
        const causa = error.cause as NodeJS.ErrnoException | undefined;
        const detalle = causa?.code ?? error.message;
        throw new Error(`No se pudo consultar ${destino} (${detalle}).`, {
            cause: error,
        });
    });
    if (!respuesta.ok || !Array.isArray(await respuesta.json())) {
        throw new Error(
            `Respuesta inesperada de ${destino} (HTTP ${respuesta.status}).`,
        );
    }
    console.log("API disponible.");
}

async function mostrarCobertura() {
    const { rows } = await query<{
        origen: string;
        horarios: string;
        ultima_fecha: string;
    }>(`
        SELECT origen, COUNT(*) AS horarios, MAX(fecha)::text AS ultima_fecha
        FROM horarios_vigentes
        GROUP BY origen
    `);
    const porCadena = new Map(rows.map((row) => [row.origen, row]));
    console.log("Horarios vigentes en PostgreSQL por cadena:");
    console.table(
        ORIGENES.map((origen) =>
            porCadena.get(origen) ?? { origen, horarios: "0", ultima_fecha: null },
        ),
    );
}

function informarError(etapa: string, error: unknown) {
    console.error(
        `${etapa}: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
}

async function main() {
    const argumentos = process.argv.slice(2);
    const args = argumentos[0] === "--" ? argumentos.slice(1) : argumentos;
    const apply = args.includes("--apply");
    const tmdb = args.includes("--tmdb");
    if (
        args.some((arg) => !["--dry-run", "--apply", "--tmdb"].includes(arg)) ||
        (apply && args.includes("--dry-run"))
    ) {
        throw new Error("Uso: npm run mantenimiento -- [--dry-run | --apply] [--tmdb]");
    }
    if (tmdb) exigirApiKey(process.env.TMDB_API_KEY);

    console.log(apply ? "Modo aplicación" : "Modo diagnóstico");
    const [api, postgres] = await Promise.allSettled([
        comprobarApi(),
        mostrarCobertura(),
    ]);
    if (api.status === "rejected") informarError("API", api.reason);
    if (postgres.status === "rejected") informarError("PostgreSQL", postgres.reason);
    const apiDisponible = api.status === "fulfilled";
    let postgresDisponible = postgres.status === "fulfilled";
    const filas: ResumenCadena[] = ORIGENES.map((cadena) => ({
        cadena,
        estado: "Omitida",
    }));
    if (apply && (!apiDisponible || !postgresDisponible)) {
        console.error("Aplicación detenida por un fallo en las comprobaciones iniciales.");
        mostrarResumen(filas, apply, apiDisponible, postgresDisponible);
        return;
    }

    const options: ScrapeOptions = {
        desde: localNow().slice(0, 10),
        dias: null,
        cines: [],
        limitePorCine: null,
    };
    for (const fila of filas) {
        const origen = fila.cadena;
        try {
            console.log(`\nExtrayendo cartelera de ${origen}...`);
            const data = await extraerCartelera(origen, options, {
                diagnostico: !apply,
            });
            fila.cines = data.cines.length;
            fila.peliculas = data.peliculas.length;
            fila.horarios = data.horarios.length;
            fila.estado = data.meta.completo ? "Completa" : "Parcial";
            console.log(
                `${data.cines.length} cines, ${data.peliculas.length} películas, ` +
                `${data.horarios.length} horarios.`,
            );
            if (!data.meta.completo) {
                informarError(origen, "Extracción parcial. Se conservan los horarios anteriores.");
                console.table(data.incidencias);
            }
            if (apply) {
                fila.importacion = await importarDatosScraped(data);
                console.table(fila.importacion);
            }
        } catch (error) {
            fila.estado = fila.cines === undefined
                ? "Error de extracción"
                : "Error de importación";
            informarError(origen, error);
        }
    }

    if (tmdb && postgresDisponible) {
        try {
            await sincronizarMetadatosTmdb({ apply, reporteHtml: false });
        } catch (error) {
            informarError("TMDB", error);
        }
    }
    if (apply) {
        try {
            await mostrarCobertura();
        } catch (error) {
            postgresDisponible = false;
            informarError("Cobertura final de PostgreSQL", error);
        }
    }
    mostrarResumen(filas, apply, apiDisponible, postgresDisponible);
}

main()
    .catch((error: unknown) => informarError("Mantenimiento", error))
    .finally(() => pool.end());
