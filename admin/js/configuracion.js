const API_CONFIGURACION = "/api/configuracion";

const dot = document.getElementById("configEstadoDot");
const texto = document.getElementById("configEstadoTexto");
const sub = document.getElementById("configEstadoSub");
const btnAlternar = document.getElementById("btnAlternarEstado");

const formEnvio = document.getElementById("formEnvio");
const mensajeEnvio = document.getElementById("mensajeEnvio");

const inputGratisHasta = document.getElementById("envioGratisHastaKm");
const inputCosto = document.getElementById("envioCosto");
const inputMaximo = document.getElementById("envioMaximoKm");

const ubicacionLat = document.getElementById("ubicacionLat");
const ubicacionLng = document.getElementById("ubicacionLng");

let abiertoActual = true;


// =====================================================
// MOSTRAR MENSAJE
// =====================================================

function mostrarMensaje(elemento, texto, tipo = "error") {

    if (!elemento) return;

    elemento.textContent = texto;
    elemento.className = "form-message";

    if (tipo) {
        elemento.classList.add(tipo);
    }

}


// =====================================================
// PINTAR ESTADO
// =====================================================

function pintarEstado(abierto) {

    abiertoActual = abierto;

    if (dot) {
        dot.classList.toggle("cerrado", !abierto);
    }

    if (texto) {
        texto.textContent =
            abierto ? "Local abierto" : "Local cerrado";
    }

    if (sub) {
        sub.textContent =
            abierto
                ? "Recibiendo pedidos"
                : "No se están aceptando pedidos";
    }

    if (btnAlternar) {
        btnAlternar.textContent =
            abierto ? "Cerrar local" : "Abrir local";
    }

}


// =====================================================
// CARGAR CONFIGURACIÓN
// =====================================================

async function cargarConfiguracion() {

    try {

        const respuesta = await fetch(API_CONFIGURACION);

        if (!respuesta.ok) {
            throw new Error("No se pudo cargar la configuración.");
        }

        const config = await respuesta.json();

        pintarEstado(config.abierto === true);

        if (inputGratisHasta) {
            inputGratisHasta.value = config.envio_gratis_hasta_km;
        }

        if (inputCosto) {
            inputCosto.value = config.envio_costo;
        }

        if (inputMaximo) {
            inputMaximo.value = config.envio_maximo_km;
        }

        if (ubicacionLat) {
            ubicacionLat.textContent = config.local_lat;
        }

        if (ubicacionLng) {
            ubicacionLng.textContent = config.local_lng;
        }

    } catch (error) {

        console.error(error);

        mostrarMensaje(
            mensajeEnvio,
            "No se pudo cargar la configuración del local."
        );

    }

}


// =====================================================
// ALTERNAR ABIERTO / CERRADO
// =====================================================

if (btnAlternar) {

    btnAlternar.addEventListener("click", async () => {

        const confirmacion = confirm(
            abiertoActual
                ? "¿Cerrar el local? No se van a poder hacer más pedidos hasta que lo vuelvas a abrir."
                : "¿Abrir el local para volver a recibir pedidos?"
        );

        if (!confirmacion) return;

        btnAlternar.disabled = true;

        try {

            const respuesta = await fetch(
                `${API_CONFIGURACION}/estado`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        abierto: !abiertoActual
                    })
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.error ||
                    "No se pudo cambiar el estado."
                );
            }

            pintarEstado(datos.configuracion.abierto === true);

        } catch (error) {

            console.error(error);

            alert(
                error.message ||
                "No se pudo cambiar el estado del local."
            );

        } finally {

            btnAlternar.disabled = false;

        }

    });

}


// =====================================================
// GUARDAR REGLAS DE ENVÍO
// =====================================================

if (formEnvio) {

    formEnvio.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        mostrarMensaje(mensajeEnvio, "", null);

        const envio_gratis_hasta_km =
            Number(inputGratisHasta.value);

        const envio_costo =
            Number(inputCosto.value);

        const envio_maximo_km =
            Number(inputMaximo.value);

        if (
            isNaN(envio_gratis_hasta_km) ||
            isNaN(envio_costo) ||
            isNaN(envio_maximo_km)
        ) {

            mostrarMensaje(
                mensajeEnvio,
                "Completá los tres valores con números válidos."
            );

            return;
        }

        if (envio_maximo_km < envio_gratis_hasta_km) {

            mostrarMensaje(
                mensajeEnvio,
                "La distancia máxima no puede ser menor que la distancia con envío gratis."
            );

            return;
        }

        try {

            const respuesta = await fetch(API_CONFIGURACION, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    envio_gratis_hasta_km,
                    envio_costo,
                    envio_maximo_km
                })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    datos.error ||
                    "No se pudo guardar la configuración."
                );
            }

            mostrarMensaje(
                mensajeEnvio,
                "Reglas de envío actualizadas correctamente.",
                "success"
            );

        } catch (error) {

            console.error(error);

            mostrarMensaje(
                mensajeEnvio,
                error.message ||
                "No se pudo guardar la configuración."
            );

        }

    });

}


cargarConfiguracion();
