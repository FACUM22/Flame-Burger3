const pool = require("../database");

// Prepara la base para la numeración correlativa de pedidos.
// Es seguro correrlo en cada arranque: solo hace algo la primera vez.
//
//  - pedidos.numero: número que ve el cliente/local (1, 2, 3...).
//    Solo lo reciben los pedidos confirmados (efectivo/POS al crearse,
//    Mercado Pago cuando el pago se aprueba). Sin saltos.
//  - contador_pedidos: guarda el último número entregado.
//
// Los pedidos que ya existían conservan como número su id actual,
// así el historial no cambia.
async function migrar() {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        await client.query(`
            CREATE TABLE IF NOT EXISTS contador_pedidos (
                id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
                ultimo INTEGER NOT NULL DEFAULT 0
            )
        `);

        const existe = await client.query(`
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'pedidos'
              AND column_name = 'numero'
        `);

        if (existe.rowCount === 0) {

            await client.query(
                "ALTER TABLE pedidos ADD COLUMN numero INTEGER UNIQUE"
            );

            await client.query(`
                UPDATE pedidos
                SET numero = id
                WHERE estado <> 'en_proceso_pago'
            `);

            await client.query(`
                INSERT INTO contador_pedidos (id, ultimo)
                VALUES (1, COALESCE((SELECT MAX(numero) FROM pedidos), 0))
                ON CONFLICT (id) DO UPDATE
                SET ultimo = EXCLUDED.ultimo
            `);

            console.log("✅ Migración: numeración correlativa de pedidos activada.");

        } else {

            await client.query(`
                INSERT INTO contador_pedidos (id, ultimo)
                VALUES (1, COALESCE((SELECT MAX(numero) FROM pedidos), 0))
                ON CONFLICT (id) DO NOTHING
            `);

        }

        await client.query("COMMIT");

    } catch (error) {

        await client.query("ROLLBACK").catch(() => {});
        throw error;

    } finally {

        client.release();

    }

}

module.exports = migrar;
