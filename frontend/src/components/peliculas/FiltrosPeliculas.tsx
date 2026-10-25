import BuscadorPeliculas from "./BuscadorPeliculas.tsx";
import { ChevronRightIcon, CloseIcon } from "../common/Icons";
import "./FiltrosPeliculas.css";

const DURACIONES = [
    { valor: "corta", etiqueta: "Hasta 100 min" },
    { valor: "media", etiqueta: "101 a 130 min" },
    { valor: "larga", etiqueta: "Más de 130 min" },
];

interface FiltrosPeliculasProps {
    busqueda: string;
    onBusquedaChange: (nuevaBusqueda: string) => void;
    generos: string[];
    clasificaciones: string[];
    generoSeleccionado: string;
    clasificacionSeleccionada: string;
    duracionSeleccionada: string;
    hayFiltrosActivos: boolean;
    onGeneroChange: (genero: string) => void;
    onClasificacionChange: (clasificacion: string) => void;
    onDuracionChange: (duracion: string) => void;
    onLimpiar: () => void;
}

function FiltrosPeliculas({
    busqueda,
    onBusquedaChange,
    generos,
    clasificaciones,
    generoSeleccionado,
    clasificacionSeleccionada,
    duracionSeleccionada,
    hayFiltrosActivos,
    onGeneroChange,
    onClasificacionChange,
    onDuracionChange,
    onLimpiar,
}: FiltrosPeliculasProps) {
    const filtrosAplicados = [
        { nombre: "género", etiqueta: generoSeleccionado, quitar: () => onGeneroChange("") },
        { nombre: "clasificación", etiqueta: clasificacionSeleccionada, quitar: () => onClasificacionChange("") },
        { nombre: "duración", etiqueta: DURACIONES.find(({ valor }) => valor === duracionSeleccionada)?.etiqueta, quitar: () => onDuracionChange("") },
    ].filter((filtro) => filtro.etiqueta);

    return (
        <section
            className="panel-filtros filtros-cartelera"
            aria-label="Búsqueda y filtros de cartelera"
        >
            <div className="herramientas-cartelera">
                <BuscadorPeliculas
                    busqueda={busqueda}
                    onBusquedaChange={onBusquedaChange}
                />
                <div className="controles-filtros">
                    <label>
                        <span>Género</span>
                        <span className="campo-selector-peliculas">
                            <select
                                aria-label="Género"
                                className={generoSeleccionado ? "activo" : ""}
                                value={generoSeleccionado}
                                onChange={(evento) => onGeneroChange(evento.target.value)}
                            >
                                <option value="">Todos los géneros</option>
                                {generos.map((genero) => (
                                    <option key={genero} value={genero}>{genero}</option>
                                ))}
                            </select>
                            <ChevronRightIcon className="flecha-selector-peliculas" size={17} />
                        </span>
                    </label>

                    <label>
                        <span>Clasificación</span>
                        <span className="campo-selector-peliculas">
                            <select
                                aria-label="Clasificación"
                                className={clasificacionSeleccionada ? "activo" : ""}
                                value={clasificacionSeleccionada}
                                onChange={(evento) => onClasificacionChange(evento.target.value)}
                            >
                                <option value="">Todas las edades</option>
                                {clasificaciones.map((clasificacion) => (
                                    <option key={clasificacion} value={clasificacion}>{clasificacion}</option>
                                ))}
                            </select>
                            <ChevronRightIcon className="flecha-selector-peliculas" size={17} />
                        </span>
                    </label>

                    <label>
                        <span>Duración</span>
                        <span className="campo-selector-peliculas">
                            <select
                                aria-label="Duración"
                                className={duracionSeleccionada ? "activo" : ""}
                                value={duracionSeleccionada}
                                onChange={(evento) => onDuracionChange(evento.target.value)}
                            >
                                <option value="">Cualquiera</option>
                                {DURACIONES.map(({ valor, etiqueta }) => (
                                    <option key={valor} value={valor}>{etiqueta}</option>
                                ))}
                            </select>
                            <ChevronRightIcon className="flecha-selector-peliculas" size={17} />
                        </span>
                    </label>
                </div>
                <button
                    type="button"
                    className="restablecer-filtros-peliculas"
                    aria-label="Limpiar búsqueda y filtros"
                    title="Limpiar búsqueda y filtros"
                    onClick={onLimpiar}
                    disabled={!hayFiltrosActivos}
                >
                    <CloseIcon size={20} />
                </button>
            </div>
            {filtrosAplicados.length > 0 && (
                <div className="filtros-peliculas-aplicados" aria-label="Filtros aplicados">
                    {filtrosAplicados.map(({ nombre, etiqueta, quitar }) => (
                        <button key={nombre} type="button" className="filtro-pelicula-aplicado" onClick={quitar} aria-label={`Quitar filtro de ${nombre}: ${etiqueta}`} title={`Quitar filtro de ${nombre}`}>
                            <span>{etiqueta}</span><CloseIcon size={13} />
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
}

export default FiltrosPeliculas;
