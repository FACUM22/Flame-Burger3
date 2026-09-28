# Flame Burger — Proyecto actualizado

## ⚠️ Antes que nada: seguridad

Tu `.env` original tenía la contraseña real de Supabase y el
access token de Mercado Pago. Como ese archivo circuló, te
recomiendo **rotar ambas credenciales** antes de usar esto en
producción:

- Supabase → Configuración del proyecto → Database → Reset
  password.
- Mercado Pago → Tus integraciones → Credenciales → Regenerar
  Access Token de producción.

Después actualizá el archivo `server/.env` con los valores
nuevos. Nunca subas ese archivo a GitHub (ya está en
`.gitignore`, revisalo).

---

## 1. Base de datos (Supabase)

1. Entrá a tu proyecto de Supabase → **SQL Editor**.
2. Abrí el archivo `server/sql/schema.sql` de este proyecto,
   copiá todo el contenido y pegalo ahí.
3. Ejecutalo. Esto crea las tablas `categorias`, `productos`,
   `clientes`, `pedidos`, `detalle_pedidos` y `configuracion`,
   y ya deja cargada la ubicación del local (San Martín 5306,
   Montevideo) y las reglas de envío que definiste.

   > Si ya tenías datos cargados en una base vieja, este script
   > borra las tablas antes de crearlas de nuevo (`DROP TABLE`).
   > Hacé un respaldo antes si te importa no perder productos
   > ya cargados.

---

## 2. Backend

```bash
cd server
npm install
npm start
```

El servidor va a correr en el puerto de `PORT` (por defecto
3000) y sirve tanto la web pública como el panel admin.

- Web pública: `http://localhost:3000/`
- Checkout: `http://localhost:3000/checkout.html`
- Panel admin: `http://localhost:3000/admin/dashboard.html`

---

## 3. Qué se agregó / arregló

### 🚚 Delivery por distancia recta
- El checkout ahora tiene un **mapa** (Leaflet + OpenStreetMap,
  gratis, sin API key) donde el cliente marca su domicilio, y
  un botón de **GPS** para usar su ubicación automáticamente.
- La distancia se calcula en línea recta (fórmula de Haversine)
  desde el local (San Martín 5306) hasta esa ubicación.
- Reglas aplicadas (configurables desde el panel admin):
  - **0 a 3 km:** envío gratis
  - **3 a 6 km:** $100 de envío
  - **Más de 6 km:** no se permite hacer el pedido por delivery
- El cálculo se revalida siempre en el servidor (no se confía
  en lo que mande el navegador), así que no se puede manipular
  desde la consola del navegador.

### 🔒 Abrir / cerrar el local
- Nueva página **Configuración** en el panel admin
  (`/admin/configuracion.html`), con un botón para abrir o
  cerrar el local.
- Al cerrar el local:
  - La web pública muestra "Cerrado" en el header y no deja
    avanzar al checkout.
  - El checkout muestra una pantalla de "Estamos cerrados" y
    bloquea el botón de confirmar.
  - El servidor rechaza cualquier pedido igual, aunque alguien
    intente saltarse el frontend.
- También podés tocar directamente el bloque "Local
  abierto/cerrado" del sidebar en cualquier página del panel
  admin — es un atajo rápido al mismo interruptor.

### 🔔 Sonido de aviso en el panel admin
- Cuando entra un pedido nuevo, el panel admin reproduce un
  sonido (generado con Web Audio, no depende de ningún archivo
  de audio) sin importar en qué página del admin estés.
- Los navegadores bloquean el audio hasta la primera
  interacción del usuario — apenas hagas un click en cualquier
  parte del panel, el sonido queda habilitado.

### 🗄️ Base de datos
- Script `server/sql/schema.sql` completo, con la nueva tabla
  `configuracion` (abierto/cerrado + reglas de envío) y las
  columnas nuevas en `pedidos` para guardar la ubicación del
  cliente, la distancia y el costo de envío de cada pedido.

### 🐛 Bugs que encontré y arreglé de paso
- `frontend/js/menu.js` y `frontend/js/checkout.js` llamaban a
  la API con una URL vieja (`onrender.com`) o con
  `localhost:3000` fijo. Ahora usan rutas relativas, así
  funcionan tanto en tu compu como en cualquier servidor donde
  lo despliegues.
- Lo mismo pasaba en **todo** el panel admin
  (`categorias.js`, `productos.js`, `dashboard.js`,
  `ventas.js`): apuntaban a `localhost:3000` fijo, por lo que
  el panel no iba a funcionar fuera de tu computadora. Ya está
  corregido.
- En `admin/dashboard.html`, el link de "Ventas" del menú
  lateral estaba marcado como activo por error (junto con
  Dashboard), y el link de "Categorías" no llevaba a ningún
  lado (`href="#"`). Corregido.
- En `admin/pedidos.html` pasaba lo mismo con el link de
  "Categorías". Corregido.

---

## 4. Notas

- El costo de envío y las distancias son configurables desde
  `/admin/configuracion.html` sin tocar código.
- Si el local se muda de dirección, hay que actualizar
  `local_lat` / `local_lng` directamente en la tabla
  `configuracion` de Supabase (por ahora no hay un mapa para
  reubicarlo desde el panel, solo se editan las reglas de
  envío).
