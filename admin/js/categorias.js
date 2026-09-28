const API_URL = "/api/categorias";


let categorias = [];

let categoriaEditando = null;


// =====================================================
// ELEMENTOS
// =====================================================

const contenedor =
    document.getElementById(
        "categorias"
    );

const modal =
    document.getElementById(
        "modalCategoria"
    );

const formulario =
    document.getElementById(
        "categoriaForm"
    );

const nombreInput =
    document.getElementById(
        "nombreCategoria"
    );

const mensaje =
    document.getElementById(
        "mensajeCategoria"
    );

const modalTitulo =
    document.getElementById(
        "modalTitulo"
    );


// =====================================================
// ABRIR NUEVA
// =====================================================

document
    .getElementById(
        "nuevaCategoria"
    )
    .addEventListener(
        "click",
        () => {

            categoriaEditando =
                null;

            modalTitulo.textContent =
                "Nueva categoría";

            nombreInput.value =
                "";

            mensaje.textContent =
                "";

            modal.classList.add(
                "show"
            );

        }
    );


// =====================================================
// CERRAR
// =====================================================

function cerrarModal() {

    modal.classList.remove(
        "show"
    );

    categoriaEditando =
        null;

}


document
    .getElementById(
        "cerrarModal"
    )
    .addEventListener(
        "click",
        cerrarModal
    );


document
    .getElementById(
        "cancelarCategoria"
    )
    .addEventListener(
        "click",
        cerrarModal
    );


document
    .querySelector(
        "#modalCategoria .modal-overlay"
    )
    .addEventListener(
        "click",
        cerrarModal
    );


// =====================================================
// CARGAR
// =====================================================

async function cargarCategorias() {

    try {

        const respuesta =
            await fetch(
                API_URL
            );


        if (!respuesta.ok) {

            throw new Error(
                "No se pudieron cargar las categorías."
            );

        }


        categorias =
            await respuesta.json();


        mostrarCategorias();


    } catch (error) {

        console.error(
            error
        );


        contenedor.innerHTML = `

            <div class="category-empty">

                ❌
                Error al cargar las categorías.

            </div>

        `;

    }

}


// =====================================================
// MOSTRAR
// =====================================================

function mostrarCategorias() {

    contenedor.innerHTML = "";


    if (
        categorias.length === 0
    ) {

        contenedor.innerHTML = `

            <div class="category-empty">

                <div style="font-size:45px;">
                    📁
                </div>

                <strong>
                    No hay categorías
                </strong>

                <p>
                    Creá la primera categoría.
                </p>

            </div>

        `;

        return;

    }


    categorias.forEach(
        categoria => {

            const tarjeta =
                document.createElement(
                    "article"
                );


            tarjeta.className =
                "category-card";


            tarjeta.innerHTML = `

                <div class="category-header">

                    <div class="category-icon">
                        📁
                    </div>


                    <span
                        class="
                            category-status
                            ${
                                categoria.activa
                                    ? "category-active"
                                    : "category-inactive"
                            }
                        "
                    >

                        ${
                            categoria.activa
                                ? "Activa"
                                : "Oculta"
                        }

                    </span>

                </div>


                <div class="category-name">

                    ${escaparHTML(
                        categoria.nombre
                    )}

                </div>


                <div class="category-count">

                    ${categoria.productos}
                    ${
                        categoria.productos === 1
                            ? "producto"
                            : "productos"
                    }

                </div>


                <div class="category-actions">


                    <button
                        type="button"
                        class="category-edit"
                    >
                        ✏️ Editar
                    </button>


                    <button
                        type="button"
                        class="category-toggle"
                    >

                        ${
                            categoria.activa
                                ? "👁 Ocultar"
                                : "✅ Activar"
                        }

                    </button>


                    <button
                        type="button"
                        class="category-delete"
                    >
                        🗑️ Eliminar
                    </button>


                </div>

            `;


            // EDITAR

            tarjeta
                .querySelector(
                    ".category-edit"
                )
                .addEventListener(
                    "click",
                    () => {

                        categoriaEditando =
                            categoria;


                        modalTitulo.textContent =
                            "Editar categoría";


                        nombreInput.value =
                            categoria.nombre;


                        mensaje.textContent =
                            "";


                        modal.classList.add(
                            "show"
                        );

                    }
                );


            // ACTIVAR / OCULTAR

            tarjeta
                .querySelector(
                    ".category-toggle"
                )
                .addEventListener(
                    "click",
                    () => {

                        cambiarEstado(
                            categoria
                        );

                    }
                );


            // ELIMINAR

            tarjeta
                .querySelector(
                    ".category-delete"
                )
                .addEventListener(
                    "click",
                    () => {

                        eliminarCategoria(
                            categoria
                        );

                    }
                );


            contenedor.appendChild(
                tarjeta
            );

        }
    );

}


// =====================================================
// CREAR / EDITAR
// =====================================================

formulario.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const nombre =
            nombreInput.value.trim();


        if (!nombre) {

            mensaje.style.color =
                "#dc2626";

            mensaje.textContent =
                "❌ Ingresá un nombre.";

            return;

        }


        try {

            let url =
                API_URL;

            let metodo =
                "POST";


            if (
                categoriaEditando
            ) {

                url =
                    `${API_URL}/${categoriaEditando.id}`;

                metodo =
                    "PUT";

            }


            const respuesta =
                await fetch(
                    url,
                    {

                        method:
                            metodo,

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({
                                nombre
                            })

                    }
                );


            const resultado =
                await respuesta.json();


            if (!respuesta.ok) {

                throw new Error(
                    resultado.error ||
                    "No se pudo guardar."
                );

            }


            mensaje.style.color =
                "#16a34a";


            mensaje.textContent =
                categoriaEditando
                    ? "✅ Categoría actualizada."
                    : "✅ Categoría creada.";


            await cargarCategorias();


            setTimeout(
                cerrarModal,
                700
            );


        } catch (error) {

            console.error(
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


// =====================================================
// CAMBIAR ESTADO
// =====================================================

async function cambiarEstado(
    categoria
) {

    try {

        const respuesta =
            await fetch(
                `${API_URL}/${categoria.id}/estado`,
                {

                    method:
                        "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            activa:
                                !categoria.activa

                        })

                }
            );


        const resultado =
            await respuesta.json();


        if (!respuesta.ok) {

            throw new Error(
                resultado.error
            );

        }


        await cargarCategorias();


    } catch (error) {

        alert(
            "❌ " +
            error.message
        );

    }

}


// =====================================================
// ELIMINAR
// =====================================================

async function eliminarCategoria(
    categoria
) {

    const confirmar =
        confirm(
            `¿Eliminar "${categoria.nombre}"?`
        );


    if (!confirmar) {
        return;
    }


    try {

        const respuesta =
            await fetch(
                `${API_URL}/${categoria.id}`,
                {
                    method:
                        "DELETE"
                }
            );


        const resultado =
            await respuesta.json();


        if (!respuesta.ok) {

            throw new Error(
                resultado.error
            );

        }


        await cargarCategorias();


    } catch (error) {

        alert(
            "❌ " +
            error.message
        );

    }

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

cargarCategorias();