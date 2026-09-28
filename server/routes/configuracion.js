const express = require("express");
const router = express.Router();

const pool = require("../database");


// =====================================================
// GET - OBTENER CONFIGURACIÓN
// (Usado por la web pública y por el panel admin)
// =====================================================

router.get("/", async (req, res) => {

    try {

        const resultado = await pool.query(
            `SELECT * FROM configuracion WHERE id = 1`
        );

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                error: "No hay configuración cargada. Ejecutá el schema.sql."
            });

        }

        res.json(resultado.rows[0]);

    } catch (error) {

        console.error("Error obteniendo configuración:", error);

        res.status(500).json({
            error: "Error al obtener la configuración"
        });

    }

});


// =====================================================
// PATCH - CAMBIAR ABIERTO / CERRADO
// =====================================================

router.patch("/estado", async (req, res) => {

    try {

        const { abierto } = req.body;

        if (typeof abierto !== "boolean") {

            return res.status(400).json({
                error: "El campo 'abierto' debe ser true o false"
            });

        }

        const resultado = await pool.query(
            `
            UPDATE configuracion
            SET abierto = $1,
                actualizado_en = NOW()
            WHERE id = 1
            RETURNING *
            `,
            [abierto]
        );

        res.json({
            mensaje: abierto
                ? "El local fue marcado como ABIERTO"
                : "El local fue marcado como CERRADO",
            configuracion: resultado.rows[0]
        });

    } catch (error) {

        console.error("Error cambiando estado del local:", error);

        res.status(500).json({
            error: "Error al cambiar el estado del local"
        });

    }

});


// =====================================================
// PATCH - ACTUALIZAR REGLAS DE ENVÍO / UBICACIÓN
// =====================================================

router.patch("/", async (req, res) => {

    try {

        const {
            local_lat,
            local_lng,
            envio_gratis_hasta_km,
            envio_costo,
            envio_maximo_km
        } = req.body;

        const actual = await pool.query(
            `SELECT * FROM configuracion WHERE id = 1`
        );

        if (actual.rows.length === 0) {

            return res.status(404).json({
                error: "No hay configuración cargada."
            });

        }

        const config = actual.rows[0];

        const nuevo = {

            local_lat:
                local_lat !== undefined
                    ? Number(local_lat)
                    : Number(config.local_lat),

            local_lng:
                local_lng !== undefined
                    ? Number(local_lng)
                    : Number(config.local_lng),

            envio_gratis_hasta_km:
                envio_gratis_hasta_km !== undefined
                    ? Number(envio_gratis_hasta_km)
                    : Number(config.envio_gratis_hasta_km),

            envio_costo:
                envio_costo !== undefined
                    ? Number(envio_costo)
                    : Number(config.envio_costo),

            envio_maximo_km:
                envio_maximo_km !== undefined
                    ? Number(envio_maximo_km)
                    : Number(config.envio_maximo_km)

        };

        for (const [campo, valor] of Object.entries(nuevo)) {

            if (isNaN(valor)) {

                return res.status(400).json({
                    error: `El campo ${campo} no es un número válido`
                });

            }

        }

        const resultado = await pool.query(
            `
            UPDATE configuracion
            SET
                local_lat = $1,
                local_lng = $2,
                envio_gratis_hasta_km = $3,
                envio_costo = $4,
                envio_maximo_km = $5,
                actualizado_en = NOW()
            WHERE id = 1
            RETURNING *
            `,
            [
                nuevo.local_lat,
                nuevo.local_lng,
                nuevo.envio_gratis_hasta_km,
                nuevo.envio_costo,
                nuevo.envio_maximo_km
            ]
        );

        res.json({
            mensaje: "Configuración actualizada correctamente",
            configuracion: resultado.rows[0]
        });

    } catch (error) {

        console.error("Error actualizando configuración:", error);

        res.status(500).json({
            error: "Error al actualizar la configuración"
        });

    }

});


module.exports = router;
