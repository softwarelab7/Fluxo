import { supabase } from './supabase';
import { Proveedor, Categoria, Marca, Producto, Pedido, PedidoItem } from '../types';

export const repository = {
    // --- PROVEEDORES ---
    async getProveedores() {
        const { data, error } = await supabase
            .from('proveedores')
            .select('*')
            .order('nombre', { ascending: true });
        if (error) throw error;
        return data as Proveedor[];
    },

    async addProveedor(proveedor: Omit<Proveedor, 'id'>) {
        const { data, error } = await supabase
            .from('proveedores')
            .insert([proveedor])
            .select()
            .single();
        if (error) throw error;
        return data as Proveedor;
    },

    async updateProveedor(id: string, updates: Partial<Proveedor>) {
        const { error } = await supabase
            .from('proveedores')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    async deleteProveedor(id: string) {
        const { error } = await supabase.from('proveedores').delete().eq('id', id);
        if (error) throw error;
    },

    // --- CATEGORIAS ---
    async getCategorias() {
        const { data, error } = await supabase
            .from('categorias')
            .select('*')
            .order('name', { ascending: true });
        if (error) throw error;
        return data as Categoria[];
    },

    async addCategoria(categoria: Omit<Categoria, 'id'>) {
        // Supabase generates ID automatically, so we remove 'id' if present or just pass props
        const { data, error } = await supabase
            .from('categorias')
            .insert([categoria])
            .select()
            .single();
        if (error) throw error;
        return data as Categoria;
    },

    async updateCategoria(id: string, updates: Partial<Categoria>) {
        const { error } = await supabase
            .from('categorias')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    async deleteCategoria(id: string) {
        const { error } = await supabase.from('categorias').delete().eq('id', id);
        if (error) throw error;
    },

    // --- MARCAS ---
    async getMarcas() {
        const { data, error } = await supabase
            .from('marcas')
            .select('*')
            .order('nombre', { ascending: true });
        if (error) throw error;
        return data as Marca[];
    },

    async addMarca(marca: Omit<Marca, 'id'>) {
        const { data, error } = await supabase
            .from('marcas')
            .insert([marca])
            .select()
            .single();
        if (error) throw error;
        return data as Marca;
    },

    async updateMarca(id: string, updates: Partial<Marca>) {
        const { error } = await supabase
            .from('marcas')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    async deleteMarca(id: string) {
        const { error } = await supabase.from('marcas').delete().eq('id', id);
        if (error) throw error;
    },

    // --- PRODUCTOS ---
    async getProductos() {
        const { data, error } = await supabase
            .from('productos')
            .select(`
        *,
        marca:marcas(*),
        categoria:categorias(*),
        proveedor:proveedores(*)
      `)
            .order('nombre', { ascending: true });

        if (error) throw error;
        return data as Producto[];
    },

    async addProducto(producto: Omit<Producto, 'id'>) {
        const { data, error } = await supabase
            .from('productos')
            .insert([producto])
            .select()
            .single();
        if (error) throw error;
        return data as Producto;
    },

    async deleteProducto(id: string) {
        const { error } = await supabase.from('productos').delete().eq('id', id);
        if (error) throw error;
    },

    async updateProducto(id: string, updates: Partial<Producto>) {
        const { error } = await supabase
            .from('productos')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    async updateStock(id: string, qtyToAdd: number) {
        // Fetch current stock first (atomicity can be improved with RPC but this works for now)
        const { data: prod, error: fetchError } = await supabase
            .from('productos')
            .select('stock_actual')
            .eq('id', id)
            .single();

        if (fetchError || !prod) throw fetchError || new Error("Producto no encontrado");

        const newStock = (prod.stock_actual || 0) + qtyToAdd;

        const { error } = await supabase
            .from('productos')
            .update({ stock_actual: newStock })
            .eq('id', id);

        if (error) throw error;
    },

    async setStock(id: string, newQuantity: number) {
        const { error } = await supabase
            .from('productos')
            .update({ stock_actual: newQuantity })
            .eq('id', id);

        if (error) throw error;
    },

    // --- PEDIDOS (Existencias y Pendientes) ---
    async createPedido(pedido: Omit<Pedido, 'id' | 'fecha_creacion'>) {
        const { data, error } = await supabase
            .from('pedidos')
            .insert([pedido])
            .select()
            .single();
        if (error) throw error;
        return data as Pedido;
    },

    async addPedidoItems(items: Omit<PedidoItem, 'id'>[]) {
        const { data, error } = await supabase
            .from('pedido_items')
            .insert(items)
            .select();
        if (error) throw error;
        return data as PedidoItem[];
    },

    async getPedidos() {
        const { data, error } = await supabase
            .from('pedidos')
            .select(`
                *,
                proveedor:proveedores(*),
                items:pedido_items(
                    producto:productos!producto_id(
                    marca:marcas(*),
                    proveedor:proveedores(*)
                ),
                producto_real:productos!producto_real_id(
                    *,
                    marca:marcas(*),
                    proveedor:proveedores(*)
                )
            )
            `)
            .order('fecha_creacion', { ascending: false });
        if (error) throw error;
        return data as Pedido[];
    },

    async getPedidoItems(pedidoId: string) {
        const { data, error } = await supabase
            .from('pedido_items')
            .select(`
                *,
                producto:productos!producto_id(
                    *,
                    marca:marcas(*),
                    proveedor:proveedores(*)
                ),
                producto_real:productos!producto_real_id(
                    *,
                    marca:marcas(*),
                    proveedor:proveedores(*)
                )
            `)
            .eq('pedido_id', pedidoId);
        if (error) throw error;
        return data as PedidoItem[];
    },

    async updatePedido(id: string, updates: Partial<Pedido>) {
        const { error } = await supabase
            .from('pedidos')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    async updatePedidoItem(id: string, updates: Partial<PedidoItem>) {
        const { error } = await supabase
            .from('pedido_items')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    async deletePedidoItem(id: string) {
        const { error } = await supabase.from('pedido_items').delete().eq('id', id);
        if (error) throw error;
    },

    async deletePedido(id: string) {
        // Items should cascade delete if FK is configured, but if not we might need to delete items first.
        // Assuming potential manual cleanup needed for safety if cascade isn't guaranteed.
        const { error: itemsError } = await supabase.from('pedido_items').delete().eq('pedido_id', id);
        if (itemsError) console.warn("Error cleaning up items or no items to delete", itemsError);

        const { error } = await supabase.from('pedidos').delete().eq('id', id);
        if (error) throw error;
    },

    async getProductHistory(productId: string) {
        const { data, error } = await supabase
            .from('pedido_items')
            .select(`
                *,
                pedido:pedidos!pedido_id(
                    *,
                    proveedor:proveedores(*)
                )
            `)
            .eq('producto_id', productId)
            .order('created_at', { ascending: false }); // Assuming created_at exists on items or sort by pedido date manually

        if (error) throw error;
        // Sort manually if needed or relying on DB sort
        return data.sort((a: any, b: any) =>
            new Date(b.pedido?.fecha_creacion || 0).getTime() - new Date(a.pedido?.fecha_creacion || 0).getTime()
        );
    }
};
