const API_BASE = "/api/dashboard/resumen";


let periodoActual = "hoy";


// =====================================================
// ELEMENTOS
// =====================================================

const fechaDesde =
    document.getElementById(
        "fechaDesde"
    );

const fechaHasta =
    document.getElementById(
        "fechaHasta"
    );

const aplicarFechas =
    document.getElementById(
        "aplicarFechas"
    );

const periodoTexto =
    document.getElementById(
        "periodoTexto"
    );


// =====================================================
// FORMATO DINERO
// =====================================================

function dinero(valor) {

    return "$" +
        Number(
            valor || 0
        ).toLocaleString(
            "es-UY",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        );

}


// =====================================================
// FORMATO FECHA
// =====================================================

function formatoFecha(
    fecha
) {

    const partes =
        fecha.split("-");

    return `${partes[2]}/${partes[1]}`;

}


// =====================================================
// FECHA LOCAL YYYY-MM-DD
// =====================================================

function fechaLocal(
    fecha = new Date()
) {

    const year =
        fecha.getFullYear();

    const month =
        String(
            fecha.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            fecha.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


// =====================================================
// DEFINIR PERÍODO
// =====================================================

function obtenerPeriodo(
    periodo
) {

    const hoy =
        new Date();


    let desde;
    let hasta;


    // HOY
    if (
        periodo === "hoy"
    ) {

        desde =
            fechaLocal(hoy);

        hasta =
            fechaLocal(hoy);

        periodoTexto.textContent =
            "Hoy";

    }


    // AYER
    else if (
        periodo === "ayer"
    ) {

        const ayer =
            new Date(hoy);

        ayer.setDate(
            ayer.getDate() - 1
        );


        desde =
            fechaLocal(ayer);

        hasta =
            fechaLocal(ayer);

        periodoTexto.textContent =
            "Ayer";

    }


    // ÚLTIMOS 7 DÍAS
    else if (
        periodo === "7dias"
    ) {

        const inicio =
            new Date(hoy);

        inicio.setDate(
            inicio.getDate() - 6
        );


        desde =
            fechaLocal(inicio);

        hasta =
            fechaLocal(hoy);

        periodoTexto.textContent =
            "Últimos 7 días";

    }


    // ESTE MES
    else if (
        periodo === "mes"
    ) {

        const inicio =
            new Date(
                hoy.getFullYear(),
                hoy.getMonth(),
                1
            );


        desde =
            fechaLocal(inicio);

        hasta =
            fechaLocal(hoy);

        periodoTexto.textContent =
            "Este mes";

    }


    // MES ANTERIOR
    else if (
        periodo === "mesAnterior"
    ) {

        const inicio =
            new Date(
                hoy.getFullYear(),
                hoy.getMonth() - 1,
                1
            );


        const fin =
            new Date(
                hoy.getFullYear(),
                hoy.getMonth(),
                0
            );


        desde =
            fechaLocal(inicio);

        hasta =
            fechaLocal(fin);

        periodoTexto.textContent =
            "Mes anterior";

    }


    return {
        desde,
        hasta
    };

}


// =====================================================
// CARGAR DASHBOARD
// =====================================================

async function cargarDashboard(
    desde,
    hasta
) {

    try {

        const url =
            `${API_BASE}?desde=${desde}&hasta=${hasta}`;


        const respuesta =
            await fetch(url);


        if (!respuesta.ok) {

            throw new Error(
                "No se pudo cargar el dashboard."
            );

        }


        const datos =
            await respuesta.json();


        mostrarResumen(
            datos
        );


    } catch (error) {

        console.error(
            "Dashboard:",
            error
        );

    }

}


// =====================================================
// MOSTRAR RESUMEN
// =====================================================

function mostrarResumen(
    datos
) {

    const resumen =
        datos.resumen;


    document.getElementById(
        "ventasHoy"
    ).textContent =
        dinero(
            resumen.ventas
        );


    document.getElementById(
        "pedidosHoy"
    ).textContent =
        resumen.pedidos;


    document.getElementById(
        "canceladosHoy"
    ).textContent =
        resumen.cancelados;


    document.getElementById(
        "ticketPromedio"
    ).textContent =
        dinero(
            resumen.ticketPromedio
        );


    document.getElementById(
        "deliveryHoy"
    ).textContent =
        resumen.delivery;


    document.getElementById(
        "retiroHoy"
    ).textContent =
        resumen.retiro;


    mostrarFormasPago(
        datos.formasPago
    );


    mostrarVentasPorDia(
        datos.ventasPorDia
    );


    mostrarProductosVendidos(
        datos.productosVendidos
    );

}


// =====================================================
// FORMAS DE PAGO
// =====================================================

function mostrarFormasPago(
    formasPago
) {

    const contenedor =
        document.getElementById(
            "formasPago"
        );


    if (
        !formasPago ||
        formasPago.length === 0
    ) {

        contenedor.innerHTML = `
            <div class="empty-dashboard">
                💳
                <p>
                    No hay ventas en este período.
                </p>
            </div>
        `;

        return;
    }


    contenedor.innerHTML = "";


    formasPago.forEach(
        forma => {

            const fila =
                document.createElement(
                    "div"
                );


            fila.className =
                "dashboard-row";


            fila.innerHTML = `

                <div>

                    <strong>
                        ${textoPago(
                            forma.forma_pago
                        )}
                    </strong>

                    <small>
                        ${forma.cantidad}
                        pedidos
                    </small>

                </div>


                <span>
                    ${dinero(
                        forma.total
                    )}
                </span>

            `;


            contenedor.appendChild(
                fila
            );

        }
    );

}


// =====================================================
// PRODUCTOS
// =====================================================

function mostrarProductosVendidos(
    productos
) {

    const contenedor =
        document.getElementById(
            "productosVendidos"
        );


    if (
        !productos ||
        productos.length === 0
    ) {

        contenedor.innerHTML = `
            <div class="empty-dashboard">
                🍔
                <p>
                    No hay productos vendidos.
                </p>
            </div>
        `;

        return;
    }


    contenedor.innerHTML = "";


    productos.forEach(
        (producto, index) => {

            const fila =
                document.createElement(
                    "div"
                );


            fila.className =
                "dashboard-row";


            fila.innerHTML = `

                <div>

                    <strong>
                        ${index + 1}.
                        ${escaparHTML(
                            producto.nombre
                        )}
                    </strong>

                    <small>
                        ${producto.cantidad}
                        unidades
                    </small>

                </div>


                <span>
                    ${dinero(
                        producto.ventas
                    )}
                </span>

            `;


            contenedor.appendChild(
                fila
            );

        }
    );

}


// =====================================================
// VENTAS POR DÍA
// =====================================================

function mostrarVentasPorDia(
    ventas
) {

    const contenedor =
        document.getElementById(
            "ventasPorDia"
        );


    if (
        !ventas ||
        ventas.length === 0
    ) {

        contenedor.innerHTML = `
            <div class="empty-dashboard">
                📊
                <p>
                    No hay ventas en este período.
                </p>
            </div>
        `;

        return;
    }


    contenedor.innerHTML = "";


    const maxVentas =
        Math.max(
            ...ventas.map(
                item =>
                    Number(
                        item.ventas
                    )
            ),
            1
        );


    ventas.forEach(
        item => {

            const porcentaje =
                (
                    Number(
                        item.ventas
                    ) /
                    maxVentas
                ) *
                100;


            const fila =
                document.createElement(
                    "div"
                );


            fila.className =
                "venta-dia";


            fila.innerHTML = `

                <div class="venta-dia-header">

                    <strong>
                        ${formatoFecha(
                            item.fecha
                        )}
                    </strong>

                    <span>
                        ${dinero(
                            item.ventas
                        )}
                    </span>

                </div>


                <div
                    class="venta-barra-fondo"
                >

                    <div
                        class="venta-barra"
                        style="
                            width:${porcentaje}%;
                        "
                    ></div>

                </div>


                <small>
                    ${item.pedidos}
                    pedidos
                    ${
                        Number(
                            item.cancelados
                        ) > 0
                            ? ` · ${item.cancelados} cancelados`
                            : ""
                    }
                </small>

            `;


            contenedor.appendChild(
                fila
            );

        }
    );

}


// =====================================================
// BOTONES DE PERÍODO
// =====================================================

document
    .querySelectorAll(
        ".period-btn"
    )
    .forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".period-btn"
                        )
                        .forEach(
                            b =>
                                b.classList.remove(
                                    "active"
                                )
                        );


                    boton.classList.add(
                        "active"
                    );


                    periodoActual =
                        boton.dataset.period;


                    const periodo =
                        obtenerPeriodo(
                            periodoActual
                        );


                    fechaDesde.value =
                        periodo.desde;


                    fechaHasta.value =
                        periodo.hasta;


                    cargarDashboard(
                        periodo.desde,
                        periodo.hasta
                    );

                }
            );

        }
    );


// =====================================================
// FECHAS PERSONALIZADAS
// =====================================================

aplicarFechas.addEventListener(
    "click",
    () => {

        const desde =
            fechaDesde.value;

        const hasta =
            fechaHasta.value;


        if (!desde || !hasta) {

            alert(
                "Seleccioná las dos fechas."
            );

            return;
        }


        if (desde > hasta) {

            alert(
                "La fecha desde no puede ser posterior a la fecha hasta."
            );

            return;
        }


        document
            .querySelectorAll(
                ".period-btn"
            )
            .forEach(
                b =>
                    b.classList.remove(
                        "active"
                    )
            );


        periodoTexto.textContent =
            `${desde} → ${hasta}`;


        cargarDashboard(
            desde,
            hasta
        );

    }
);


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
        pago;

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
// INICIAR
// =====================================================

const inicial =
    obtenerPeriodo(
        "hoy"
    );


fechaDesde.value =
    inicial.desde;


fechaHasta.value =
    inicial.hasta;


cargarDashboard(
    inicial.desde,
    inicial.hasta
);