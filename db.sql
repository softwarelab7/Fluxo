
-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Categorías (Jerárquica)
CREATE TABLE categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  parent_id UUID REFERENCES categorias(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Proveedores y Marcas
CREATE TABLE proveedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  contacto TEXT,
  email TEXT,
  telefono TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE marcas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Productos
CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  marca_id UUID REFERENCES marcas(id),
  subcategoria_id UUID REFERENCES categorias(id),
  preferred_supplier_id UUID REFERENCES proveedores(id), -- Campo nuevo para estrategia de pedidos
  imagen_url TEXT,
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 5,
  is_high_rotation BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Pedidos
CREATE TYPE estado_pedido AS ENUM ('Pendiente', 'En Camino', 'Recibido', 'Auditado', 'Cancelado');

CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proveedor_id UUID REFERENCES proveedores(id),
  estado estado_pedido DEFAULT 'Pendiente',
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_recepcion TIMESTAMP WITH TIME ZONE,
  total_items INTEGER DEFAULT 0,
  observaciones_generales TEXT
);

-- 5. Items de Pedidos
CREATE TYPE estado_item AS ENUM ('Completo', 'Incompleto', 'No llegó', 'Dañado');

CREATE TABLE pedido_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  cantidad_pedida INTEGER NOT NULL,
  cantidad_recibida INTEGER DEFAULT 0,
  estado_item estado_item DEFAULT 'No llegó',
  observaciones TEXT,
  auditado_at TIMESTAMP WITH TIME ZONE
);

-- Funciones para actualizar stock automáticamente tras auditoría (opcional si se hace por App logic)
-- Por ahora lo manejaremos en la lógica del Frontend para mayor control de errores
