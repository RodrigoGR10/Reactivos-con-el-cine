// Utilizacion de Formula de haversine (https://es.wikipedia.org/wiki/F%C3%B3rmula_del_semiverseno)
// para calcular distancias entre dos coordenadas

const RADIO_TIERRA_KM = 6371;
const aRadianes = (grados: number) => (grados * Math.PI) / 180;

/**
 * Calcula la distancia geográfica entre dos puntos mediante Haversine.
 * @param lat1 Latitud del primer punto, en grados.
 * @param lon1 Longitud del primer punto, en grados.
 * @param lat2 Latitud del segundo punto, en grados.
 * @param lon2 Longitud del segundo punto, en grados.
 * @returns Distancia entre los puntos, en kilómetros.
 */
export function distanciaKM(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const dLat = aRadianes(lat2 - lat1);
    const dLon = aRadianes(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(aRadianes(lat1)) *
            Math.cos(aRadianes(lat2)) *
            Math.sin(dLon / 2) ** 2;

    return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(a));
}

/**
 * Formatea una distancia corta en metros y el resto en kilómetros.
 * @param km Distancia en kilómetros.
 * @returns Distancia legible para mostrar en la interfaz.
 */
export function formatearDistancia(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
