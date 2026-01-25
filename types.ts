
export type EstadoPedido = 'Pendiente' | 'En Camino' | 'Recibido' | 'Auditado' | 'Cancelado';
export type EstadoItem = 'Completo' | 'Incompleto' | 'No llegó' | 'Dañado';

export interface Categoria {
  id: string;
  name: string;
  parent_id?: string;
}

export interface Marca {
  id: string;
  nombre: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  contacto?: string;
  email?: string;
  telefono?: string;
}

export interface Producto {
  id: string;
  sku: string;
  nombre: string;
  marca_id: string;
  subcategoria_id: string;
  preferred_supplier_id?: string; // New field for provider filtering

  stock_actual: number;
  stock_minimo: number;
  is_high_rotation: boolean;
  // Joins
  marca?: Marca;
  categoria?: Categoria;
  proveedor?: Proveedor;
}

export interface Pedido {
  id: string;
  proveedor_id: string;
  estado: EstadoPedido;
  fecha_creacion: string;
  fecha_recepcion?: string;
  total_items: number;
  observaciones_generales?: string;
  // Joins
  proveedor?: Proveedor;
  items?: PedidoItem[];
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  producto_id: string;
  cantidad_pedida: number;
  cantidad_recibida: number;
  estado_item: EstadoItem;
  observaciones?: string;
  auditado_at?: string;
  // Joins
  producto?: Producto;
}
