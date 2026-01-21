
import { Categoria, Marca, Producto, Proveedor, Pedido, PedidoItem } from '../types';

const INITIAL_CATEGORIAS: Categoria[] = [
  { id: 'c1', name: 'Motor' },
  { id: 'c2', name: 'Frenos' },
  { id: 'c3', name: 'Filtros de Aceite', parent_id: 'c1' },
  { id: 'c4', name: 'Pastillas', parent_id: 'c2' },
];

const INITIAL_MARCAS: Marca[] = [
  { id: 'm1', nombre: 'Brembo' },
  { id: 'm2', nombre: 'Castrol' },
  { id: 'm3', nombre: 'Bosch' },
];

const INITIAL_PROVEEDORES: Proveedor[] = [
  { id: 'p1', nombre: 'Distribuidora Automotriz S.A.', contacto: 'Juan Perez', email: 'ventas@distriauto.com', telefono: '555-0101' },
  { id: 'p2', nombre: 'Repuestos Globales', contacto: 'Maria Garcia', email: 'm.garcia@rglobales.com', telefono: '555-0202' },
];

const INITIAL_PRODUCTOS: Producto[] = [
  { id: 'pr1', sku: 'BOS-OIL-001', nombre: 'Filtro Aceite Premium', marca_id: 'm3', subcategoria_id: 'c3', preferred_supplier_id: 'p1', stock_actual: 12, stock_minimo: 15, is_high_rotation: true, imagen_url: 'https://picsum.photos/seed/oil/200/200' },
  { id: 'pr2', sku: 'BRE-BRK-99', nombre: 'Pastillas Freno Cerámica', marca_id: 'm1', subcategoria_id: 'c4', preferred_supplier_id: 'p2', stock_actual: 4, stock_minimo: 8, is_high_rotation: false, imagen_url: 'https://picsum.photos/seed/break/200/200' },
  { id: 'pr3', sku: 'CAS-OIL-X', nombre: 'Aceite 5W30 Sintético', marca_id: 'm2', subcategoria_id: 'c3', preferred_supplier_id: 'p1', stock_actual: 45, stock_minimo: 20, is_high_rotation: true, imagen_url: 'https://picsum.photos/seed/castrol/200/200' },
];

const getStored = <T,>(key: string, initial: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : initial;
};

const setStored = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

class MockDatabase {
  categorias: Categoria[] = getStored('logicheck_cat', INITIAL_CATEGORIAS);
  marcas: Marca[] = getStored('logicheck_marcas', INITIAL_MARCAS);
  proveedores: Proveedor[] = getStored('logicheck_prov', INITIAL_PROVEEDORES);
  productos: Producto[] = getStored('logicheck_prod', INITIAL_PRODUCTOS);
  pedidos: Pedido[] = getStored('logicheck_pedidos', []);
  pedidoItems: PedidoItem[] = getStored('logicheck_pitems', []);

  save() {
    setStored('logicheck_cat', this.categorias);
    setStored('logicheck_marcas', this.marcas);
    setStored('logicheck_prov', this.proveedores);
    setStored('logicheck_prod', this.productos);
    setStored('logicheck_pedidos', this.pedidos);
    setStored('logicheck_pitems', this.pedidoItems);
  }

  reset() {
    localStorage.clear();
    window.location.reload();
  }

  getProductos() {
    return this.productos.map(p => ({
      ...p,
      marca: this.marcas.find(m => m.id === p.marca_id),
      categoria: this.categorias.find(c => c.id === p.subcategoria_id),
      proveedor: this.proveedores.find(prov => prov.id === p.preferred_supplier_id)
    }));
  }

  addCategoria(name: string, parent_id?: string) {
    const newCat = { 
      id: 'c' + Math.random().toString(36).substr(2, 9), 
      name, 
      parent_id 
    };
    this.categorias.push(newCat);
    this.save();
    return newCat;
  }

  updateCategoria(id: string, newName: string) {
    const cat = this.categorias.find(c => c.id === id);
    if (cat) {
      cat.name = newName;
      this.save();
    }
  }

  deleteCategoria(id: string) {
    this.categorias = this.categorias.filter(c => c.id !== id && c.parent_id !== id);
    this.save();
  }

  addMarca(nombre: string) {
    const newMarca = { 
      id: 'm' + Math.random().toString(36).substr(2, 9), 
      nombre 
    };
    this.marcas.push(newMarca);
    this.save();
    return newMarca;
  }

  updateMarca(id: string, newNombre: string) {
    const marca = this.marcas.find(m => m.id === id);
    if (marca) {
      marca.nombre = newNombre;
      this.save();
    }
  }

  deleteMarca(id: string) {
    this.marcas = this.marcas.filter(m => m.id !== id);
    this.save();
  }

  addProduct(p: Omit<Producto, 'id'>) {
    const newProduct = { ...p, id: Math.random().toString(36).substr(2, 9) };
    this.productos.unshift(newProduct);
    this.save();
    return newProduct;
  }

  deleteProduct(id: string) {
    this.productos = this.productos.filter(p => p.id !== id);
    this.save();
  }

  addSupplier(s: Omit<Proveedor, 'id'>) {
    const newSupplier = { ...s, id: Math.random().toString(36).substr(2, 9) };
    this.proveedores.unshift(newSupplier);
    this.save();
  }

  updateSupplier(id: string, data: Partial<Proveedor>) {
    const idx = this.proveedores.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.proveedores[idx] = { ...this.proveedores[idx], ...data };
      this.save();
    }
  }

  deleteSupplier(id: string) {
    this.proveedores = this.proveedores.filter(s => s.id !== id);
    this.save();
  }

  updateStock(productId: string, qtyToAdd: number) {
    const p = this.productos.find(prod => prod.id === productId);
    if (p) {
      p.stock_actual += qtyToAdd;
      this.save();
    }
  }

  createPedido(proveedorId: string, items: { productId: string, qty: number }[]) {
    const pedido: Pedido = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      proveedor_id: proveedorId,
      estado: 'Pendiente',
      fecha_creacion: new Date().toISOString(),
      total_items: items.length,
      proveedor: this.proveedores.find(p => p.id === proveedorId)
    };

    const pItems: PedidoItem[] = items.map(i => ({
      id: Math.random().toString(36).substr(2, 9),
      pedido_id: pedido.id,
      producto_id: i.productId,
      cantidad_pedida: i.qty,
      cantidad_recibida: 0,
      estado_item: 'No llegó',
      producto: this.productos.find(p => p.id === i.productId)
    }));

    this.pedidos.unshift(pedido);
    this.pedidoItems.push(...pItems);
    this.save();
    return pedido;
  }
}

export const db = new MockDatabase();
