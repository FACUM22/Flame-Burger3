const express = require("express");
const router = express.Router();

const pool = require("../database");

// =====================================================
// GET - HISTORIAL DE VENTAS
// =====================================================

router.get("/", async (req, res) => {

try {

    const {
        desde,
        hasta,
        estado,
        forma_pago,
        tipo_entrega,
        buscar
    } = req.query;


    let condiciones = [];
    let valores = [];
    let contador = 1;


    // =================================================
    // FECHA DESDE
    // =================================================

    if (desde) {

        condiciones.push(
            `p.creado_en >= $${contador}::date`
        );

        valores.push(desde);

        contador++;

    }


    // =================================================
    // FECHA HASTA
    // =================================================

    if (hasta) {

        condiciones.push(
            `p.creado_en < ($${contador}::date + INTERVAL '1 day')`
        );

        valores.push(hasta);

        contador++;

    }


    // =================================================
    // ESTADO
    // =================================================

    if (
        estado &&
        estado !== "todos"
    ) {

        condiciones.push(
            `p.estado = $${contador}`
        );

        valores.push(estado);

        contador++;

    }


    // =================================================
    // FORMA DE PAGO
    // =================================================

    if (
        forma_pago &&
        forma_pago !== "todos"
    ) {

        condiciones.push(
            `p.forma_pago = $${contador}`
        );

        valores.push(forma_pago);

        contador++;

    }


    // =================================================
    // TIPO ENTREGA
    // =================================================

    if (
        tipo_entrega &&
        tipo_entrega !== "todos"
    ) {

        condiciones.push(
            `p.tipo_entrega = $${contador}`
        );

        valores.push(tipo_entrega);

        contador++;

    }


    // =================================================
    // BUSCAR
    // =================================================

    if (buscar) {

        condiciones.push(`
            (
                CAST(p.id AS TEXT) ILIKE $${contador}
                OR c.nombre ILIKE $${contador}
                OR c.telefono ILIKE $${contador}
            )
        `);

        valores.push(`%${buscar}%`);

        contador++;

    }


    const where =
        condiciones.length > 0
            ? `WHERE ${condiciones.join(" AND ")}`
            : "";


    // =================================================
    // PEDIDOS
    // =================================================

    const resultado = await pool.query(
        `
        SELECT

            p.id,

            p.tipo_entrega,

            p.forma_pago,

            p.estado,

            p.total,

            p.observaciones,

            p.creado_en,

            c.nombre AS cliente_nombre,

            c.telefono AS cliente_telefono,

            c.direccion AS cliente_direccion

        FROM pedidos p

        LEFT JOIN clientes c
            ON p.cliente_id = c.id

        ${where}

        ORDER BY
            p.creado_en DESC
        `,
        valores
    );


    // =================================================
    // ESTADÍSTICAS
    // =================================================

    const resumen = await pool.query(
        `
        SELECT

            COALESCE(
                SUM(p.total) FILTER (
                    WHERE p.estado != 'cancelado'
                ),
                0
            ) AS ventas,

            COUNT(*) FILTER (
                WHERE p.estado != 'cancelado'
            ) AS pedidos,

            COUNT(*) FILTER (
                WHERE p.estado = 'cancelado'
            ) AS cancelados

        FROM pedidos p

        LEFT JOIN clientes c
            ON p.cliente_id = c.id

        ${where}
        `,
        valores
    );


    // =================================================
    // RESPUESTA
    // =================================================

    res.json({

        pedidos:
            resultado.rows,

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
                )

        }

    });


} catch (error) {

    console.error(
        "Error en historial de ventas:",
        error
    );


    res.status(500).json({

        error:
            "Error al obtener historial de ventas",

        detalle:
            error.message

    });

}

});

module.exports = router;
