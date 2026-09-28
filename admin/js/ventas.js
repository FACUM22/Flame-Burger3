const API_URL = "/api/ventas";

// =====================================================
// ELEMENTOS
// =====================================================

const desde =
document.getElementById("desde");

const hasta =
document.getElementById("hasta");

const estado =
document.getElementById("estado");

const formaPago =
document.getElementById("formaPago");

const tipoEntrega =
document.getElementById("tipoEntrega");

const buscar =
document.getElementById("buscar");

const aplicarFiltros =
document.getElementById("aplicarFiltros");

const limpiarFiltros =
document.getElementById("limpiarFiltros");

const tablaVentas =
document.getElementById("tablaVentas");

const emptySales =
document.getElementById("emptySales");

// =====================================================
// DINERO
// =====================================================

function dinero(valor) {


return "$" +
    Number(valor || 0).toLocaleString(
        "es-UY",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    );


}

// =====================================================
// FECHA LOCAL
// =====================================================

function fechaLocal() {

const fecha = new Date();

const year =
    fecha.getFullYear();

const month =
    String(
        fecha.getMonth() + 1
    ).padStart(2, "0");

const day =
    String(
        fecha.getDate()
    ).padStart(2, "0");

return `${year}-${month}-${day}`;


}

// =====================================================
// CARGAR VENTAS
// =====================================================

async function cargarVentas() {


try {

    const parametros =
        new URLSearchParams();


    // ---------------------------------------------
    // DESDE
    // ---------------------------------------------

    if (desde.value) {

        parametros.append(
            "desde",
            desde.value
        );

    }


    // ---------------------------------------------
    // HASTA
    // ---------------------------------------------

    if (hasta.value) {

        parametros.append(
            "hasta",
            hasta.value
        );

    }


    // ---------------------------------------------
    // ESTADO
    // ---------------------------------------------

    if (
        estado.value !== "todos"
    ) {

        parametros.append(
            "estado",
            estado.value
        );

    }


    // ---------------------------------------------
    // FORMA DE PAGO
    // ---------------------------------------------

    if (
        formaPago.value !== "todos"
    ) {

        parametros.append(
            "forma_pago",
            formaPago.value
        );

    }


    // ---------------------------------------------
    // TIPO DE ENTREGA
    // ---------------------------------------------

    if (
        tipoEntrega.value !== "todos"
    ) {

        parametros.append(
            "tipo_entrega",
            tipoEntrega.value
        );

    }


    // ---------------------------------------------
    // BUSCAR
    // ---------------------------------------------

    if (
        buscar.value.trim()
    ) {

        parametros.append(
            "buscar",
            buscar.value.trim()
        );

    }


    // ---------------------------------------------
    // PETICIÓN
    // ---------------------------------------------

    const respuesta =
        await fetch(
            `${API_URL}?${parametros.toString()}`
        );


    if (!respuesta.ok) {

        throw new Error(
            "No se pudieron cargar las ventas."
        );

    }


    const datos =
        await respuesta.json();


    // ---------------------------------------------
    // MOSTRAR
    // ---------------------------------------------

    mostrarResumen(
        datos.resumen
    );

    mostrarVentas(
        datos.pedidos
    );


} catch (error) {

    console.error(
        "ERROR VENTAS:",
        error
    );


    tablaVentas.innerHTML = "";

    emptySales.style.display =
        "block";

    emptySales.innerHTML = `

        <div class="empty-sales-icon">
            ⚠️
        </div>

        <strong>
            Error al cargar las ventas
        </strong>

        <p>
            Comprobá que el servidor esté funcionando.
        </p>

    `;

}

}

// =====================================================
// RESUMEN
// =====================================================

function mostrarResumen(
resumen
) {

document.getElementById(
    "totalVentas"
).textContent =
    dinero(
        resumen?.ventas
    );


document.getElementById(
    "totalPedidos"
).textContent =
    resumen?.pedidos ?? 0;


document.getElementById(
    "totalCancelados"
).textContent =
    resumen?.cancelados ?? 0;


}

// =====================================================
// MOSTRAR VENTAS
// =====================================================

function mostrarVentas(
ventas
) {


tablaVentas.innerHTML = "";


if (
    !ventas ||
    ventas.length === 0
) {

    emptySales.style.display =
        "block";

    return;

}


emptySales.style.display =
    "none";


ventas.forEach(
    venta => {

        const fila =
            document.createElement(
                "tr"
            );


        fila.innerHTML = `

            <td>

                <div class="sale-number">
                    #${venta.id}
                </div>

            </td>


            <td>

                ${formatearFecha(
                    venta.creado_en
                )}

            </td>


            <td>

                <div class="sale-client">

                    <strong>
                        ${escaparHTML(
                            venta.cliente_nombre ||
                            "Sin nombre"
                        )}
                    </strong>

                    <small>
                        ${escaparHTML(
                            venta.cliente_telefono ||
                            "-"
                        )}
                    </small>

                </div>

            </td>


            <td>

                ${
                    venta.tipo_entrega ===
                    "delivery"

                        ? "🛵 Delivery"

                        : "🏪 Retiro"
                }

            </td>


            <td>

                ${textoPago(
                    venta.forma_pago
                )}

            </td>


            <td>

                <span
                    class="
                        sale-status
                        ${escaparHTML(
                            venta.estado
                        )}
                    "
                >

                    ${textoEstado(
                        venta.estado
                    )}

                </span>

            </td>


            <td>

                <div class="sale-total">

                    ${dinero(
                        venta.total
                    )}

                </div>

            </td>

        `;


        tablaVentas.appendChild(
            fila
        );

    }
);

}

// =====================================================
// TEXTO DE ESTADO
// =====================================================

function textoEstado(
estado
) {


const estados = {

    nuevo:
        "NUEVO",

    confirmado:
        "CONFIRMADO",

    preparando:
        "PREPARANDO",

    listo:
        "LISTO",

    entregado:
        "ENTREGADO",

    cancelado:
        "CANCELADO"

};


return estados[estado] ||
    String(
        estado || ""
    ).toUpperCase();


}

// =====================================================
// TEXTO PAGO
// =====================================================

function textoPago(
pago
) {


const pagos = {

    efectivo:
        "💵 Efectivo",

    mercado_pago:
        "💳 Mercado Pago",

    tarjeta:
        "💳 Tarjeta"

};


return pagos[pago] ||
    pago ||
    "-";

}

// =====================================================
// FECHA
// =====================================================

function formatearFecha(
fecha
) {

if (!fecha) {
    return "-";
}

return new Date(
    fecha
).toLocaleString(
    "es-UY",
    {
        dateStyle: "short",
        timeStyle: "short"
    }
);


}

// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHTML(
texto
) {


const div =
    document.createElement(
        "div"
    );

div.textContent =
    texto ?? "";

return div.innerHTML;


}

// =====================================================
// APLICAR FILTROS
// =====================================================

aplicarFiltros.addEventListener(
"click",
cargarVentas
);

// =====================================================
// LIMPIAR
// =====================================================

limpiarFiltros.addEventListener(
"click",
() => {

    desde.value =
        fechaLocal();

    hasta.value =
        fechaLocal();

    estado.value =
        "todos";

    formaPago.value =
        "todos";

    tipoEntrega.value =
        "todos";

    buscar.value =
        "";

    cargarVentas();

}


);

// =====================================================
// ENTER EN BUSCADOR
// =====================================================

buscar.addEventListener(
"keydown",
event => {


    if (
        event.key === "Enter"
    ) {

        cargarVentas();

    }

}


);

// =====================================================
// INICIAR
// =====================================================

desde.value =
fechaLocal();

hasta.value =
fechaLocal();

cargarVentas();
