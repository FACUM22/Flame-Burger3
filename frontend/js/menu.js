
// =====================================================
// CONFIGURACIÓN API
// =====================================================

// El frontend se sirve desde el mismo servidor que la API
// (server.js sirve /frontend como estático), por eso usamos
// rutas relativas en vez de una URL fija.
const API_BASE = "";

const API_PRODUCTOS =
    `${API_BASE}/api/productos`;

const API_CATEGORIAS =
    `${API_BASE}/api/categorias`;

const API_CONFIGURACION =
    `${API_BASE}/api/configuracion`;


// =====================================================
// VARIABLES
// =====================================================

let productos = [];

let categorias = [];

let categoriaActual = "todas";

let carrito =
    JSON.parse(
        localStorage.getItem("flameCarrito")
    ) || [];


// =====================================================
// ELEMENTOS DEL DOM
// =====================================================

const contenedorProductos =
    document.getElementById("productos");

const contenedorCategorias =
    document.getElementById("categoriasMenu");

const cantidadCarrito =
    document.getElementById("cantidadCarrito");

const itemsCarrito =
    document.getElementById("itemsCarrito");

const totalCarrito =
    document.getElementById("totalCarrito");

const carritoOverlay =
    document.getElementById("carritoOverlay");

const botonAbrirCarrito =
    document.getElementById("abrirCarrito");

const botonCerrarCarrito =
    document.getElementById("cerrarCarrito");

const botonCheckout =
    document.getElementById("irCheckout");

const estadoLocalTexto =
    document.querySelector(".estado-local span:last-child");

const estadoLocalPunto =
    document.querySelector(".estado-punto");

let localAbierto = true;


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHTML(texto) {

    const div =
        document.createElement("div");

    div.textContent =
        texto ?? "";

    return div.innerHTML;
}


// =====================================================
// FORMATEAR PRECIO
// =====================================================

function formatearPrecio(precio) {

    return Number(precio || 0)
        .toLocaleString("es-UY", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
}


// =====================================================
// CARGAR CATEGORÍAS
// =====================================================

async function cargarCategorias() {

    try {

        const respuesta =
            await fetch(API_CATEGORIAS);

        if (!respuesta.ok) {

            throw new Error(
                "No se pudieron cargar las categorías."
            );

        }

        const datos =
            await respuesta.json();

        if (!Array.isArray(datos)) {

            throw new Error(
                "La API de categorías no devolvió una lista."
            );

        }

        categorias =
            datos.filter(
                categoria =>
                    categoria.activa === true
            );

        mostrarCategorias();

    } catch (error) {

        console.error(
            "❌ Error categorías:",
            error
        );

        contenedorCategorias.innerHTML = "";

        crearBotonTodos();

    }

}


// =====================================================
// CREAR BOTÓN TODOS
// =====================================================

function crearBotonTodos() {

    const boton =
        document.createElement("button");

    boton.type =
        "button";

    boton.className =
        "categoria-btn";

    if (categoriaActual === "todas") {

        boton.classList.add("active");

    }

    boton.dataset.categoria =
        "todas";

    boton.textContent =
        "Todos";

    boton.addEventListener(
        "click",
        () => {

            seleccionarCategoria("todas");

        }
    );

    contenedorCategorias.appendChild(
        boton
    );

}


// =====================================================
// MOSTRAR CATEGORÍAS
// =====================================================

function mostrarCategorias() {

    contenedorCategorias.innerHTML =
        "";

    crearBotonTodos();

    categorias.forEach(
        categoria => {

            const boton =
                document.createElement("button");

            boton.type =
                "button";

            boton.className =
                "categoria-btn";

            boton.dataset.categoria =
                String(categoria.id);

            boton.textContent =
                categoria.nombre;

            boton.addEventListener(
                "click",
                () => {

                    seleccionarCategoria(
                        categoria.id
                    );

                }
            );

            contenedorCategorias.appendChild(
                boton
            );

        }
    );

}


// =====================================================
// SELECCIONAR CATEGORÍA
// =====================================================

function seleccionarCategoria(
    categoriaId
) {

    categoriaActual =
        String(categoriaId);

    document
        .querySelectorAll(".categoria-btn")
        .forEach(
            boton => {

                boton.classList.remove(
                    "active"
                );

            }
        );

    const botonActivo =
        document.querySelector(
            `[data-categoria="${categoriaActual}"]`
        );

    if (botonActivo) {

        botonActivo.classList.add(
            "active"
        );

    }

    mostrarProductos();

}


// =====================================================
// CARGAR PRODUCTOS
// =====================================================

async function cargarProductos() {

    try {

        mostrarCargando();

        const respuesta =
            await fetch(API_PRODUCTOS);

        if (!respuesta.ok) {

            throw new Error(
                `Error HTTP ${respuesta.status}`
            );

        }

        const datos =
            await respuesta.json();

        if (!Array.isArray(datos)) {

            throw new Error(
                "La API no devolvió una lista."
            );

        }

        productos =
            datos.filter(
                producto =>
                    producto.disponible === true
            );

        mostrarProductos();

    } catch (error) {

        console.error(
            "❌ Error productos:",
            error
        );

        mostrarErrorProductos();

    }

}


// =====================================================
// MOSTRAR CARGANDO
// =====================================================

function mostrarCargando() {

    contenedorProductos.innerHTML = `

        <div class="loading-productos">

            <div class="loading-icon">
                🔥
            </div>

            <p>
                Cargando menú...
            </p>

        </div>

    `;

}


// =====================================================
// MOSTRAR ERROR
// =====================================================

function mostrarErrorProductos() {

    contenedorProductos.innerHTML = `

        <div class="error-productos">

            <div>
                ⚠️
            </div>

            <h3>
                No se pudo cargar el menú
            </h3>

            <p>
                Verificá que el servidor esté funcionando.
            </p>

            <button
                type="button"
                id="reintentarProductos"
            >
                🔄 Reintentar
            </button>

        </div>

    `;

    const boton =
        document.getElementById(
            "reintentarProductos"
        );

    if (boton) {

        boton.addEventListener(
            "click",
            cargarProductos
        );

    }

}


// =====================================================
// MOSTRAR PRODUCTOS
// =====================================================

function mostrarProductos() {

    contenedorProductos.innerHTML =
        "";

    let filtrados =
        [...productos];


    // =================================================
    // FILTRAR POR CATEGORÍA
    // =================================================

    if (
        categoriaActual !== "todas"
    ) {

        filtrados =
            productos.filter(
                producto =>
                    String(
                        producto.categoria_id
                    ) ===
                    String(
                        categoriaActual
                    )
            );

    }


    // =================================================
    // SIN PRODUCTOS
    // =================================================

    if (
        filtrados.length === 0
    ) {

        contenedorProductos.innerHTML = `

            <div class="sin-productos">

                <div>
                    🍔
                </div>

                <h3>
                    No hay productos
                </h3>

                <p>
                    No hay productos disponibles
                    en esta categoría.
                </p>

            </div>

        `;

        return;

    }


    // =================================================
    // CREAR TARJETAS
    // =================================================

    filtrados.forEach(
        producto => {

            crearTarjetaProducto(
                producto
            );

        }
    );

}


// =====================================================
// CREAR TARJETA PRODUCTO
// =====================================================

function crearTarjetaProducto(
    producto
) {

    const tarjeta =
        document.createElement("article");

    tarjeta.className =
        "producto";


    // =================================================
    // IMAGEN
    // =================================================

    let imagenHTML = `

        <div class="producto-sin-imagen">
            🍔
        </div>

    `;


    if (producto.imagen) {

        let imagenURL =
            String(producto.imagen).trim();


        // =================================================
        // CORREGIR URLS ANTIGUAS DE LOCALHOST
        // =================================================

        if (
            imagenURL.includes(
                "http://localhost:3000"
            )
        ) {

            imagenURL =
                imagenURL.replace(
                    "http://localhost:3000",
                    API_BASE
                );

        } else if (
            imagenURL.includes(
                "https://localhost:3000"
            )
        ) {

            imagenURL =
                imagenURL.replace(
                    "https://localhost:3000",
                    API_BASE
                );

        }


        // =================================================
        // URL COMPLETA
        // =================================================

        if (
            imagenURL.startsWith("http://") ||
            imagenURL.startsWith("https://")
        ) {

            // Ya es una URL completa.


        // =================================================
        // RUTA /uploads/...
        // =================================================

        } else if (
            imagenURL.startsWith("/")
        ) {

            imagenURL =
                `${API_BASE}${imagenURL}`;


        // =================================================
        // RUTA uploads/...
        // =================================================

        } else {

            imagenURL =
                `${API_BASE}/${imagenURL}`;

        }


        imagenHTML = `

            <img
                src="${escaparHTML(imagenURL)}"
                alt="${escaparHTML(producto.nombre)}"
                loading="lazy"
            >

        `;

    }


    // =================================================
    // HTML TARJETA
    // =================================================

    tarjeta.innerHTML = `

        <div class="producto-imagen">

            ${imagenHTML}

        </div>


        <div class="producto-contenido">


            <span class="categoria">

                ${escaparHTML(
                    producto.categoria || ""
                )}

            </span>


            <h3>

                ${escaparHTML(
                    producto.nombre || ""
                )}

            </h3>


            <p>

                ${escaparHTML(
                    producto.descripcion || ""
                )}

            </p>


            <div class="producto-bottom">


                <strong>

                    $${formatearPrecio(
                        producto.precio
                    )}

                </strong>


                <button
                    type="button"
                    class="agregar-btn"
                    aria-label="Agregar ${escaparHTML(
                        producto.nombre || ""
                    )} al carrito"
                >

                    +

                </button>


            </div>


        </div>

    `;


    // =================================================
    // FALLBACK IMAGEN
    // =================================================

    const imagen =
        tarjeta.querySelector(
            ".producto-imagen img"
        );

    if (imagen) {

        imagen.addEventListener(
            "error",
            () => {

                imagenFallback(imagen);

            }
        );

    }


    // =================================================
    // AGREGAR AL CARRITO
    // =================================================

    const botonAgregar =
        tarjeta.querySelector(
            ".agregar-btn"
        );

    botonAgregar.addEventListener(
        "click",
        () => {

            agregarAlCarrito(
                producto
            );

        }
    );


    contenedorProductos.appendChild(
        tarjeta
    );

}


// =====================================================
// FALLBACK DE IMAGEN
// =====================================================

function imagenFallback(
    imagen
) {

    if (!imagen) {
        return;
    }

    const contenedor =
        imagen.parentElement;

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = `

        <div class="producto-sin-imagen">
            🍔
        </div>

    `;

}


// =====================================================
// AGREGAR AL CARRITO
// =====================================================

function agregarAlCarrito(
    producto
) {

    const id =
        Number(producto.id);


    const existente =
        carrito.find(
            item =>
                Number(item.producto_id) === id
        );


    if (existente) {

        existente.cantidad += 1;

    } else {

        carrito.push({

            producto_id:
                id,

            nombre:
                producto.nombre,

            precio:
                Number(producto.precio),

            imagen:
                producto.imagen || "",

            cantidad:
                1

        });

    }


    guardarCarrito();

    actualizarCarrito();

    abrirCarrito();

}


// =====================================================
// GUARDAR CARRITO
// =====================================================

function guardarCarrito() {

    localStorage.setItem(
        "flameCarrito",
        JSON.stringify(carrito)
    );

}


// =====================================================
// ACTUALIZAR CARRITO
// =====================================================

function actualizarCarrito() {

    if (!itemsCarrito) {
        return;
    }

    itemsCarrito.innerHTML =
        "";

    let total =
        0;

    let cantidadTotal =
        0;


    // =================================================
    // CARRITO VACÍO
    // =================================================

    if (
        carrito.length === 0
    ) {

        itemsCarrito.innerHTML = `

            <div class="carrito-vacio">

                <div>
                    🛒
                </div>

                <p>
                    Tu carrito está vacío.
                </p>

            </div>

        `;

    }


    // =================================================
    // PRODUCTOS DEL CARRITO
    // =================================================

    carrito.forEach(
        item => {

            const precio =
                Number(item.precio) || 0;

            const cantidad =
                Number(item.cantidad) || 0;

            const subtotal =
                precio * cantidad;


            total +=
                subtotal;

            cantidadTotal +=
                cantidad;


            const elemento =
                document.createElement("div");

            elemento.className =
                "carrito-item";


            elemento.innerHTML = `

                <div>

                    <strong>
                        ${escaparHTML(
                            item.nombre
                        )}
                    </strong>

                    <small>
                        $${formatearPrecio(
                            precio
                        )}
                    </small>

                </div>


                <div class="cantidad">


                    <button
                        type="button"
                        class="menos"
                        aria-label="Disminuir cantidad"
                    >
                        −
                    </button>


                    <span>
                        ${cantidad}
                    </span>


                    <button
                        type="button"
                        class="mas"
                        aria-label="Aumentar cantidad"
                    >
                        +
                    </button>


                </div>

            `;


            // MENOS

            const botonMenos =
                elemento.querySelector(
                    ".menos"
                );

            botonMenos.addEventListener(
                "click",
                () => {

                    cambiarCantidad(
                        item.producto_id,
                        -1
                    );

                }
            );


            // MÁS

            const botonMas =
                elemento.querySelector(
                    ".mas"
                );

            botonMas.addEventListener(
                "click",
                () => {

                    cambiarCantidad(
                        item.producto_id,
                        1
                    );

                }
            );


            itemsCarrito.appendChild(
                elemento
            );

        }
    );


    // =================================================
    // TOTAL
    // =================================================

    if (totalCarrito) {

        totalCarrito.textContent =
            "$" +
            formatearPrecio(total);

    }


    // =================================================
    // CANTIDAD DEL CARRITO
    // =================================================

    if (cantidadCarrito) {

        cantidadCarrito.textContent =
            cantidadTotal;

    }

}


// =====================================================
// CAMBIAR CANTIDAD
// =====================================================

function cambiarCantidad(
    productoId,
    cambio
) {

    const item =
        carrito.find(
            producto =>
                Number(
                    producto.producto_id
                ) ===
                Number(
                    productoId
                )
        );


    if (!item) {
        return;
    }


    item.cantidad +=
        cambio;


    // =================================================
    // ELIMINAR SI LLEGA A 0
    // =================================================

    if (
        item.cantidad <= 0
    ) {

        carrito =
            carrito.filter(
                producto =>
                    Number(
                        producto.producto_id
                    ) !==
                    Number(
                        productoId
                    )
            );

    }


    guardarCarrito();

    actualizarCarrito();

}


// =====================================================
// ABRIR CARRITO
// =====================================================

function abrirCarrito() {

    if (!carritoOverlay) {
        return;
    }

    carritoOverlay.classList.add(
        "show"
    );

    document.body.style.overflow =
        "hidden";

}


// =====================================================
// CERRAR CARRITO
// =====================================================

function cerrarCarrito() {

    if (!carritoOverlay) {
        return;
    }

    carritoOverlay.classList.remove(
        "show"
    );

    document.body.style.overflow =
        "";

}


// =====================================================
// CERRAR CARRITO AL TOCAR AFUERA
// =====================================================

if (carritoOverlay) {

    carritoOverlay.addEventListener(
        "click",
        evento => {

            if (
                evento.target ===
                carritoOverlay
            ) {

                cerrarCarrito();

            }

        }
    );

}


// =====================================================
// BOTÓN ABRIR CARRITO
// =====================================================

if (botonAbrirCarrito) {

    botonAbrirCarrito.addEventListener(
        "click",
        abrirCarrito
    );

}


// =====================================================
// BOTÓN CERRAR CARRITO
// =====================================================

if (botonCerrarCarrito) {

    botonCerrarCarrito.addEventListener(
        "click",
        cerrarCarrito
    );

}


// =====================================================
// ESCAPE PARA CERRAR
// =====================================================

document.addEventListener(
    "keydown",
    evento => {

        if (
            evento.key === "Escape"
        ) {

            cerrarCarrito();

        }

    }
);


// =====================================================
// ESTADO DEL LOCAL (ABIERTO / CERRADO)
// =====================================================

async function cargarEstadoLocal() {

    try {

        const respuesta =
            await fetch(API_CONFIGURACION);

        if (!respuesta.ok) {
            throw new Error(
                "No se pudo obtener el estado del local."
            );
        }

        const datos = await respuesta.json();

        localAbierto = datos.abierto === true;

        if (estadoLocalTexto) {

            estadoLocalTexto.textContent =
                localAbierto ? "Abierto" : "Cerrado";

        }

        if (estadoLocalPunto) {

            estadoLocalPunto.classList.toggle(
                "cerrado",
                !localAbierto
            );

        }

    } catch (error) {

        console.error(
            "❌ ERROR CARGANDO ESTADO DEL LOCAL:",
            error
        );

    }

}


// =====================================================
// CONTINUAR AL CHECKOUT
// =====================================================

if (botonCheckout) {

    botonCheckout.addEventListener(
        "click",
        () => {

            if (
                carrito.length === 0
            ) {

                alert(
                    "El carrito está vacío."
                );

                return;

            }


            if (!localAbierto) {

                alert(
                    "En este momento estamos cerrados. No se pueden realizar pedidos."
                );

                return;

            }


            window.location.href =
                "/checkout.html";

        }
    );

}


// =====================================================
// INICIAR
// =====================================================

async function iniciar() {

    actualizarCarrito();

    await cargarCategorias();

    await cargarProductos();

    await cargarEstadoLocal();

}


// =====================================================
// EJECUTAR
// =====================================================

iniciar();
