const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

// Los cortes de día (cierre de caja, ventas, dashboard) tienen que
// usar la hora de Uruguay. Sin esto Postgres usa UTC y los pedidos de
// 21:00 a 23:59 caen en el día siguiente.
const ZONA_HORARIA = process.env.TZ_LOCAL || "America/Montevideo";

pool.on("connect", (client) => {
    client.query(`SET TIME ZONE '${ZONA_HORARIA}'`).catch((e) =>
        console.error("No se pudo fijar la zona horaria:", e.message)
    );
});

module.exports = pool;