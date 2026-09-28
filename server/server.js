const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config();



const pool = require("./database");

const productosRoutes = require("./routes/productos");
const pedidosRoutes = require("./routes/pedidos");
const dashboardRoutes = require("./routes/dashboard");
const ventasRoutes = require("./routes/ventas");
const categoriasRoutes = require("./routes/categorias");
const pagosRoutes = require("./routes/pagos");
const configuracionRoutes = require("./routes/configuracion");

const app = express();


// =====================================================
// CONFIGURACIÓN
// =====================================================

app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);


// =====================================================
// RUTAS DE CARPETAS
// =====================================================

const frontendPath =
    path.join(__dirname, "../frontend");

const adminPath =
    path.join(__dirname, "../admin");

const uploadsPath =
    path.join(__dirname, "uploads");


// =====================================================
// ARCHIVOS ESTÁTICOS
// =====================================================

// Web pública
app.use(
    express.static(frontendPath)
);


// Panel administrativo
app.use(
    "/admin",
    express.static(adminPath)
);


// Imágenes de productos
app.use(
    "/uploads",
    express.static(uploadsPath)
);


// =====================================================
// API
// =====================================================

// Productos
app.use(
    "/api/productos",
    productosRoutes
);


// Pedidos
app.use(
    "/api/pedidos",
    pedidosRoutes
);


// Dashboard
app.use(
    "/api/dashboard",
    dashboardRoutes
);


// Ventas
app.use(
    "/api/ventas",
    ventasRoutes
);


// Categorías
app.use(
    "/api/categorias",
    categoriasRoutes
);
app.use(
    "/api/pagos",
    pagosRoutes
);
app.use(
    "/api/configuracion",
    configuracionRoutes
);


// =====================================================
// WEB PÚBLICA
// =====================================================

// Inicio
app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            frontendPath,
            "index.html"
        )
    );

});


// Checkout
app.get("/checkout.html", (req, res) => {

    res.sendFile(
        path.join(
            frontendPath,
            "checkout.html"
        )
    );

});


// =====================================================
// PANEL ADMIN
// =====================================================

// Dashboard
app.get(
    "/admin/dashboard.html",
    (req, res) => {

        res.sendFile(
            path.join(
                adminPath,
                "dashboard.html"
            )
        );

    }
);


// Productos
app.get(
    "/admin/productos.html",
    (req, res) => {

        res.sendFile(
            path.join(
                adminPath,
                "productos.html"
            )
        );

    }
);


// Pedidos
app.get(
    "/admin/pedidos.html",
    (req, res) => {

        res.sendFile(
            path.join(
                adminPath,
                "pedidos.html"
            )
        );

    }
);


// Ventas
app.get(
    "/admin/ventas.html",
    (req, res) => {

        res.sendFile(
            path.join(
                adminPath,
                "ventas.html"
            )
        );

    }
);


// Categorías
app.get(
    "/admin/categorias.html",
    (req, res) => {

        res.sendFile(
            path.join(
                adminPath,
                "categorias.html"
            )
        );

    }
);


// Configuración
app.get(
    "/admin/configuracion.html",
    (req, res) => {

        res.sendFile(
            path.join(
                adminPath,
                "configuracion.html"
            )
        );

    }
);


// =====================================================
// PRUEBA DEL SERVIDOR
// =====================================================

app.get(
    "/api/test",
    (req, res) => {

        res.json({
            servidor: true,
            mensaje:
                "🔥 Flame Burger API funcionando correctamente"
        });

    }
);


// =====================================================
// PRUEBA DE POSTGRESQL
// =====================================================

app.get(
    "/api/test-db",
    async (req, res) => {

        try {

            const resultado =
                await pool.query(
                    "SELECT NOW()"
                );


            res.json({

                conectado: true,

                mensaje:
                    "🔥 PostgreSQL conectado correctamente",

                fecha:
                    resultado.rows[0].now

            });


        } catch (error) {

            console.error(
                "Error PostgreSQL:",
                error
            );


            res.status(500).json({

                conectado: false,

                mensaje:
                    "❌ Error al conectar con PostgreSQL",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// RUTA 404
// =====================================================

app.use(
    (req, res) => {

        if (
            req.originalUrl.startsWith(
                "/api/"
            )
        ) {

            return res.status(404).json({

                error:
                    "Ruta API no encontrada",

                ruta:
                    req.originalUrl

            });

        }


        res.status(404).send(`

            <!DOCTYPE html>

            <html lang="es">

            <head>

                <meta charset="UTF-8">

                <title>
                    Flame Burger - 404
                </title>

                <style>

                    body {
                        margin: 0;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: #111;
                        color: white;
                        font-family: Arial, sans-serif;
                        text-align: center;
                    }

                    .box {
                        padding: 40px;
                    }

                    h1 {
                        color: #f97316;
                        font-size: 60px;
                        margin: 0;
                    }

                    p {
                        color: #aaa;
                    }

                </style>

            </head>

            <body>

                <div class="box">

                    <h1>
                        404
                    </h1>

                    <h2>
                        Página no encontrada
                    </h2>

                    <p>
                        Flame Burger
                    </p>

                </div>

            </body>

            </html>

        `);

    }
);


// =====================================================
// MANEJO DE ERRORES
// =====================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "ERROR DEL SERVIDOR:"
        );

        console.error(error);


        // Errores de Multer
        if (
            error.name === "MulterError"
        ) {

            return res.status(400).json({

                error:
                    "Error al subir la imagen",

                detalle:
                    error.message

            });

        }


        // Error de archivo inválido
        if (
            error.message &&
            error.message.includes(
                "Solo se permiten imágenes"
            )
        ) {

            return res.status(400).json({

                error:
                    error.message

            });

        }


        res.status(500).json({

            error:
                "Error interno del servidor",

            detalle:
                error.message

        });

    }
);


// =====================================================
// PUERTO
// =====================================================

const PORT =
    process.env.PORT || 3000;


// =====================================================
// INICIAR SERVIDOR
// =====================================================

app.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "=========================================="
        );

        console.log(
            "        🔥 FLAME BURGER SERVER"
        );

        console.log(
            "=========================================="
        );

        console.log("");

        console.log(
            `🌐 Web:       http://localhost:${PORT}/`
        );

        console.log(
            `🛒 Checkout:  http://localhost:${PORT}/checkout.html`
        );

        console.log(
            `📊 Dashboard: http://localhost:${PORT}/admin/dashboard.html`
        );

        console.log(
            `🍔 Productos: http://localhost:${PORT}/admin/productos.html`
        );

        console.log(
            `📦 Pedidos:   http://localhost:${PORT}/admin/pedidos.html`
        );

        console.log(
            `💰 Ventas:    http://localhost:${PORT}/admin/ventas.html`
        );

        console.log(
            `📁 Categorías:http://localhost:${PORT}/admin/categorias.html`
        );

        console.log("");

        console.log(
            `🔌 API:       http://localhost:${PORT}/api`
        );

        console.log(
            "🗄️ Base:      PostgreSQL"
        );

        console.log("");

        console.log(
            "=========================================="
        );

        console.log("");

    }
);