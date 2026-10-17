const pool = require("../database");

// =====================================================
// EMAIL DE CONFIRMACIÓN DE PEDIDO (vía Resend)
//
// Variables de entorno (server/.env):
//   RESEND_API_KEY   clave de https://resend.com  (obligatoria)
//   MAIL_FROM        remitente, ej: "Flame Burger <pedidos@tudominio.com>"
//                    (sin dominio verificado se puede probar con
//                    "Flame Burger <onboarding@resend.dev>", pero
//                    Resend solo entrega a TU propio email)
//   LOCAL_TELEFONO   (opcional) teléfono del local para mostrar en el mail
//
// Nunca lanza errores: si el email falla, el pedido sigue igual.
// =====================================================

function escaparHTML(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

const NOMBRES_PAGO = {
    efectivo: "Efectivo",
    tarjeta_pos: "Tarjeta (POS al recibir)",
    mercado_pago: "Mercado Pago (pagado)"
};

function formatoPrecio(valor) {
    return "$" + Number(valor).toFixed(2);
}

function armarHTML(pedido, productos) {

    const numero = pedido.numero ?? pedido.id;
    const esDelivery = pedido.tipo_entrega === "delivery";

    const filasProductos = productos
        .map(
            (p) => `
            <tr>
                <td style="padding:6px 0;">${escaparHTML(p.cantidad)} x ${escaparHTML(p.nombre)}</td>
                <td style="padding:6px 0;text-align:right;">${formatoPrecio(p.subtotal)}</td>
            </tr>`
        )
        .join("");

    const filaEnvio = esDelivery
        ? `<tr>
               <td style="padding:6px 0;">Envío</td>
               <td style="padding:6px 0;text-align:right;">${
                   Number(pedido.costo_envio) > 0
                       ? formatoPrecio(pedido.costo_envio)
                       : "Gratis"
               }</td>
           </tr>`
        : "";

    const entrega = esDelivery
        ? `Delivery a ${escaparHTML(pedido.direccion || "")}`
        : "Retiro en el local";

    const contacto = process.env.LOCAL_TELEFONO
        ? `<p style="color:#666;font-size:14px;">Cualquier duda, escribinos al ${escaparHTML(process.env.LOCAL_TELEFONO)}.</p>`
        : "";

    return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#222;">
  <div style="max-width:520px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;padding:28px;">
      <h1 style="margin:0 0 4px;font-size:24px;">🔥 Flame Burger</h1>
      <p style="margin:0 0 20px;color:#666;">Recibimos tu pedido</p>

      <p>Hola <strong>${escaparHTML(pedido.cliente_nombre)}</strong>, tu pedido está confirmado.</p>

      <p style="font-size:20px;margin:16px 0;">
        Número de pedido: <strong>#${escaparHTML(numero)}</strong>
      </p>

      <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;border-bottom:1px solid #eee;">
        ${filasProductos}
        ${filaEnvio}
        <tr>
          <td style="padding:10px 0 6px;border-top:1px solid #eee;"><strong>Total</strong></td>
          <td style="padding:10px 0 6px;border-top:1px solid #eee;text-align:right;"><strong>${formatoPrecio(pedido.total)}</strong></td>
        </tr>
      </table>

      <p style="margin-top:18px;">
        <strong>Entrega:</strong> ${entrega}<br>
        <strong>Pago:</strong> ${escaparHTML(NOMBRES_PAGO[pedido.forma_pago] || pedido.forma_pago)}
        ${pedido.observaciones ? `<br><strong>Comentarios:</strong> ${escaparHTML(pedido.observaciones)}` : ""}
      </p>

      ${contacto}
      <p style="color:#999;font-size:12px;margin-top:24px;">¡Gracias por elegirnos!</p>
    </div>
  </div>
</body>
</html>`;
}

async function enviarConfirmacionEmail(pedidoId) {

    try {

        const apiKey = process.env.RESEND_API_KEY;

        if (!apiKey) {
            console.log("ℹ️ Email de confirmación omitido: falta RESEND_API_KEY.");
            return false;
        }

        const resultado = await pool.query(
            `
            SELECT
                p.id,
                p.numero,
                p.tipo_entrega,
                p.forma_pago,
                p.total,
                p.observaciones,
                p.costo_envio,
                c.nombre AS cliente_nombre,
                c.email,
                c.direccion
            FROM pedidos p
            LEFT JOIN clientes c ON c.id = p.cliente_id
            WHERE p.id = $1
            `,
            [pedidoId]
        );

        const pedido = resultado.rows[0];

        if (!pedido || !pedido.email) {
            return false; // el cliente no dejó email
        }

        const detalle = await pool.query(
            `
            SELECT
                pr.nombre,
                d.cantidad,
                d.subtotal
            FROM detalle_pedidos d
            LEFT JOIN productos pr ON pr.id = d.producto_id
            WHERE d.pedido_id = $1
            ORDER BY d.id
            `,
            [pedidoId]
        );

        const respuesta = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: process.env.MAIL_FROM || "Flame Burger <onboarding@resend.dev>",
                to: [pedido.email],
                subject: `Pedido #${pedido.numero ?? pedido.id} confirmado - Flame Burger`,
                html: armarHTML(pedido, detalle.rows)
            })
        });

        if (!respuesta.ok) {
            const cuerpo = await respuesta.text();
            console.error(`❌ Resend respondió ${respuesta.status}:`, cuerpo);
            return false;
        }

        console.log(`📧 Confirmación enviada (pedido #${pedido.numero ?? pedido.id}).`);
        return true;

    } catch (error) {

        console.error("❌ ERROR ENVIANDO EMAIL DE CONFIRMACIÓN:", error.message);
        return false;

    }
}

module.exports = { enviarConfirmacionEmail };
