const express = require("express");
const router = express.Router();

const pool = require("../database");


// =====================================================
// DASHBOARD / RESUMEN POR FECHAS
// =====================================================

router.get("/resumen", async (req, res) => {

    try {

        const { desde, hasta } = req.query;


        // =================================================
        // FECHAS
        // =================================================

        let fechaDesde;
        let fechaHasta;


        // Si vienen fechas personalizadas
        if (desde && hasta) {

            fechaDesde = desde;

            // Sumamos un día al "hasta" para incluir
            // todo ese día.
            fechaHasta = hasta;

        } else {

            // Por defecto: hoy

            fechaDesde = new Date()
                .toISOString()
                .slice(0, 10);

            fechaHasta = fechaDesde;
        }


        // =================================================
        // RESUMEN PRINCIPAL
        // =================================================

        const resumen = await pool.query(
            `
            SELECT

                COALESCE(
                    SUM(total) FILTER (
                        WHERE estado != 'cancelado'
                    ),
                    0
                ) AS ventas,

                COUNT(*) FILTER (
                    WHERE estado != 'cancelado'
                ) AS pedidos,

                COUNT(*) FILTER (
                    WHERE estado = 'cancelado'
                ) AS cancelados,

                COUNT(*) FILTER (
                    WHERE tipo_entrega = 'delivery'
                    AND estado != 'cancelado'
                ) AS delivery,

                COUNT(*) FILTER (
                    WHERE tipo_entrega = 'retiro'
                    AND estado != 'cancelado'
                ) AS retiro,

                COALESCE(
                    AVG(total) FILTER (
                        WHERE estado != 'cancelado'
                    ),
                    0
                ) AS ticket_promedio

            FROM pedidos

            WHERE creado_en >= $1::date

            AND creado_en < (
                $2::date + INTERVAL '1 day'
            )
            `,
            [
                fechaDesde,
                fechaHasta
            ]
        );


        // =================================================
        // FORMAS DE PAGO
        // =================================================

        const formasPago = await pool.query(
            `
            SELECT
                forma_pago,
                COUNT(*) AS cantidad,
                COALESCE(
                    SUM(total),
                    0
                ) AS total

            FROM pedidos

            WHERE estado != 'cancelado'

            AND creado_en >= $1::date

            AND creado_en < (
                $2::date + INTERVAL '1 day'
            )

            GROUP BY forma_pago

            ORDER BY total DESC
            `,
            [
                fechaDesde,
                fechaHasta
            ]
        );


        // =================================================
        // PRODUCTOS MÁS VENDIDOS
        // =================================================

        const productosVendidos =
            await pool.query(
                `
                SELECT

                    pr.nombre,

                    SUM(
                        dp.cantidad
                    ) AS cantidad,

                    SUM(
                        dp.subtotal
                    ) AS ventas

                FROM detalle_pedidos dp

                INNER JOIN productos pr
                    ON dp.producto_id = pr.id

                INNER JOIN pedidos pe
                    ON dp.pedido_id = pe.id

                WHERE pe.estado != 'cancelado'

                AND pe.creado_en >= $1::date

                AND pe.creado_en < (
                    $2::date + INTERVAL '1 day'
                )

                GROUP BY
                    pr.id,
                    pr.nombre

                ORDER BY cantidad DESC

                LIMIT 10
                `,
                [
                    fechaDesde,
                    fechaHasta
                ]
            );


        // =================================================
        // VENTAS POR DÍA
        // =================================================

        const ventasPorDia =
            await pool.query(
                `
                SELECT

                    DATE(creado_en) AS fecha,

                    COALESCE(
                        SUM(total) FILTER (
                            WHERE estado != 'cancelado'
                        ),
                        0
                    ) AS ventas,

                    COUNT(*) FILTER (
                        WHERE estado != 'cancelado'
                    ) AS pedidos,

                    COUNT(*) FILTER (
                        WHERE estado = 'cancelado'
                    ) AS cancelados

                FROM pedidos

                WHERE creado_en >= $1::date

                AND creado_en < (
                    $2::date + INTERVAL '1 day'
                )

                GROUP BY DATE(creado_en)

                ORDER BY fecha ASC
                `,
                [
                    fechaDesde,
                    fechaHasta
                ]
            );


        // =================================================
        // RESPUESTA
        // =================================================

        res.json({

            periodo: {
                desde: fechaDesde,
                hasta: fechaHasta
            },

            resumen: {

                ventas:
                    Number(
                        resumen.rows[0].ventas
                    ),

                pedidos:
                    Number(
                        resumen.rows[0].pedidos
                    ),

                cancelados:
                    Number(
                        resumen.rows[0].cancelados
                    ),

                delivery:
                    Number(
                        resumen.rows[0].delivery
                    ),

                retiro:
                    Number(
                        resumen.rows[0].retiro
                    ),

                ticketPromedio:
                    Number(
                        resumen.rows[0].ticket_promedio
                    )

            },

            formasPago:
                formasPago.rows,

            productosVendidos:
                productosVendidos.rows,

            ventasPorDia:
                ventasPorDia.rows

        });


    } catch (error) {

        console.error(
            "Error obteniendo dashboard:",
            error
        );


        res.status(500).json({

            error:
                "Error al obtener estadísticas",

            detalle:
                error.message

        });

    }

});


module.exports = router;