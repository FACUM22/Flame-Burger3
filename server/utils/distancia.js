// =====================================================
// UTILIDAD: DISTANCIA POR CALLES (OSRM)
// =====================================================
//
// Calcula la distancia real de manejo (km) entre dos
// puntos geográficos, usando el servicio público de OSRM
// (Open Source Routing Machine), que calcula la ruta real
// por las calles, no en línea recta.
//
// Si por algún motivo OSRM no responde (caída del
// servicio, sin conexión, etc.), se usa como respaldo la
// distancia en línea recta (fórmula de Haversine), para
// que el checkout nunca se rompa.

const OSRM_URL =
    "https://router.project-osrm.org/route/v1/driving";


// =====================================================
// RESPALDO: DISTANCIA RECTA (HAVERSINE)
// =====================================================

function gradosARadianes(grados) {
    return (grados * Math.PI) / 180;
}

function calcularDistanciaRectaKm(lat1, lng1, lat2, lng2) {

    const RADIO_TIERRA_KM = 6371;

    const dLat = gradosARadianes(lat2 - lat1);
    const dLng = gradosARadianes(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(gradosARadianes(lat1)) *
            Math.cos(gradosARadianes(lat2)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distancia = RADIO_TIERRA_KM * c;

    return Number(distancia.toFixed(2));
}


// =====================================================
// DISTANCIA POR CALLES (OSRM)
// =====================================================

async function calcularDistanciaKm(lat1, lng1, lat2, lng2) {

    try {

        const url =
            `${OSRM_URL}/${lng1},${lat1};${lng2},${lat2}` +
            `?overview=false`;

        const controlador = new AbortController();

        const timeoutId = setTimeout(
            () => controlador.abort(),
            5000
        );

        const respuesta = await fetch(
            url,
            { signal: controlador.signal }
        );

        clearTimeout(timeoutId);

        if (!respuesta.ok) {

            throw new Error(
                `OSRM respondió con estado ${respuesta.status}`
            );

        }

        const datos = await respuesta.json();

        if (
            datos.code !== "Ok" ||
            !datos.routes ||
            !datos.routes[0]
        ) {

            throw new Error(
                "OSRM no pudo calcular una ruta"
            );

        }

        const distanciaMetros =
            datos.routes[0].distance;

        const distanciaKm =
            distanciaMetros / 1000;

        return Number(distanciaKm.toFixed(2));

    } catch (error) {

        console.error(
            "⚠️ ERROR OSRM, usando distancia recta como respaldo:",
            error.message
        );

        return calcularDistanciaRectaKm(
            lat1,
            lng1,
            lat2,
            lng2
        );

    }

}

module.exports = {
    calcularDistanciaKm,
    calcularDistanciaRectaKm
};
