const express = require("express");

const router = express.Router();

const pool = require("../database");


// =====================================================
// POST /api/pagos/crear
// =====================================================

router.post("/crear", async (req, res) => {

    try {

        const { pedidoId } = req.body;

        const id = Number(pedidoId);


        // VALIDAR ID

        if (!Number.isInteger(id) || id <= 0) {

            return res.status(400).json({
                error: "El ID del pedido no es válido."
            });

        }


        // ACCESS TOKEN

        const accessToken =
            process.env.MP_ACCESS_TOKEN;


        if (!accessToken) {

            console.error(
                "❌ Falta MP_ACCESS_TOKEN en .env"
            );

            return res.status(500).json({
                error:
                    "Mercado Pago no está configurado en el servidor."
            });

        }


        // =====================================================
        // BUSCAR PEDIDO
        // =====================================================

        const pedidoResultado =
            await pool.query(
                `
                SELECT
                    p.id,
                    p.total,
                    p.estado,
                    p.forma_pago,
                    c.nombre AS cliente_nombre,
                    c.telefono,
                    c.direccion
                FROM pedidos p
                LEFT JOIN clientes c
                    ON c.id = p.cliente_id
                WHERE p.id = $1
                LIMIT 1
                `,
                [id]
            );


        if (pedidoResultado.rows.length === 0) {

            return res.status(404).json({
                error: "El pedido no existe."
            });

        }


        const pedido =
            pedidoResultado.rows[0];


        // =====================================================
        // COMPROBAR FORMA DE PAGO
        // =====================================================

        if (
            pedido.forma_pago !== "mercado_pago"
        ) {

            return res.status(400).json({
                error:
                    "Este pedido no fue creado para pagar con Mercado Pago."
            });

        }


        // =====================================================
        // BUSCAR PRODUCTOS DEL PEDIDO
        // =====================================================

        const detalles =
            await pool.query(
                `
                SELECT
                    d.producto_id,
                    d.cantidad,
                    d.precio_unitario,
                    d.subtotal,
                    pr.nombre
                FROM detalle_pedidos d
                INNER JOIN productos pr
                    ON pr.id = d.producto_id
                WHERE d.pedido_id = $1
                ORDER BY d.id
                `,
                [id]
            );


        if (detalles.rows.length === 0) {

            return res.status(400).json({
                error:
                    "El pedido no tiene productos."
            });

        }


        // =====================================================
        // CREAR ITEMS PARA MERCADO PAGO
        // =====================================================

        const items =
            detalles.rows.map(producto => ({

                id:
                    String(
                        producto.producto_id
                    ),

                title:
                    producto.nombre,

                quantity:
                    Number(
                        producto.cantidad
                    ),

                currency_id:
                    "UYU",

                unit_price:
                    Number(
                        producto.precio_unitario
                    )

            }));


        // =====================================================
        // TOTAL
        // =====================================================

        const totalBD =
            Number(
                Number(pedido.total).toFixed(2)
            );


        // =====================================================
        // CREAR PREFERENCIA
        // =====================================================

        const preference = {

            items,

            external_reference:
                String(id),

            payer: {

                name:
                    pedido.cliente_nombre || "",

                phone: {

                    number:
                        pedido.telefono || ""

                }

            }

        };


        // =====================================================
        // URL PÚBLICA
        // =====================================================

        const publicUrl =
            process.env.MP_PUBLIC_URL;


        /*
        Si más adelante configuramos un dominio público,
        por ejemplo:

        MP_PUBLIC_URL=https://tudominio.com

        se habilitarán automáticamente las URLs
        de retorno de Mercado Pago.
        */

        if (publicUrl) {

            const url =
                publicUrl.replace(
                    /\/$/,
                    ""
                );


            preference.back_urls = {

                success:
                    `${url}/checkout.html?estado=success`,

                failure:
                    `${url}/checkout.html?estado=failure`,

                pending:
                    `${url}/checkout.html?estado=pending`

            };

        }


        // =====================================================
        // WEBHOOK
        // =====================================================

        if (process.env.MP_WEBHOOK_URL) {

            preference.notification_url =
                process.env.MP_WEBHOOK_URL;

        } else if (publicUrl) {

            // Si no se definió MP_WEBHOOK_URL, usamos la URL pública.
            preference.notification_url =
                `${publicUrl.replace(/\/$/, "")}/api/pagos/webhook`;

        } else {

            console.warn(
                "⚠️ Sin MP_PUBLIC_URL ni MP_WEBHOOK_URL: Mercado Pago no va a avisar los pagos."
            );

        }


        // =====================================================
        // DEBUG
        // =====================================================

        console.log(
            "🟡 CREANDO PREFERENCIA MP"
        );

        console.log(
            "Pedido:",
            id
        );

        console.log(
            "Total:",
            totalBD
        );


        // =====================================================
        // LLAMAR A MERCADO PAGO
        // =====================================================

        const respuesta =
            await fetch(
                "https://api.mercadopago.com/checkout/preferences",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${accessToken}`

                    },

                    body:
                        JSON.stringify(
                            preference
                        )

                }
            );


        const resultado =
            await respuesta.json();


        // =====================================================
        // ERROR MERCADO PAGO
        // =====================================================

        if (!respuesta.ok) {

            console.error(
                "❌ ERROR MERCADO PAGO:",
                resultado
            );


            return res.status(
                respuesta.status
            ).json({

                error:
                    "Mercado Pago rechazó la creación del pago.",

                detalle:
                    resultado

            });

        }


        // =====================================================
        // PREFERENCIA CREADA
        // =====================================================

        console.log(
            "✅ PREFERENCIA CREADA:",
            resultado.id
        );


        console.log(
            "🔗 INIT POINT:",
            resultado.init_point
        );


        // =====================================================
        // RESPUESTA AL FRONTEND
        // =====================================================

        res.json({

            ok: true,

            pedidoId:
                id,

            total:
                totalBD,

            preferenceId:
                resultado.id,

            initPoint:
                resultado.init_point,

            sandboxInitPoint:
                resultado.sandbox_init_point

        });


    } catch (error) {

        console.error(
            "❌ ERROR CREANDO PREFERENCIA:",
            error
        );


        res.status(500).json({

            error:
                "Error interno creando el pago.",

            detalle:
                error.message

        });

    }

});


// =====================================================
// GET /api/pagos/:paymentId
// =====================================================

router.get(
    "/:paymentId",
    async (req, res) => {

        try {

            const paymentId =
                req.params.paymentId;


            if (!paymentId) {

                return res.status(400).json({
                    error:
                        "Falta el ID del pago."
                });

            }


            const accessToken =
                process.env.MP_ACCESS_TOKEN;


            if (!accessToken) {

                return res.status(500).json({
                    error:
                        "Mercado Pago no está configurado."
                });

            }


            const respuesta =
                await fetch(
                    `https://api.mercadopago.com/v1/payments/${paymentId}`,
                    {

                        method:
                            "GET",

                        headers: {

                            "Authorization":
                                `Bearer ${accessToken}`

                        }

                    }
                );


            const resultado =
                await respuesta.json();


            if (!respuesta.ok) {

                return res.status(
                    respuesta.status
                ).json({

                    error:
                        "No se pudo consultar el pago.",

                    detalle:
                        resultado

                });

            }


            res.json({

                ok: true,

                payment: {

                    id:
                        resultado.id,

                    status:
                        resultado.status,

                    status_detail:
                        resultado.status_detail,

                    external_reference:
                        resultado.external_reference,

                    transaction_amount:
                        resultado.transaction_amount,

                    date_approved:
                        resultado.date_approved

                }

            });


        } catch (error) {

            console.error(
                "❌ ERROR CONSULTANDO PAGO:",
                error
            );


            res.status(500).json({

                error:
                    "Error consultando el pago.",

                detalle:
                    error.message

            });

        }

    }
);


// =====================================================
// CONFIRMAR PAGOS (compartido por webhook, retorno y reconciliación)
// =====================================================

async function mpFetch(url) {

    const accessToken = process.env.MP_ACCESS_TOKEN;

    if (!accessToken) {
        throw new Error("Falta MP_ACCESS_TOKEN");
    }

    const respuesta = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
        const err = new Error("Mercado Pago respondió " + respuesta.status);
        err.detalle = data;
        throw err;
    }

    return data;
}

// Pasa el pedido de en_proceso_pago a nuevo (solo si estaba esperando pago)
async function marcarPedidoPagado(pedidoId) {

    const r = await pool.query(
        `
        UPDATE pedidos
        SET estado = 'nuevo'
        WHERE id = $1
          AND forma_pago = 'mercado_pago'
          AND estado = 'en_proceso_pago'
        `,
        [pedidoId]
    );

    if (r.rowCount > 0) {
        console.log(`✅ Pedido #${pedidoId} confirmado por Mercado Pago.`);
    }

    return r.rowCount > 0;
}

async function confirmarPagoPorId(paymentId) {

    const pago = await mpFetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`
    );

    const pedidoId = Number(pago.external_reference);

    if (
        pago.status === "approved" &&
        Number.isInteger(pedidoId) &&
        pedidoId > 0
    ) {
        return marcarPedidoPagado(pedidoId);
    }

    return false;
}

// Busca en Mercado Pago si el pedido tiene algún pago aprobado
async function confirmarPagoPorPedido(pedidoId) {

    const data = await mpFetch(
        "https://api.mercadopago.com/v1/payments/search" +
        `?external_reference=${encodeURIComponent(pedidoId)}` +
        "&sort=date_created&criteria=desc"
    );

    const aprobado = (data.results || []).some(
        (p) => p.status === "approved"
    );

    return aprobado ? marcarPedidoPagado(pedidoId) : false;
}

// Red de seguridad: revisa los pedidos que siguen "en proceso de pago"
// por si el webhook no llegó o falló.
async function reconciliarPedidosPendientes() {

    if (!process.env.MP_ACCESS_TOKEN) return;

    try {

        const pendientes = await pool.query(
            `
            SELECT id FROM pedidos
            WHERE estado = 'en_proceso_pago'
              AND forma_pago = 'mercado_pago'
              AND creado_en > NOW() - INTERVAL '24 hours'
            ORDER BY id DESC
            LIMIT 30
            `
        );

        for (const fila of pendientes.rows) {
            try {
                await confirmarPagoPorPedido(fila.id);
            } catch (e) {
                console.error(`Reconciliación pedido #${fila.id}:`, e.message);
            }
        }

    } catch (e) {
        console.error("Error en reconciliación de pagos:", e.message);
    }
}


// =====================================================
// POST /api/pagos/confirmar
// El checkout lo llama al volver de Mercado Pago
// =====================================================

router.post("/confirmar", async (req, res) => {

    try {

        const pedidoId = Number(req.body?.pedidoId);
        const paymentId = req.body?.paymentId;

        if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
            return res.status(400).json({ error: "Pedido inválido." });
        }

        // Siempre verificamos contra Mercado Pago: el navegador
        // nunca decide si un pedido está pagado.
        let confirmado = await confirmarPagoPorPedido(pedidoId);

        if (!confirmado && paymentId) {
            confirmado = await confirmarPagoPorId(paymentId);
        }

        const estado = await pool.query(
            "SELECT estado FROM pedidos WHERE id = $1",
            [pedidoId]
        );

        res.json({
            ok: true,
            estado: estado.rows[0]?.estado || null
        });

    } catch (error) {

        console.error("❌ ERROR CONFIRMANDO PAGO:", error.message);

        res.status(500).json({ error: "No se pudo verificar el pago." });

    }

});


// =====================================================
// POST /api/pagos/webhook
// =====================================================

router.post("/webhook", async (req, res) => {

    // Respondemos enseguida: MP reintenta si tardamos
    res.sendStatus(200);

    try {

        const tipo =
            req.body?.type || req.body?.topic ||
            req.query.type || req.query.topic;

        console.log("🔔 WEBHOOK MERCADO PAGO", tipo, req.body, req.query);

        // Formatos posibles: {data:{id}}, ?data.id=, ?id= (IPN)
        const paymentId =
            req.body?.data?.id ||
            req.query["data.id"] ||
            (tipo === "payment" ? req.query.id : null);

        if (tipo === "payment" && paymentId) {
            await confirmarPagoPorId(paymentId);
        }

    } catch (error) {

        console.error("❌ ERROR WEBHOOK:", error.message);

    }

});


module.exports = router;
module.exports.reconciliarPedidosPendientes = reconciliarPedidosPendientes;
