-- =====================================================
-- FLAME BURGER — ESQUEMA COMPLETO DE BASE DE DATOS
-- Ejecutar completo en el SQL Editor de Supabase
-- =====================================================

-- Podés correr esto en un proyecto nuevo o limpio.
-- Si ya tenías tablas con estos nombres, hacé backup antes.

DROP TABLE IF EXISTS detalle_pedidos CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS configuracion CASCADE;

-- =====================================================
-- CATEGORÍAS
-- =====================================================

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

-- =====================================================
-- PRODUCTOS
-- =====================================================

CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT DEFAULT '',
    precio NUMERIC(10, 2) NOT NULL CHECK (precio > 0),
    imagen TEXT DEFAULT '',
    disponible BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_productos_categoria ON productos(categoria_id);

-- =====================================================
-- CLIENTES
-- =====================================================

CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    telefono TEXT NOT NULL UNIQUE,
    direccion TEXT DEFAULT ''
);

-- =====================================================
-- PEDIDOS
-- =====================================================

CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    tipo_entrega TEXT NOT NULL CHECK (tipo_entrega IN ('delivery', 'retiro')),
    forma_pago TEXT NOT NULL CHECK (forma_pago IN ('efectivo', 'mercado_pago')),
    estado TEXT NOT NULL DEFAULT 'nuevo' CHECK (
        estado IN (
            'en_proceso_pago',
            'nuevo',
            'preparando',
            'listo',
            'entregado',
            'cancelado'
        )
    ),
    total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    observaciones TEXT DEFAULT '',

    -- Ubicación del cliente (solo delivery) y cálculo de envío
    cliente_lat NUMERIC(10, 7),
    cliente_lng NUMERIC(10, 7),
    distancia_km NUMERIC(6, 2),
    costo_envio NUMERIC(10, 2) NOT NULL DEFAULT 0,

    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_creado_en ON pedidos(creado_en);

-- =====================================================
-- DETALLE DE PEDIDOS
-- =====================================================

CREATE TABLE detalle_pedidos (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id) ON DELETE SET NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL
);

CREATE INDEX idx_detalle_pedido ON detalle_pedidos(pedido_id);

-- =====================================================
-- CONFIGURACIÓN (fila única — abierto/cerrado + reglas de envío)
-- =====================================================

CREATE TABLE configuracion (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    abierto BOOLEAN NOT NULL DEFAULT TRUE,

    -- Ubicación del local (San Martín 5306, Montevideo)
    local_lat NUMERIC(10, 7) NOT NULL DEFAULT -34.8266368,
    local_lng NUMERIC(10, 7) NOT NULL DEFAULT -56.1682700,

    -- Reglas de envío por distancia recta
    envio_gratis_hasta_km NUMERIC(5, 2) NOT NULL DEFAULT 3,
    envio_costo NUMERIC(10, 2) NOT NULL DEFAULT 100,
    envio_maximo_km NUMERIC(5, 2) NOT NULL DEFAULT 6,

    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO configuracion (id, abierto, local_lat, local_lng, envio_gratis_hasta_km, envio_costo, envio_maximo_km)
VALUES (1, TRUE, -34.8266368, -56.1682700, 3, 100, 6);

-- =====================================================
-- LISTO
-- =====================================================
