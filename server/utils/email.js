// =====================================================
// EMAIL DE CONFIRMACIÓN DE PEDIDO (Brevo, por HTTP)
//
// Se llama desde POST /api/pedidos/:id/email, cuando el cliente
// escribe su email en el cartel "Pedido realizado con éxito".
//
// Nunca lanza errores: devuelve true si el correo salió y false
// si no (sin configurar, pedido inexistente o error de Brevo).
//
// Variables de entorno (server/.env):
//   BREVO_API_KEY       clave de la API de Brevo
//   EMAIL_REMITENTE     email verificado en Brevo (el "desde")
//   EMAIL_NOMBRE        nombre que ve el cliente (por defecto "Flame Burger")
//   LOCAL_DIRECCION     para los retiros (por defecto "San Martín 5306")
// =====================================================

const pool = require("../database");

const LOCAL_DIRECCION = process.env.LOCAL_DIRECCION || "San Martín 5306";

const FORMAS_PAGO = {
    efectivo: "Efectivo",
    mercado_pago: "Mercado Pago (pagado)",
    tarjeta_pos: "Tarjeta (POS al recibir)"
};

function esc(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function pesos(n) {
    return "$" + Number(n || 0).toLocaleString("es-UY", {
        maximumFractionDigits: 2
    });
}

async function cargarPedido(pedidoId) {

    const p = await pool.query(
        `
        SELECT
            p.numero, p.tipo_entrega, p.forma_pago,
            p.total, p.costo_envio, p.observaciones,
            c.nombre AS cliente_nombre,
            c.direccion AS cliente_direccion
        FROM pedidos p
        LEFT JOIN clientes c ON c.id = p.cliente_id
        WHERE p.id = $1
        `,
        [pedidoId]
    );

    if (p.rows.length === 0) return null;

    const d = await pool.query(
        `
        SELECT d.cantidad, d.subtotal,
               COALESCE(pr.nombre, 'Producto') AS nombre
        FROM detalle_pedidos d
        LEFT JOIN productos pr ON pr.id = d.producto_id
        WHERE d.pedido_id = $1
        ORDER BY d.id
        `,
        [pedidoId]
    );

    return { ...p.rows[0], items: d.rows };
}

function armarEmail(pedido) {

    const nombre =
        (pedido.cliente_nombre || "").trim().split(/\s+/)[0] || "";

    const esDelivery = pedido.tipo_entrega === "delivery";

    const entrega = esDelivery
        ? `Delivery a ${pedido.cliente_direccion || "la ubicación indicada"}`
        : `Retiro en el local (${LOCAL_DIRECCION})`;

    const filas = pedido.items
        .map(
            (i) => `
            <tr>
                <td style="padding:6px 0">${esc(i.cantidad)}x ${esc(i.nombre)}</td>
                <td style="padding:6px 0;text-align:right">${pesos(i.subtotal)}</td>
            </tr>`
        )
        .join("");

    const envio = esDelivery
        ? `<tr>
               <td style="padding:6px 0">Envío</td>
               <td style="padding:6px 0;text-align:right">
                   ${Number(pedido.costo_envio) > 0 ? pesos(pedido.costo_envio) : "Gratis"}
               </td>
           </tr>`
        : "";

    const comentarios =
        pedido.observaciones && pedido.observaciones.trim()
            ? `<p><strong>Comentarios:</strong> ${esc(pedido.observaciones.trim())}</p>`
            : "";

    const html = `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#222">
    <h2 style="margin-bottom:4px">¡Hola${nombre ? " " + esc(nombre) : ""}! 🔥</h2>
    <p style="margin-top:0">Tu pedido <strong>#${esc(pedido.numero)}</strong> fue confirmado.</p>

    <table style="width:100%;border-collapse:collapse;border-top:1px solid #ddd;border-bottom:1px solid #ddd">
        ${filas}
        ${envio}
        <tr>
            <td style="padding:10px 0;font-weight:bold">Total</td>
            <td style="padding:10px 0;text-align:right;font-weight:bold">${pesos(pedido.total)}</td>
        </tr>
    </table>

    <p><strong>Pago:</strong> ${esc(FORMAS_PAGO[pedido.forma_pago] || pedido.forma_pago)}</p>
    <p><strong>Entrega:</strong> ${esc(entrega)}</p>
    ${comentarios}
    <p>¡Gracias por elegirnos!</p>
</div>`;

    return {
        asunto: `Pedido #${pedido.numero} confirmado - Flame Burger`,
        html
    };
}

async function enviarConfirmacionEmail(pedidoId, email) {

    try {

        const clave = process.env.BREVO_API_KEY;
        const remitente = process.env.EMAIL_REMITENTE;

        if (!clave || !remitente) {
            return false; // email no configurado: se ignora
        }

        const pedido = await cargarPedido(pedidoId);

        if (!pedido || !pedido.numero) return false;

        if (!email) return false;

        const { asunto, html } = armarEmail(pedido);

        const r = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "api-key": clave,
                "Content-Type": "application/json",
                accept: "application/json"
            },
            body: JSON.stringify({
                sender: {
                    name: process.env.EMAIL_NOMBRE || "Flame Burger",
                    email: remitente
                },
                to: [{ email }],
                subject: asunto,
                htmlContent: html
            })
        });

        if (!r.ok) {
            const data = await r.json().catch(() => ({}));
            throw new Error(`Brevo ${r.status}: ${data.message || "error"}`);
        }

        console.log(`📧 Confirmación del pedido #${pedido.numero} enviada.`);
        return true;

    } catch (error) {

        console.error(
            `❌ No se pudo enviar el email del pedido ${pedidoId}:`,
            error.message
        );
        return false;
    }
}

module.exports = { enviarConfirmacionEmail, armarEmail };
