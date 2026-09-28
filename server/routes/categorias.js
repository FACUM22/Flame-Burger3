const express = require("express");
const router = express.Router();

const pool = require("../database");


// =====================================================
// GET - OBTENER CATEGORÍAS
// =====================================================

router.get("/", async (req, res) => {

    try {

        const resultado = await pool.query(`
            SELECT
                c.id,
                c.nombre,
                c.activa,
                COUNT(p.id)::integer AS productos
            FROM categorias c

            LEFT JOIN productos p
                ON p.categoria_id = c.id

            GROUP BY
                c.id,
                c.nombre,
                c.activa

            ORDER BY c.id ASC
        `);

        res.json(resultado.rows);

    } catch (error) {

        console.error(
            "Error obteniendo categorías:",
            error
        );

        res.status(500).json({
            error: "Error al obtener las categorías"
        });

    }

});


// =====================================================
// POST - CREAR CATEGORÍA
// =====================================================

router.post("/", async (req, res) => {

    try {

        const nombre =
            String(req.body.nombre || "").trim();


        if (!nombre) {

            return res.status(400).json({
                error: "El nombre es obligatorio"
            });

        }


        const existe =
            await pool.query(
                `
                SELECT id
                FROM categorias
                WHERE LOWER(nombre) = LOWER($1)
                `,
                [nombre]
            );


        if (existe.rows.length > 0) {

            return res.status(400).json({
                error: "La categoría ya existe"
            });

        }


        const resultado =
            await pool.query(
                `
                INSERT INTO categorias
                (
                    nombre,
                    activa
                )
                VALUES
                (
                    $1,
                    true
                )
                RETURNING *
                `,
                [nombre]
            );


        res.status(201).json({

            mensaje:
                "Categoría creada correctamente",

            categoria:
                resultado.rows[0]

        });

    } catch (error) {

        console.error(
            "Error creando categoría:",
            error
        );

        res.status(500).json({
            error: "Error al crear la categoría"
        });

    }

});


// =====================================================
// PUT - EDITAR CATEGORÍA
// =====================================================

router.put("/:id", async (req, res) => {

    try {

        const { id } =
            req.params;


        const nombre =
            String(req.body.nombre || "").trim();


        if (!nombre) {

            return res.status(400).json({
                error: "El nombre es obligatorio"
            });

        }


        const existe =
            await pool.query(
                `
                SELECT id
                FROM categorias
                WHERE LOWER(nombre) = LOWER($1)
                AND id != $2
                `,
                [
                    nombre,
                    id
                ]
            );


        if (existe.rows.length > 0) {

            return res.status(400).json({
                error: "Ya existe otra categoría con ese nombre"
            });

        }


        const resultado =
            await pool.query(
                `
                UPDATE categorias

                SET nombre = $1

                WHERE id = $2

                RETURNING *
                `,
                [
                    nombre,
                    id
                ]
            );


        if (
            resultado.rows.length === 0
        ) {

            return res.status(404).json({
                error: "Categoría no encontrada"
            });

        }


        res.json({

            mensaje:
                "Categoría actualizada correctamente",

            categoria:
                resultado.rows[0]

        });

    } catch (error) {

        console.error(
            "Error editando categoría:",
            error
        );

        res.status(500).json({
            error: "Error al editar la categoría"
        });

    }

});


// =====================================================
// PATCH - ACTIVAR / DESACTIVAR
// =====================================================

router.patch(
    "/:id/estado",
    async (req, res) => {

        try {

            const { id } =
                req.params;

            const { activa } =
                req.body;


            if (
                typeof activa !== "boolean"
            ) {

                return res.status(400).json({
                    error:
                        "El estado debe ser true o false"
                });

            }


            const resultado =
                await pool.query(
                    `
                    UPDATE categorias

                    SET activa = $1

                    WHERE id = $2

                    RETURNING *
                    `,
                    [
                        activa,
                        id
                    ]
                );


            if (
                resultado.rows.length === 0
            ) {

                return res.status(404).json({
                    error:
                        "Categoría no encontrada"
                });

            }


            res.json({

                mensaje:
                    "Estado actualizado correctamente",

                categoria:
                    resultado.rows[0]

            });

        } catch (error) {

            console.error(
                "Error cambiando estado:",
                error
            );

            res.status(500).json({
                error:
                    "Error al cambiar el estado"
            });

        }

    }
);


// =====================================================
// DELETE - ELIMINAR CATEGORÍA
// =====================================================

router.delete("/:id", async (req, res) => {

    try {

        const { id } =
            req.params;


        const productos =
            await pool.query(
                `
                SELECT COUNT(*)::integer AS cantidad

                FROM productos

                WHERE categoria_id = $1
                `,
                [id]
            );


        if (
            productos.rows[0].cantidad > 0
        ) {

            return res.status(400).json({

                error:
                    "No podés eliminar una categoría que tiene productos. Primero cambiá la categoría de esos productos."

            });

        }


        const resultado =
            await pool.query(
                `
                DELETE FROM categorias

                WHERE id = $1

                RETURNING *
                `,
                [id]
            );


        if (
            resultado.rows.length === 0
        ) {

            return res.status(404).json({
                error:
                    "Categoría no encontrada"
            });

        }


        res.json({

            mensaje:
                "Categoría eliminada correctamente"

        });

    } catch (error) {

        console.error(
            "Error eliminando categoría:",
            error
        );

        res.status(500).json({
            error:
                "Error al eliminar la categoría"
        });

    }

});


module.exports = router;