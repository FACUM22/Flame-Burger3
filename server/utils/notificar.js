// =====================================================
// NOTIFICACIÓN AL CLIENTE CUANDO SE CONFIRMA UN PEDIDO
//
// Se llama desde:
//   - routes/pedidos.js  -> pedidos en efectivo / tarjeta POS
//   - routes/pagos.js    -> pedidos de Mercado Pago ya pagados
//
// Nunca debe romper la creación del pedido: todo error se
// captura y se deja en el log.
//
// Variables de entorno (server/.env):
//   NOTIF_PROVIDER   = off | twilio | meta     (por defecto: off)
//
//   Twilio (WhatsApp o SMS):
//     TWILIO_ACCOUNT_SID
//     TWILIO_AUTH_TOKEN
//     TWILIO_FROM   = "whatsapp:+14155238886"  (WhatsApp)
//                     o "+1XXXXXXXXXX"         (SMS)
//     TWILIO_CONTENT_SID (opcional) plantilla aprobada de WhatsApp,
//                     con variables {{1}}=nombre {{2}}=numero
//                     {{3}}=detalle {{4}}=total {{5}}=entrega
//
//   Meta WhatsApp Cloud API:
//     META_WA_TOKEN
//     META_WA_PHONE_ID
//     META_WA_TEMPLATE   nombre de la plantilla aprobada
//     META_WA_LANG       código de idioma de la plantilla (por defecto "es")
//     La plantilla debe tener 5 variables en este orden:
//     {{1}}=nombre {{2}}=numero {{3}}=detalle {{4}}=total {{5}}=entrega
//
//   Datos del local para el texto del mensaje (opcionales):
//     LOCAL_NOMBRE      (por defecto "Flame Burger")
//     LOCAL_DIRECCION   (por defecto "San Martín 5306")
// =====================================================

const pool = require("../database");

const LOCAL_NOMBRE = process.env.LOCAL_NOMBRE || "Flame Burger";
const LOCAL_DIRECCION = process.env.LOCAL_DIRECCION || "San Martín 5306";

const FORMAS_PAGO = {
    efectivo: "Efectivo",
    mercado_pago: "Mercado Pago (pagado)",
    tarjeta_pos: "Tarjeta (POS al recibir)"
};

// -----------------------------------------------------
// Teléfono -> formato internacional sin "+" (Uruguay)
// 099123456 / 99123456 / +598 99 123 456 -> 59899123456
// -----------------------------------------------------
function normalizarTelefono(telefono) {

    let t = String(telefono || "").replace(/\D/g, "");

    if (!t) return null;

    if (t.startsWith("00")) t = t.slice(2);

    if (t.startsWith("598")) {
        // "+598 099 123 456": sacar el 0 que sobra tras el código de país
        return "598" + t.slice(3).replace(/^0/, "");
    }

    if (t.startsWith("0")) t = t.slice(1);

    // celular uruguayo: 9X XXX XXX (8 dígitos)
    if (t.length === 8 && t.startsWith("9")) return "598" + t;

    // Otro país o formato desconocido: se usa tal cual
    // si tiene largo razonable.
    if (t.length >= 10 && t.length <= 15) return t;

    return null;
}

function formatoPesos(n) {
    return "$" + Number(n || 0).toLocaleString("es-UY", {
        maximumFractionDigits: 2
    });
}

// -----------------------------------------------------
// Busca todos los datos del pedido
// -----------------------------------------------------
async function cargarPedido(pedidoId) {

    const p = await pool.query(
        `
        SELECT
            p.id,
            p.numero,
            p.tipo_entrega,
            p.forma_pago,
            p.total,
            p.costo_envio,
            p.observaciones,
            c.nombre   AS cliente_nombre,
            c.telefono AS cliente_telefono,
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
        SELECT
            d.cantidad,
            d.subtotal,
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

// -----------------------------------------------------
// Arma el texto del mensaje
// -----------------------------------------------------
function armarMensaje(pedido) {

    const nombre = (pedido.cliente_nombre || "").trim().split(/\s+/)[0] || "";

    const lineasItems = pedido.items.map(
        (i) => `• ${i.cantidad}x ${i.nombre}`
    );

    const esDelivery = pedido.tipo_entrega === "delivery";

    const entrega = esDelivery
        ? `Delivery a ${pedido.cliente_direccion || "la ubicación que marcaste en el mapa"}`
        : `Retiro en el local (${LOCAL_DIRECCION})`;

    const lineas = [
        `¡Hola${nombre ? " " + nombre : ""}! 🔥 Tu pedido *#${pedido.numero}* en ${LOCAL_NOMBRE} fue confirmado.`,
        "",
        ...lineasItems
    ];

    if (esDelivery) {
        lineas.push(
            Number(pedido.costo_envio) > 0
                ? `Envío: ${formatoPesos(pedido.costo_envio)}`
                : "Envío: gratis"
        );
    }

    lineas.push(
        `Total: ${formatoPesos(pedido.total)}`,
        `Pago: ${FORMAS_PAGO[pedido.forma_pago] || pedido.forma_pago}`,
        `Entrega: ${entrega}`
    );

    if (pedido.observaciones && pedido.observaciones.trim()) {
        lineas.push(`Comentarios: ${pedido.observaciones.trim()}`);
    }

    lineas.push("", "¡Gracias por elegirnos!");

    return {
        texto: lineas.join("\n"),

        // Variables para plantillas aprobadas (WhatsApp)
        variables: [
            nombre || "cliente",
            String(pedido.numero),
            pedido.items
                .map((i) => `${i.cantidad}x ${i.nombre}`)
                .join(", "),
            formatoPesos(pedido.total),
            entrega
        ]
    };
}

// -----------------------------------------------------
// Proveedores
// -----------------------------------------------------
async function enviarTwilio(telefonoIntl, mensaje) {

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;

    if (!sid || !token || !from) {
        throw new Error("Faltan TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM.");
    }

    const esWhatsApp = from.startsWith("whatsapp:");

    const body = new URLSearchParams({
        From: from,
        To: (esWhatsApp ? "whatsapp:" : "") + "+" + telefonoIntl
    });

    if (esWhatsApp && process.env.TWILIO_CONTENT_SID) {
        body.set("ContentSid", process.env.TWILIO_CONTENT_SID);
        body.set(
            "ContentVariables",
            JSON.stringify(
                Object.fromEntries(
                    mensaje.variables.map((v, i) => [String(i + 1), v])
                )
            )
        );
    } else {
        body.set("Body", mensaje.texto);
    }

    const r = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
            method: "POST",
            headers: {
                Authorization:
                    "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body
        }
    );

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
        throw new Error(`Twilio ${r.status}: ${data.message || "error"}`);
    }
}

async function enviarMeta(telefonoIntl, mensaje) {

    const token = process.env.META_WA_TOKEN;
    const phoneId = process.env.META_WA_PHONE_ID;
    const plantilla = process.env.META_WA_TEMPLATE;

    if (!token || !phoneId || !plantilla) {
        throw new Error("Faltan META_WA_TOKEN / META_WA_PHONE_ID / META_WA_TEMPLATE.");
    }

    const r = await fetch(
        `https://graph.facebook.com/v21.0/${phoneId}/messages`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: telefonoIntl,
                type: "template",
                template: {
                    name: plantilla,
                    language: { code: process.env.META_WA_LANG || "es" },
                    components: [
                        {
                            type: "body",
                            parameters: mensaje.variables.map((v) => ({
                                type: "text",
                                // Meta no admite saltos de línea en variables
                                text: String(v).replace(/\s*\n\s*/g, " ")
                            }))
                        }
                    ]
                }
            })
        }
    );

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
        throw new Error(
            `Meta ${r.status}: ${data.error?.message || "error"}`
        );
    }
}

// -----------------------------------------------------
// API pública
// -----------------------------------------------------
async function notificarPedidoConfirmado(pedidoId) {

    try {

        const proveedor = (process.env.NOTIF_PROVIDER || "off").toLowerCase();

        const pedido = await cargarPedido(pedidoId);

        if (!pedido) {
            console.warn(`Notificación: pedido ${pedidoId} no encontrado.`);
            return false;
        }

        if (!pedido.numero) {
            console.warn(`Notificación: el pedido ${pedidoId} todavía no tiene número.`);
            return false;
        }

        const mensaje = armarMensaje(pedido);

        if (proveedor === "off") {
            console.log(
                `📨 [NOTIF_PROVIDER=off] Mensaje del pedido #${pedido.numero} (no enviado):\n${mensaje.texto}`
            );
            return false;
        }

        const telefono = normalizarTelefono(pedido.cliente_telefono);

        if (!telefono) {
            console.warn(
                `Notificación: teléfono inválido en el pedido #${pedido.numero}: "${pedido.cliente_telefono}"`
            );
            return false;
        }

        if (proveedor === "twilio") {
            await enviarTwilio(telefono, mensaje);
        } else if (proveedor === "meta") {
            await enviarMeta(telefono, mensaje);
        } else {
            console.warn(`Notificación: NOTIF_PROVIDER desconocido: "${proveedor}"`);
            return false;
        }

        console.log(`📨 Confirmación del pedido #${pedido.numero} enviada.`);
        return true;

    } catch (error) {

        console.error(
            `❌ No se pudo notificar el pedido ${pedidoId}:`,
            error.message
        );
        return false;
    }
}

module.exports = {
    notificarPedidoConfirmado,
    normalizarTelefono,
    armarMensaje
};
