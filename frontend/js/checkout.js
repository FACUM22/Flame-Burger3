const API_PEDIDOS = "/api/pedidos";
const API_PAGOS = "/api/pagos/crear";
const API_CONFIGURACION = "/api/configuracion";

const carrito = JSON.parse(localStorage.getItem("flameCarrito")) || [];

// =====================================================
// CONFIGURACIÓN DEL LOCAL (abierto/cerrado + envío)
// =====================================================

let configuracionLocal = {
    abierto: true,
    local_lat: -34.8266368,
    local_lng: -56.16827,
    envio_gratis_hasta_km: 3,
    envio_costo: 100,
    envio_maximo_km: 6
};

// Ubicación elegida por el cliente (GPS o mapa)
let ubicacionCliente = { lat: null, lng: null };

// Resultado del cálculo de distancia/envío (se recalcula en el
// servidor al confirmar, esto es solo una vista previa)
let envioPreview = { distanciaKm: null, costo: 0, bloqueado: false };

let mapaEntrega = null;
let marcadorEntrega = null;


// =====================================================
// DISTANCIA RECTA (HAVERSINE) — VISTA PREVIA EN EL CLIENTE
// =====================================================

function calcularDistanciaKm(lat1, lng1, lat2, lng2) {

    const RADIO_TIERRA_KM = 6371;

    const rad = (grados) => (grados * Math.PI) / 180;

    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(lat1)) *
            Math.cos(rad(lat2)) *
            Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Number((RADIO_TIERRA_KM * c).toFixed(2));
}

const nombreInput = document.getElementById("nombre");
const telefonoInput = document.getElementById("telefono");
const direccionInput = document.getElementById("direccion");
const comentariosInput = document.getElementById("comentarios");

const confirmarPedidoBtn = document.getElementById("confirmarPedido");
const mensaje = document.getElementById("mensaje");
const resumenProductos = document.getElementById("resumenProductos");
const totalElemento = document.getElementById("total");


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHTML(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}


// =====================================================
// MOSTRAR MENSAJE
// =====================================================

function mostrarMensaje(texto, tipo = "error") {
    if (!mensaje) return;

    mensaje.textContent = texto;
    mensaje.className = "";

    if (tipo) {
        mensaje.classList.add(tipo);
    }
}


// =====================================================
// OBTENER ENTREGA
// =====================================================

function obtenerEntrega() {
    const seleccionado = document.querySelector(
        'input[name="entrega"]:checked'
    );

    return seleccionado ? seleccionado.value : null;
}


// =====================================================
// OBTENER PAGO
// =====================================================

function obtenerPago() {
    const seleccionado = document.querySelector(
        'input[name="pago"]:checked'
    );

    return seleccionado ? seleccionado.value : null;
}


// =====================================================
// ACTUALIZAR DIRECCIÓN
// =====================================================

function actualizarDireccion() {
    const entrega = obtenerEntrega();

    const ubicacionEntregaDiv =
        document.getElementById("ubicacionEntrega");

    if (direccionInput) {

        if (entrega === "retiro") {

            direccionInput.value = "";
            direccionInput.disabled = true;
            direccionInput.required = false;

            direccionInput.placeholder =
                "No necesaria para retiro";

        } else {

            direccionInput.disabled = false;
            direccionInput.required = true;

            direccionInput.placeholder =
                "Ej: Av. Italia 1234, apto 302";
        }
    }

    if (ubicacionEntregaDiv) {

        if (entrega === "delivery") {

            ubicacionEntregaDiv.classList.add("activa");

            // El mapa necesita que su contenedor sea visible
            // antes de inicializarse, por eso lo hacemos acá.
            setTimeout(inicializarMapaEntrega, 50);

        } else {

            ubicacionEntregaDiv.classList.remove("activa");

        }

    }

    actualizarTotalConEnvio();
}


// =====================================================
// LIMPIAR TELÉFONO
// =====================================================

function limpiarTelefono() {

    if (!telefonoInput) return;

    // Solo números
    telefonoInput.value =
        telefonoInput.value.replace(/\D/g, "");

    // Máximo 9 dígitos
    if (telefonoInput.value.length > 9) {

        telefonoInput.value =
            telefonoInput.value.substring(0, 9);
    }
}


// =====================================================
// EVENTO TELÉFONO
// =====================================================

if (telefonoInput) {

    telefonoInput.addEventListener(
        "input",
        limpiarTelefono
    );

    telefonoInput.addEventListener(
        "paste",
        () => {

            setTimeout(() => {
                limpiarTelefono();
            }, 0);

        }
    );
}


// =====================================================
// EVENTOS ENTREGA
// =====================================================

document
    .querySelectorAll('input[name="entrega"]')
    .forEach((radio) => {

        radio.addEventListener(
            "change",
            actualizarDireccion
        );

    });


// =====================================================
// VALIDAR DIRECCIÓN
// =====================================================

function validarDireccion(direccion) {

    // Eliminar espacios al principio/final
    direccion = direccion.trim();

    // Mínimo razonable
    if (direccion.length < 5) {
        return false;
    }

    // Debe contener al menos un número
    const tieneNumero = /\d/.test(direccion);

    if (!tieneNumero) {
        return false;
    }

    // Debe contener letras
    const tieneLetras = /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(
        direccion
    );

    if (!tieneLetras) {
        return false;
    }

    return true;
}


// =====================================================
// RENDERIZAR CARRITO
// =====================================================

function renderizarCarrito() {

    if (!resumenProductos || !totalElemento) {
        return;
    }

    resumenProductos.innerHTML = "";

    if (!carrito.length) {

        resumenProductos.innerHTML = `
            <p class="carrito-vacio">
                Tu carrito está vacío.
            </p>
        `;

        totalElemento.textContent = "$0";

        return;
    }

    let total = 0;

    carrito.forEach((producto) => {

        const precio =
            Number(producto.precio) || 0;

        const cantidad =
            Number(producto.cantidad) || 0;

        const subtotal =
            precio * cantidad;

        total += subtotal;

        const div =
            document.createElement("div");

        div.className =
            "resumen-producto";

        div.innerHTML = `
            <div>
                <strong>
                    ${escaparHTML(producto.nombre)}
                </strong>

                <span>
                    ${cantidad} × $${precio.toFixed(2)}
                </span>
            </div>

            <strong>
                $${subtotal.toFixed(2)}
            </strong>
        `;

        resumenProductos.appendChild(div);

    });

    totalProductos = total;

    actualizarTotalConEnvio();
}


// =====================================================
// TOTAL PRODUCTOS + ENVÍO
// =====================================================

let totalProductos = 0;

function actualizarTotalConEnvio() {

    if (!totalElemento) return;

    const entrega = obtenerEntrega();

    const costoEnvio =
        entrega === "delivery"
            ? (envioPreview.costo || 0)
            : 0;

    const total = totalProductos + costoEnvio;

    totalElemento.textContent =
        `$${total.toFixed(2)}`;
}


// =====================================================
// MAPA DE ENTREGA (LEAFLET) + CÁLCULO DE DISTANCIA
// =====================================================

function inicializarMapaEntrega() {

    const contenedor =
        document.getElementById("mapaEntrega");

    if (!contenedor || typeof L === "undefined") {
        return;
    }

    // Ya inicializado: solo refrescamos el tamaño
    if (mapaEntrega) {

        mapaEntrega.invalidateSize();
        return;
    }

    const centroInicial = [
        configuracionLocal.local_lat,
        configuracionLocal.local_lng
    ];

    mapaEntrega = L.map(contenedor).setView(
        centroInicial,
        14
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap",
            maxZoom: 19
        }
    ).addTo(mapaEntrega);

    // Marcador del local (referencia, no se puede mover)
    L.marker(centroInicial, {
        opacity: 0.6
    })
        .addTo(mapaEntrega)
        .bindPopup("Flame Burger 🔥");

    marcadorEntrega = L.marker(centroInicial, {
        draggable: true
    }).addTo(mapaEntrega);

    marcadorEntrega.on("dragend", () => {

        const posicion =
            marcadorEntrega.getLatLng();

        establecerUbicacionCliente(
            posicion.lat,
            posicion.lng
        );

    });

    mapaEntrega.on("click", (evento) => {

        marcadorEntrega.setLatLng(evento.latlng);

        establecerUbicacionCliente(
            evento.latlng.lat,
            evento.latlng.lng
        );

    });

    mapaEntrega.invalidateSize();
}


function establecerUbicacionCliente(lat, lng) {

    ubicacionCliente = { lat, lng };

    const distanciaKm = calcularDistanciaKm(
        configuracionLocal.local_lat,
        configuracionLocal.local_lng,
        lat,
        lng
    );

    const gratisHastaKm =
        Number(configuracionLocal.envio_gratis_hasta_km);

    const maximoKm =
        Number(configuracionLocal.envio_maximo_km);

    const estadoUbicacion =
        document.getElementById("estadoUbicacion");

    if (distanciaKm > maximoKm) {

        envioPreview = {
            distanciaKm,
            costo: 0,
            bloqueado: true
        };

        if (estadoUbicacion) {

            estadoUbicacion.textContent =
                `📍 Estás a ${distanciaKm} km del local. ` +
                `Por ahora el delivery llega hasta ${maximoKm} km. ` +
                `Elegí "Retiro en el local" o probá con otra dirección.`;

            estadoUbicacion.className =
                "estado-ubicacion bloqueado";
        }

    } else {

        const costo =
            distanciaKm <= gratisHastaKm
                ? 0
                : Number(configuracionLocal.envio_costo);

        envioPreview = {
            distanciaKm,
            costo,
            bloqueado: false
        };

        if (estadoUbicacion) {

            estadoUbicacion.textContent =
                costo > 0
                    ? `📍 Distancia: ${distanciaKm} km · Envío: $${costo}`
                    : `📍 Distancia: ${distanciaKm} km · ¡Envío gratis!`;

            estadoUbicacion.className =
                "estado-ubicacion ok";
        }

    }

    actualizarTotalConEnvio();
}


// =====================================================
// BOTÓN "USAR MI UBICACIÓN" (GPS)
// =====================================================

const btnUsarGPS =
    document.getElementById("btnUsarGPS");

if (btnUsarGPS) {

    btnUsarGPS.addEventListener("click", () => {

        if (!navigator.geolocation) {

            mostrarMensaje(
                "Tu navegador no permite obtener la ubicación por GPS. Marcala en el mapa."
            );

            return;
        }

        btnUsarGPS.disabled = true;
        btnUsarGPS.textContent = "Buscando ubicación...";

        navigator.geolocation.getCurrentPosition(

            (posicion) => {

                const { latitude, longitude } =
                    posicion.coords;

                if (mapaEntrega && marcadorEntrega) {

                    marcadorEntrega.setLatLng([
                        latitude,
                        longitude
                    ]);

                    mapaEntrega.setView(
                        [latitude, longitude],
                        16
                    );

                }

                establecerUbicacionCliente(
                    latitude,
                    longitude
                );

                btnUsarGPS.disabled = false;
                btnUsarGPS.textContent =
                    "📍 Usar mi ubicación (GPS)";

            },

            (error) => {

                console.error(
                    "❌ ERROR GEOLOCALIZACIÓN:",
                    error
                );

                mostrarMensaje(
                    "No pudimos obtener tu ubicación por GPS. Marcala manualmente en el mapa."
                );

                btnUsarGPS.disabled = false;
                btnUsarGPS.textContent =
                    "📍 Usar mi ubicación (GPS)";

            },

            {
                enableHighAccuracy: true,
                timeout: 10000
            }
        );

    });

}


// =====================================================
// CARGAR CONFIGURACIÓN DEL LOCAL (ABIERTO/CERRADO + ENVÍO)
// =====================================================

async function cargarConfiguracionLocal() {

    try {

        const respuesta =
            await fetch(API_CONFIGURACION);

        if (!respuesta.ok) {
            throw new Error(
                "No se pudo obtener la configuración."
            );
        }

        const datos = await respuesta.json();

        configuracionLocal = {
            abierto: datos.abierto,
            local_lat: Number(datos.local_lat),
            local_lng: Number(datos.local_lng),
            envio_gratis_hasta_km:
                Number(datos.envio_gratis_hasta_km),
            envio_costo: Number(datos.envio_costo),
            envio_maximo_km: Number(datos.envio_maximo_km)
        };

        const overlay =
            document.getElementById("localCerradoOverlay");

        if (overlay) {

            overlay.classList.toggle(
                "visible",
                configuracionLocal.abierto !== true
            );

        }

        if (
            configuracionLocal.abierto !== true &&
            confirmarPedidoBtn
        ) {

            confirmarPedidoBtn.disabled = true;

        }

    } catch (error) {

        // Si falla, seguimos con los valores por defecto
        // (no bloqueamos el checkout por un error de red)
        console.error(
            "❌ ERROR CARGANDO CONFIGURACIÓN:",
            error
        );

    }

}


// =====================================================
// VALIDAR FORMULARIO
// =====================================================

function validarFormulario() {

    const nombre =
        nombreInput?.value.trim() || "";

    const telefono =
        telefonoInput?.value.trim() || "";

    const direccion =
        direccionInput?.value.trim() || "";

    const entrega =
        obtenerEntrega();

    const pago =
        obtenerPago();


    // =================================================
    // NOMBRE
    // =================================================

    if (!nombre) {

        mostrarMensaje(
            "Por favor, ingresa tu nombre."
        );

        nombreInput?.focus();

        return false;
    }


    if (nombre.length < 2) {

        mostrarMensaje(
            "El nombre debe tener al menos 2 caracteres."
        );

        nombreInput?.focus();

        return false;
    }


    // =================================================
    // TELÉFONO
    // =================================================

    if (!telefono) {

        mostrarMensaje(
            "Por favor, ingresa tu número de teléfono."
        );

        telefonoInput?.focus();

        return false;
    }


    if (!/^\d{9}$/.test(telefono)) {

        mostrarMensaje(
            "El número de teléfono debe tener exactamente 9 números."
        );

        telefonoInput?.focus();

        return false;
    }


    // =================================================
    // ENTREGA
    // =================================================

    if (!entrega) {

        mostrarMensaje(
            "Selecciona si quieres delivery o retirar el pedido."
        );

        return false;
    }


    // =================================================
    // DIRECCIÓN DELIVERY
    // =================================================

    if (entrega === "delivery") {

        if (!direccion) {

            mostrarMensaje(
                "Por favor, ingresa tu dirección."
            );

            direccionInput?.focus();

            return false;
        }


        if (!validarDireccion(direccion)) {

            mostrarMensaje(
                "Ingresa una dirección válida con calle y número de puerta. Ej: Av. Italia 1234."
            );

            direccionInput?.focus();

            return false;
        }


        // =============================================
        // UBICACIÓN EN EL MAPA (GPS o marcador)
        // =============================================

        if (
            ubicacionCliente.lat === null ||
            ubicacionCliente.lng === null
        ) {

            mostrarMensaje(
                "Marcá tu ubicación en el mapa o usá el botón de GPS para calcular el envío."
            );

            return false;
        }


        if (envioPreview.bloqueado) {

            mostrarMensaje(
                `Estás fuera de nuestra zona de delivery (máximo ${configuracionLocal.envio_maximo_km} km). Elegí "Retiro en el local".`
            );

            return false;
        }

    }


    // =================================================
    // PAGO
    // =================================================

    if (!pago) {

        mostrarMensaje(
            "Selecciona una forma de pago."
        );

        return false;
    }


    // =================================================
    // CARRITO
    // =================================================

    if (!carrito.length) {

        mostrarMensaje(
            "Tu carrito está vacío."
        );

        return false;
    }


    return true;
}


// =====================================================
// CONFIRMAR PEDIDO
// =====================================================

async function confirmarPedido() {

    try {

        // Limpiar mensaje
        mostrarMensaje("", null);


        // Validar
        if (!validarFormulario()) {
            return;
        }


        // Desactivar botón
        if (confirmarPedidoBtn) {

            confirmarPedidoBtn.disabled = true;

            confirmarPedidoBtn.textContent =
                "Procesando...";
        }


        const nombre =
            nombreInput.value.trim();

        const telefono =
            telefonoInput.value.trim();

        const direccion =
            direccionInput.value.trim();

        const comentarios =
            comentariosInput
                ? comentariosInput.value.trim()
                : "";

        const entrega =
            obtenerEntrega();

        const pago =
            obtenerPago();


        // =================================================
        // PREPARAR PEDIDO
        // =================================================

        const pedido = {

            cliente: {

                nombre,

                telefono,

                direccion,

                comentarios

            },

            entrega,

            pago,

            ubicacion:
                entrega === "delivery"
                    ? {
                        lat: ubicacionCliente.lat,
                        lng: ubicacionCliente.lng
                    }
                    : null,

            productos: carrito.map(
                (producto) => ({

                    producto_id:
                        producto.producto_id,

                    cantidad:
                        Number(producto.cantidad)

                })
            )

        };


        console.log(
            "🟡 ENVIANDO PEDIDO:",
            pedido
        );


        // =================================================
        // CREAR PEDIDO
        // =================================================

        const respuesta =
            await fetch(API_PEDIDOS, {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body:
                    JSON.stringify(pedido)

            });


        const resultado =
            await respuesta.json();


        console.log(
            "🟢 RESPUESTA PEDIDO:",
            resultado
        );


        if (
            !respuesta.ok ||
            !resultado.ok
        ) {

            throw new Error(
                resultado.error ||
                "No se pudo crear el pedido."
            );
        }


        // =================================================
        // GUARDAR PEDIDO ACTUAL
        // =================================================

        localStorage.setItem(
            "flamePedidoActual",
            JSON.stringify(resultado)
        );


        // =================================================
        // MERCADO PAGO
        // =================================================

        if (pago === "mercado_pago") {

            mostrarMensaje(
                "Generando pago con Mercado Pago...",
                "success"
            );


            console.log(
                "🟡 CREANDO PREFERENCIA DE MERCADO PAGO..."
            );


            const respuestaPago =
                await fetch(API_PAGOS, {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        pedidoId:
                            resultado.id

                    })

                });


            const resultadoPago =
                await respuestaPago.json();


            console.log(
                "🟢 RESPUESTA MERCADO PAGO:",
                resultadoPago
            );


            if (
                !respuestaPago.ok ||
                !resultadoPago.ok
            ) {

                throw new Error(
                    resultadoPago.error ||
                    "No se pudo generar el pago."
                );
            }


            if (!resultadoPago.initPoint) {

                throw new Error(
                    "Mercado Pago no devolvió el enlace de pago."
                );
            }


            // Guardar pago
            localStorage.setItem(
                "flamePagoActual",
                JSON.stringify(resultadoPago)
            );


            // Vaciar carrito
            localStorage.removeItem(
                "flameCarrito"
            );


            // Ir a Mercado Pago
            window.location.href =
                resultadoPago.initPoint;

            return;
        }


        // =================================================
        // EFECTIVO
        // =================================================

        if (pago === "efectivo") {

            localStorage.removeItem(
                "flameCarrito"
            );


            const infoEnvio =
                resultado.costo_envio > 0
                    ? ` (incluye $${resultado.costo_envio} de envío, ${resultado.distancia_km} km)`
                    : "";

            mostrarMensaje(
                `¡Pedido realizado correctamente! Número de pedido: #${resultado.id}${infoEnvio}`,
                "success"
            );


            if (confirmarPedidoBtn) {

                confirmarPedidoBtn.textContent =
                    "Pedido realizado";
            }


            setTimeout(() => {

                window.location.href = "/";

            }, 4000);


            return;
        }


        // =================================================
        // TARJETA (POS)
        // =================================================

        if (pago === "tarjeta_pos") {

            localStorage.removeItem(
                "flameCarrito"
            );


            const infoEnvio =
                resultado.costo_envio > 0
                    ? ` (incluye $${resultado.costo_envio} de envío, ${resultado.distancia_km} km)`
                    : "";

            mostrarMensaje(
                `¡Pedido realizado correctamente! Pagás con tarjeta al recibir. Número de pedido: #${resultado.id}${infoEnvio}`,
                "success"
            );


            if (confirmarPedidoBtn) {

                confirmarPedidoBtn.textContent =
                    "Pedido realizado";
            }


            setTimeout(() => {

                window.location.href = "/";

            }, 4000);


            return;
        }

    } catch (error) {

        console.error(
            "❌ ERROR PEDIDO:",
            error
        );


        mostrarMensaje(
            error.message ||
            "Ocurrió un error al realizar el pedido."
        );


        if (confirmarPedidoBtn) {

            confirmarPedidoBtn.disabled =
                false;

            confirmarPedidoBtn.textContent =
                "Confirmar pedido";
        }

    }

}


// =====================================================
// BOTÓN CONFIRMAR
// =====================================================

if (confirmarPedidoBtn) {

    confirmarPedidoBtn.addEventListener(
        "click",
        confirmarPedido
    );

}


// =====================================================
// RESULTADO MERCADO PAGO
// =====================================================

function procesarResultadoMercadoPago() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );

    const estado =
        parametros.get("estado");


    if (!estado) {
        return;
    }


    // =================================================
    // APROBADO
    // =================================================

    if (estado === "success") {

        mostrarMensaje(
            "¡Pago aprobado! Tu pedido fue recibido correctamente.",
            "success"
        );

        localStorage.removeItem(
            "flameCarrito"
        );

        return;
    }


    // =================================================
    // PENDIENTE
    // =================================================

    if (estado === "pending") {

        mostrarMensaje(
            "El pago está pendiente. Estamos esperando la confirmación de Mercado Pago.",
            "success"
        );

        return;
    }


    // =================================================
    // FALLIDO
    // =================================================

    if (estado === "failure") {

        mostrarMensaje(
            "El pago no pudo completarse. Puedes intentarlo nuevamente."
        );

        return;
    }

}


// =====================================================
// INICIO
// =====================================================

renderizarCarrito();

actualizarDireccion();

procesarResultadoMercadoPago();

cargarConfiguracionLocal();
