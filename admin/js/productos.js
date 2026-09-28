const API_PRODUCTOS = "/api/productos";

const API_CATEGORIAS = "/api/categorias";

let productos = [];
let categorias = [];
let productoEditando = null;


// =====================================================
// ELEMENTOS
// =====================================================

const formulario =
    document.getElementById("productoForm");

const listaProductos =
    document.getElementById("listaProductos");

const modal =
    document.getElementById("modalProducto");

const abrirFormulario =
    document.getElementById("abrirFormulario");

const abrirFormularioEmpty =
    document.getElementById("abrirFormularioEmpty");

const cerrarModal =
    document.getElementById("cerrarModal");

const cancelarModal =
    document.getElementById("cancelarModal");

const mensaje =
    document.getElementById("mensaje");

const buscarProducto =
    document.getElementById("buscarProducto");

const filtroEstado =
    document.getElementById("filtroEstado");

const imagenInput =
    document.getElementById("imagen");

const vistaPrevia =
    document.getElementById("vistaPrevia");

const categoriaSelect =
    document.getElementById("categoria");

const modalTitulo =
    document.querySelector(
        ".modal-header h2"
    );


// =====================================================
// ABRIR MODAL - NUEVO PRODUCTO
// =====================================================

function abrirNuevoProducto() {

    productoEditando = null;

    formulario.reset();

    mensaje.textContent = "";

    mensaje.style.color = "";

    if (modalTitulo) {
        modalTitulo.textContent =
            "Nuevo producto";
    }

    if (vistaPrevia) {
        vistaPrevia.innerHTML = `
            <span>🍔</span>
        `;
    }

    cargarCategorias();

    modal.classList.add("show");
}


// =====================================================
// ABRIR MODAL - EDITAR PRODUCTO
// =====================================================

async function abrirEditarProducto(
    producto
) {

    productoEditando =
        producto;

    mensaje.textContent = "";

    mensaje.style.color = "";

    if (modalTitulo) {
        modalTitulo.textContent =
            "Editar producto";
    }

    document.getElementById(
        "nombre"
    ).value =
        producto.nombre || "";


    document.getElementById(
        "descripcion"
    ).value =
        producto.descripcion || "";


    document.getElementById(
        "precio"
    ).value =
        producto.precio || "";


    await cargarCategorias(
        producto.categoria_id
    );


    imagenInput.value = "";


    // Mostrar imagen actual

    if (producto.imagen) {

        vistaPrevia.innerHTML = `
            <img
                src="${crearURLImagen(
                    producto.imagen
                )}"
                alt="${escaparHTML(
                    producto.nombre
                )}"
            >
        `;

    } else {

        vistaPrevia.innerHTML = `
            <span>🍔</span>
        `;

    }


    modal.classList.add("show");
}


// =====================================================
// CERRAR MODAL
// =====================================================

function cerrarProductoModal() {

    if (modal) {

        modal.classList.remove(
            "show"
        );

    }


    if (formulario) {

        formulario.reset();

    }


    productoEditando =
        null;


    if (mensaje) {

        mensaje.textContent =
            "";

        mensaje.style.color =
            "";

    }


    if (modalTitulo) {

        modalTitulo.textContent =
            "Nuevo producto";

    }


    if (vistaPrevia) {

        vistaPrevia.innerHTML = `
            <span>🍔</span>
        `;

    }

}


// =====================================================
// EVENTOS DEL MODAL
// =====================================================

if (abrirFormulario) {

    abrirFormulario.addEventListener(
        "click",
        abrirNuevoProducto
    );

}


if (abrirFormularioEmpty) {

    abrirFormularioEmpty.addEventListener(
        "click",
        abrirNuevoProducto
    );

}


if (cerrarModal) {

    cerrarModal.addEventListener(
        "click",
        cerrarProductoModal
    );

}


if (cancelarModal) {

    cancelarModal.addEventListener(
        "click",
        cerrarProductoModal
    );

}


const modalOverlay =
    document.querySelector(
        ".modal-overlay"
    );


if (modalOverlay) {

    modalOverlay.addEventListener(
        "click",
        cerrarProductoModal
    );

}


// =====================================================
// URL DE IMAGEN
// =====================================================

function crearURLImagen(
    imagen
) {

    if (!imagen) {

        return "";

    }


    if (
        imagen.startsWith(
            "http://"
        ) ||
        imagen.startsWith(
            "https://"
        )
    ) {

        return imagen;

    }


    if (
        imagen.startsWith("/")
    ) {

        return imagen;

    }


    return (
        "/" +
        imagen
    );

}


// =====================================================
// CARGAR CATEGORÍAS
// =====================================================

async function cargarCategorias(
    categoriaSeleccionada = ""
) {

    try {

        console.log(
            "Cargando categorías..."
        );


        const respuesta =
            await fetch(
                API_CATEGORIAS
            );


        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );

        }


        const datos =
            await respuesta.json();


        if (
            !Array.isArray(
                datos
            )
        ) {

            throw new Error(
                "La API de categorías no devolvió una lista."
            );

        }


        categorias =
            datos;


        if (!categoriaSelect) {

            return;

        }


        categoriaSelect.innerHTML = `
            <option value="">
                Seleccioná una categoría
            </option>
        `;


        categorias
            .filter(
                categoria =>
                    categoria.activa === true
            )
            .forEach(
                categoria => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        categoria.id;


                    option.textContent =
                        categoria.nombre;


                    categoriaSelect.appendChild(
                        option
                    );

                }
            );


        if (
            categoriaSeleccionada
        ) {

            categoriaSelect.value =
                String(
                    categoriaSeleccionada
                );

        }


        actualizarEstadisticas();


    } catch (error) {

        console.error(
            "ERROR CATEGORIAS:",
            error
        );


        if (categoriaSelect) {

            categoriaSelect.innerHTML = `
                <option value="">
                    No se pudieron cargar las categorías
                </option>
            `;

        }

    }

}


// =====================================================
// VISTA PREVIA DE IMAGEN
// =====================================================

if (imagenInput) {

    imagenInput.addEventListener(
        "change",
        () => {

            const archivo =
                imagenInput.files[0];


            if (!archivo) {

                return;

            }


            const tiposPermitidos = [

                "image/jpeg",

                "image/png",

                "image/webp"

            ];


            if (
                !tiposPermitidos.includes(
                    archivo.type
                )
            ) {

                mensaje.style.color =
                    "#dc2626";


                mensaje.textContent =
                    "❌ Solo JPG, PNG o WebP.";


                imagenInput.value =
                    "";


                return;

            }


            const maximo =
                5 * 1024 * 1024;


            if (
                archivo.size >
                maximo
            ) {

                mensaje.style.color =
                    "#dc2626";


                mensaje.textContent =
                    "❌ La imagen supera los 5 MB.";


                imagenInput.value =
                    "";


                return;

            }


            const lector =
                new FileReader();


            lector.onload =
                evento => {

                    vistaPrevia.innerHTML = `
                        <img
                            src="${evento.target.result}"
                            alt="Vista previa"
                        >
                    `;

                };


            lector.readAsDataURL(
                archivo
            );

        }
    );

}


// =====================================================
// CARGAR PRODUCTOS
// =====================================================

async function cargarProductos() {

    try {

        console.log(
            "Cargando productos desde:",
            API_PRODUCTOS
        );


        const respuesta =
            await fetch(
                API_PRODUCTOS,
                {
                    method:
                        "GET",

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        console.log(
            "HTTP productos:",
            respuesta.status
        );


        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );

        }


        const datos =
            await respuesta.json();


        console.log(
            "Productos recibidos:",
            datos
        );


        if (
            !Array.isArray(
                datos
            )
        ) {

            throw new Error(
                "La API no devolvió un array."
            );

        }


        productos =
            datos;


        actualizarEstadisticas();

        mostrarProductos();


    } catch (error) {

        console.error(
            "ERROR PRODUCTOS:",
            error
        );


        listaProductos.innerHTML = `

            <div
                style="
                    width:100%;
                    padding:40px;
                    text-align:center;
                    background:white;
                    border-radius:12px;
                "
            >

                <div
                    style="
                        font-size:40px;
                        margin-bottom:10px;
                    "
                >
                    ⚠️
                </div>


                <h3>
                    Error al cargar productos
                </h3>


                <p>
                    ${escaparHTML(
                        error.message
                    )}
                </p>


                <button
                    type="button"
                    onclick="cargarProductos()"
                    style="
                        margin-top:15px;
                        padding:10px 16px;
                        border:none;
                        border-radius:8px;
                        background:#f97316;
                        color:white;
                        cursor:pointer;
                    "
                >
                    🔄 Reintentar
                </button>

            </div>

        `;

    }

}


// =====================================================
// ESTADÍSTICAS
// =====================================================

function actualizarEstadisticas() {

    const disponibles =
        productos.filter(
            producto =>
                producto.disponible === true
        ).length;


    const agotados =
        productos.filter(
            producto =>
                producto.disponible === false
        ).length;


    const totalProductos =
        document.getElementById(
            "totalProductos"
        );


    const productosDisponibles =
        document.getElementById(
            "productosDisponibles"
        );


    const productosAgotados =
        document.getElementById(
            "productosAgotados"
        );


    const totalCategorias =
        document.getElementById(
            "totalCategorias"
        );


    if (totalProductos) {

        totalProductos.textContent =
            productos.length;

    }


    if (productosDisponibles) {

        productosDisponibles.textContent =
            disponibles;

    }


    if (productosAgotados) {

        productosAgotados.textContent =
            agotados;

    }


    if (totalCategorias) {

        totalCategorias.textContent =
            categorias.length;

    }

}


// =====================================================
// MOSTRAR PRODUCTOS
// =====================================================

function mostrarProductos() {

    console.log(
        "Mostrando productos:",
        productos.length
    );


    const busqueda =
        buscarProducto
            ? buscarProducto.value
                .toLowerCase()
                .trim()
            : "";


    const filtro =
        filtroEstado
            ? filtroEstado.value
            : "todos";


    const filtrados =
        productos.filter(
            producto => {

                const nombre =
                    String(
                        producto.nombre ||
                        ""
                    ).toLowerCase();


                const coincideNombre =
                    nombre.includes(
                        busqueda
                    );


                let coincideEstado =
                    true;


                if (
                    filtro ===
                    "disponibles"
                ) {

                    coincideEstado =
                        producto.disponible ===
                        true;

                }


                if (
                    filtro ===
                    "agotados"
                ) {

                    coincideEstado =
                        producto.disponible ===
                        false;

                }


                return (
                    coincideNombre &&
                    coincideEstado
                );

            }
        );


    listaProductos.innerHTML =
        "";


    const emptyState =
        document.getElementById(
            "emptyState"
        );


    if (
        filtrados.length === 0
    ) {

        listaProductos.style.display =
            "none";


        if (emptyState) {

            emptyState.style.display =
                "block";

        }


        return;

    }


    listaProductos.style.display =
        "grid";


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    filtrados.forEach(
        producto => {

            const tarjeta =
                document.createElement(
                    "article"
                );


            tarjeta.className =
                "product-card";


            // =========================================
            // IMAGEN
            // =========================================

            let imagenHTML = `

                <div class="no-image">
                    🍔
                </div>

            `;


            if (
                producto.imagen
            ) {

                imagenHTML = `

                    <img
                        src="${crearURLImagen(
                            producto.imagen
                        )}"
                        alt="${escaparHTML(
                            producto.nombre
                        )}"
                        onerror="mostrarImagenFallback(this)"
                    >

                `;

            }


            // =========================================
            // TARJETA
            // =========================================

            tarjeta.innerHTML = `

                <div class="product-image">

                    ${imagenHTML}

                </div>


                <div class="product-info">


                    <div class="product-top">

                        <div>


                            <div
                                class="product-name"
                            >

                                ${escaparHTML(
                                    producto.nombre
                                )}

                            </div>


                            <span
                                class="product-category"
                            >

                                ${escaparHTML(
                                    producto.categoria ||
                                    "Sin categoría"
                                )}

                            </span>


                        </div>


                    </div>


                    <p
                        class="product-description"
                    >

                        ${escaparHTML(
                            producto.descripcion ||
                            "Sin descripción"
                        )}

                    </p>


                    <div
                        class="product-bottom"
                    >


                        <div
                            class="product-price"
                        >

                            $
                            ${Number(
                                producto.precio ||
                                0
                            ).toLocaleString(
                                "es-UY"
                            )}

                        </div>


                        <span
                            class="
                                product-status
                                ${
                                    producto.disponible
                                        ? "status-active"
                                        : "status-off"
                                }
                            "
                        >

                            ${
                                producto.disponible
                                    ? "Disponible"
                                    : "Agotado"
                            }

                        </span>


                    </div>


                    <div
                        class="product-actions"
                    >


                        <button
                            type="button"
                            class="edit-product-btn"
                        >

                            ✏️ Editar

                        </button>


                        <button
                            type="button"
                            class="
                                toggle-product-btn
                                ${
                                    producto.disponible
                                        ? "disable-btn"
                                        : "enable-btn"
                                }
                            "
                        >

                            ${
                                producto.disponible
                                    ? "⛔ Agotar"
                                    : "✅ Activar"
                            }

                        </button>


                        <button
                            type="button"
                            class="delete-product-btn"
                        >

                            🗑️ Eliminar

                        </button>


                    </div>


                </div>

            `;


            // =========================================
            // EDITAR
            // =========================================

            tarjeta
                .querySelector(
                    ".edit-product-btn"
                )
                .addEventListener(
                    "click",
                    () => {

                        abrirEditarProducto(
                            producto
                        );

                    }
                );


            // =========================================
            // DISPONIBILIDAD
            // =========================================

            tarjeta
                .querySelector(
                    ".toggle-product-btn"
                )
                .addEventListener(
                    "click",
                    () => {

                        cambiarDisponibilidad(
                            producto
                        );

                    }
                );


            // =========================================
            // ELIMINAR
            // =========================================

            tarjeta
                .querySelector(
                    ".delete-product-btn"
                )
                .addEventListener(
                    "click",
                    () => {

                        eliminarProducto(
                            producto
                        );

                    }
                );


            listaProductos.appendChild(
                tarjeta
            );

        }
    );

}


// =====================================================
// FALLBACK DE IMAGEN
// =====================================================

function mostrarImagenFallback(
    imagen
) {

    if (!imagen) {
        return;
    }


    imagen.style.display =
        "none";


    imagen.parentElement.innerHTML = `

        <div class="no-image">
            🍔
        </div>

    `;

}


// =====================================================
// CAMBIAR DISPONIBILIDAD
// =====================================================

async function cambiarDisponibilidad(
    producto
) {

    try {

        const respuesta =
            await fetch(
                `${API_PRODUCTOS}/${producto.id}/disponibilidad`,
                {

                    method:
                        "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            disponible:
                                !producto.disponible

                        })

                }
            );


        const resultado =
            await respuesta.json();


        if (!respuesta.ok) {

            throw new Error(
                resultado.error ||
                "No se pudo cambiar el estado."
            );

        }


        await cargarProductos();


    } catch (error) {

        console.error(
            "ERROR DISPONIBILIDAD:",
            error
        );


        alert(
            "❌ " +
            error.message
        );

    }

}


// =====================================================
// ELIMINAR PRODUCTO
// =====================================================

async function eliminarProducto(
    producto
) {

    const confirmar =
        confirm(
            `¿Querés eliminar "${producto.nombre}"?\n\n` +
            `También se eliminará su imagen.`
        );


    if (!confirmar) {

        return;

    }


    try {

        const respuesta =
            await fetch(
                `${API_PRODUCTOS}/${producto.id}`,
                {

                    method:
                        "DELETE",

                    headers: {

                        "Accept":
                            "application/json"

                    }

                }
            );


        const resultado =
            await respuesta.json();


        if (!respuesta.ok) {

            throw new Error(
                resultado.error ||
                "No se pudo eliminar el producto."
            );

        }


        await cargarProductos();


    } catch (error) {

        console.error(
            "ERROR ELIMINANDO:",
            error
        );


        alert(
            "❌ " +
            error.message
        );

    }

}


// =====================================================
// CREAR / EDITAR PRODUCTO
// =====================================================

if (formulario) {

    formulario.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const nombre =
                document
                    .getElementById(
                        "nombre"
                    )
                    .value
                    .trim();


            const descripcion =
                document
                    .getElementById(
                        "descripcion"
                    )
                    .value
                    .trim();


            const precio =
                document
                    .getElementById(
                        "precio"
                    )
                    .value;


            const categoria =
                document
                    .getElementById(
                        "categoria"
                    )
                    .value;


            const archivo =
                imagenInput.files[0];


            // ======================================
            // VALIDAR NOMBRE
            // ======================================

            if (!nombre) {

                mensaje.style.color =
                    "#dc2626";


                mensaje.textContent =
                    "❌ El nombre es obligatorio.";


                return;

            }


            // ======================================
            // VALIDAR PRECIO
            // ======================================

            if (
                !precio ||
                Number(precio) <= 0
            ) {

                mensaje.style.color =
                    "#dc2626";


                mensaje.textContent =
                    "❌ Ingresá un precio válido.";


                return;

            }


            // ======================================
            // VALIDAR CATEGORÍA
            // ======================================

            if (!categoria) {

                mensaje.style.color =
                    "#dc2626";


                mensaje.textContent =
                    "❌ Seleccioná una categoría.";


                return;

            }


            // ======================================
            // FORMDATA
            // ======================================

            const datos =
                new FormData();


            datos.append(
                "categoria_id",
                categoria
            );


            datos.append(
                "nombre",
                nombre
            );


            datos.append(
                "descripcion",
                descripcion
            );


            datos.append(
                "precio",
                precio
            );


            // Solo mandar imagen
            // si el usuario seleccionó una

            if (archivo) {

                datos.append(
                    "imagen",
                    archivo
                );

            }


            try {

                mensaje.style.color =
                    "#777";


                mensaje.textContent =
                    productoEditando
                        ? "⏳ Actualizando producto..."
                        : "⏳ Guardando producto...";


                let url =
                    API_PRODUCTOS;


                let metodo =
                    "POST";


                // ==================================
                // EDICIÓN
                // ==================================

                if (
                    productoEditando
                ) {

                    url =
                        `${API_PRODUCTOS}/${productoEditando.id}`;

                    metodo =
                        "PUT";

                }


                const respuesta =
                    await fetch(
                        url,
                        {

                            method:
                                metodo,

                            body:
                                datos

                        }
                    );


                const resultado =
                    await respuesta.json();


                if (!respuesta.ok) {

                    throw new Error(
                        resultado.error ||
                        "No se pudo guardar el producto."
                    );

                }


                mensaje.style.color =
                    "#16a34a";


                mensaje.textContent =
                    productoEditando
                        ? "✅ Producto actualizado correctamente."
                        : "✅ Producto creado correctamente.";


                await cargarProductos();

                await cargarCategorias();


                setTimeout(
                    () => {

                        cerrarProductoModal();

                    },
                    800
                );


            } catch (error) {

                console.error(
                    "ERROR GUARDANDO:",
                    error
                );


                mensaje.style.color =
                    "#dc2626";


                mensaje.textContent =
                    "❌ " +
                    error.message;

            }

        }
    );

}


// =====================================================
// BUSCADOR
// =====================================================

if (buscarProducto) {

    buscarProducto.addEventListener(
        "input",
        mostrarProductos
    );

}


// =====================================================
// FILTRO
// =====================================================

if (filtroEstado) {

    filtroEstado.addEventListener(
        "change",
        mostrarProductos
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
// INICIAR
// =====================================================

async function iniciar() {

    console.log(
        "🔥 Iniciando panel de productos..."
    );


    // Primero productos
    await cargarProductos();


    // Después categorías
    await cargarCategorias();


    actualizarEstadisticas();


    console.log(
        "✅ Panel de productos iniciado."
    );

}


iniciar();