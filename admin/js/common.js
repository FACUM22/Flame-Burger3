// =====================================================
// FLAME BURGER — PANEL ADMIN
// Script común a todas las páginas:
//   1) Sonido cuando entra un pedido nuevo
//   2) Interruptor de Abierto/Cerrado en el sidebar
//   3) Menú móvil (abrir/cerrar sidebar en celular)
// =====================================================

(function () {

    const API_CONFIGURACION = "/api/configuracion";
    const API_PEDIDOS = "/api/pedidos";

    const LS_ULTIMO_ID = "flameAdminUltimoPedidoId";


    // =================================================
    // SONIDO DE AVISO (generado con Web Audio, sin
    // archivos externos)
    // =================================================

    let audioCtx = null;

    function obtenerAudioCtx() {

        if (!audioCtx) {

            const Contexto =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!Contexto) return null;

            audioCtx = new Contexto();

        }

        return audioCtx;
    }

    function reproducirSonidoAviso() {

        try {

            const ctx = obtenerAudioCtx();

            if (!ctx) return;

            // Dos tonos cortos, tipo "campanita"
            [
                { retraso: 0, frecuencia: 880 },
                { retraso: 0.18, frecuencia: 1046.5 }
            ].forEach(({ retraso, frecuencia }) => {

                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = "sine";
                osc.frequency.value = frecuencia;

                const inicio = ctx.currentTime + retraso;

                gain.gain.setValueAtTime(0.0001, inicio);

                gain.gain.exponentialRampToValueAtTime(
                    0.3,
                    inicio + 0.02
                );

                gain.gain.exponentialRampToValueAtTime(
                    0.0001,
                    inicio + 0.35
                );

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(inicio);
                osc.stop(inicio + 0.4);

            });

        } catch (error) {

            console.error(
                "No se pudo reproducir el sonido de aviso:",
                error
            );

        }

    }

    // Muchos navegadores bloquean el audio hasta que hay una
    // interacción del usuario. Preparamos el contexto en el
    // primer click en cualquier parte del panel.
    document.addEventListener(
        "click",
        () => { obtenerAudioCtx(); },
        { once: true }
    );


    // =================================================
    // DETECTAR PEDIDOS NUEVOS Y SONAR
    // =================================================

    async function revisarPedidosNuevos() {

        try {

            const respuesta = await fetch(API_PEDIDOS);

            if (!respuesta.ok) return;

            const pedidos = await respuesta.json();

            const nuevos = pedidos.filter(
                (pedido) => pedido.estado === "nuevo"
            );

            if (nuevos.length === 0) return;

            const idMaximoActual = Math.max(
                ...nuevos.map((pedido) => pedido.id)
            );

            const ultimoVisto = Number(
                localStorage.getItem(LS_ULTIMO_ID) || 0
            );

            // Primera vez que este navegador revisa: guardamos
            // el máximo actual sin sonar, para no alertar por
            // pedidos que ya estaban ahí.
            if (ultimoVisto === 0) {

                localStorage.setItem(
                    LS_ULTIMO_ID,
                    String(idMaximoActual)
                );

                return;
            }

            if (idMaximoActual > ultimoVisto) {

                reproducirSonidoAviso();

                localStorage.setItem(
                    LS_ULTIMO_ID,
                    String(idMaximoActual)
                );

            }

        } catch (error) {

            console.error(
                "Error revisando pedidos nuevos:",
                error
            );

        }

    }

    setInterval(revisarPedidosNuevos, 8000);
    revisarPedidosNuevos();


    // =================================================
    // ESTADO DEL LOCAL EN EL SIDEBAR (ABIERTO / CERRADO)
    // =================================================

    function pintarEstadoLocal(contenedor, abierto) {

        contenedor.classList.toggle("cerrado", !abierto);

        const titulo = contenedor.querySelector("strong");
        const subtitulo = contenedor.querySelector("small");

        if (titulo) {

            titulo.textContent =
                abierto ? "Local abierto" : "Local cerrado";

        }

        if (subtitulo) {

            subtitulo.textContent =
                abierto
                    ? "Recibiendo pedidos · click para cerrar"
                    : "No se aceptan pedidos · click para abrir";

        }

    }

    async function cargarEstadoLocal(contenedor) {

        try {

            const respuesta = await fetch(API_CONFIGURACION);

            if (!respuesta.ok) return;

            const config = await respuesta.json();

            pintarEstadoLocal(
                contenedor,
                config.abierto === true
            );

        } catch (error) {

            console.error(
                "Error cargando estado del local:",
                error
            );

        }

    }

    async function alternarEstadoLocal(contenedor) {

        const estaAbierto =
            !contenedor.classList.contains("cerrado");

        const confirmacion = confirm(
            estaAbierto
                ? "¿Cerrar el local? No se van a poder hacer más pedidos hasta que lo vuelvas a abrir."
                : "¿Abrir el local para volver a recibir pedidos?"
        );

        if (!confirmacion) return;

        try {

            const respuesta = await fetch(
                `${API_CONFIGURACION}/estado`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        abierto: !estaAbierto
                    })
                }
            );

            if (!respuesta.ok) {

                const datos = await respuesta
                    .json()
                    .catch(() => ({}));

                throw new Error(
                    datos.error ||
                    "No se pudo cambiar el estado del local."
                );

            }

            const datos = await respuesta.json();

            pintarEstadoLocal(
                contenedor,
                datos.configuracion.abierto === true
            );

        } catch (error) {

            console.error(error);

            alert(
                error.message ||
                "No se pudo cambiar el estado del local."
            );

        }

    }

    document.addEventListener("DOMContentLoaded", () => {

        const contenedor =
            document.querySelector(".store-status");

        if (!contenedor) return;

        contenedor.style.cursor = "pointer";

        contenedor.title =
            "Click para abrir/cerrar el local";

        contenedor.addEventListener(
            "click",
            () => alternarEstadoLocal(contenedor)
        );

        cargarEstadoLocal(contenedor);

    });


    // =================================================
    // MENÚ MÓVIL (BOTÓN ☰ PARA ABRIR/CERRAR EL SIDEBAR)
    // =================================================

    document.addEventListener("DOMContentLoaded", () => {

        const botonMenu =
            document.querySelector(".mobile-menu");

        const sidebar =
            document.querySelector(".sidebar");

        if (!botonMenu || !sidebar) return;

        // Creamos el fondo oscuro que aparece detrás del
        // menú y permite cerrarlo tocando afuera.
        let overlay =
            document.querySelector(".sidebar-overlay");

        if (!overlay) {

            overlay =
                document.createElement("div");

            overlay.className =
                "sidebar-overlay";

            document.body.appendChild(overlay);

        }

        function abrirMenu() {

            sidebar.classList.add("open");

            overlay.classList.add("show");

        }

        function cerrarMenu() {

            sidebar.classList.remove("open");

            overlay.classList.remove("show");

        }

        botonMenu.addEventListener(
            "click",
            () => {

                if (sidebar.classList.contains("open")) {

                    cerrarMenu();

                } else {

                    abrirMenu();

                }

            }
        );

        overlay.addEventListener(
            "click",
            cerrarMenu
        );

        // Si el usuario toca un link del menú, lo cerramos
        // (si no, quedaría abierto tapando la página nueva).
        sidebar.querySelectorAll("a").forEach(
            (link) => {

                link.addEventListener(
                    "click",
                    cerrarMenu
                );

            }
        );

    });

})();
