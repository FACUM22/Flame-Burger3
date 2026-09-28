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

        if (
            process.env.MP_WEBHOOK_URL
        ) {

            preference.notification_url =
                process.env.MP_WEBHOOK_URL;

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
// POST /api/pagos/webhook
// =====================================================

router.post(
    "/webhook",
    async (req, res) => {

        try {

            console.log(
                "🔔 WEBHOOK MERCADO PAGO"
            );


            console.log(
                "BODY:",
                req.body
            );


            const tipo =
                req.body?.type ||
                req.body?.topic;


            if (
                tipo === "payment"
            ) {

                const paymentId =
                    req.body?.data?.id;


                if (paymentId) {

                    console.log(
                        "💳 PAYMENT ID:",
                        paymentId
                    );


                    const accessToken =
                        process.env.MP_ACCESS_TOKEN;


                    if (accessToken) {

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


                        const pago =
                            await respuesta.json();


                        if (respuesta.ok) {

                            console.log(
                                "💳 ESTADO DEL PAGO:",
                                pago.status
                            );


                            const pedidoId =
                                Number(
                                    pago.external_reference
                                );


                            if (

                                pago.status ===
                                    "approved" &&

                                Number.isInteger(
                                    pedidoId
                                ) &&

                                pedidoId > 0

                            ) {

                            await pool.query(
    `
     UPDATE pedidos
    SET estado = 'nuevo'
    WHERE id = $1
    AND forma_pago = 'mercado_pago'
    AND estado = 'en_proceso_pago'
    `,
    [pedidoId]
);

                                console.log(
                                    `✅ Pedido #${pedidoId} confirmado por Mercado Pago.`
                                );

                            }

                        } else {

                            console.error(
                                "❌ ERROR CONSULTANDO PAYMENT:",
                                pago
                            );

                        }

                    }

                }

            }


            res.sendStatus(200);


        } catch (error) {

            console.error(
                "❌ ERROR WEBHOOK:",
                error
            );


            res.sendStatus(200);

        }

    }
);


module.exports =
    router;