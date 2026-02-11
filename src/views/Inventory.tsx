import React, { useState, useEffect, useMemo } from 'react';
import GlassCard from '../components/GlassCard';
import {
  Search,
  Plus,
  Download,
  Filter,
  Edit2,
  Trash2,
  Package,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  AlertOctagon,
  Tag,
  Truck,
  TrendingUp,
  Hash,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  List
} from 'lucide-react';
import { repository } from '../services/repository';
import CustomSelect from '../components/CustomSelect';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import XLSX from 'xlsx-js-style';
import { Producto, Marca, Categoria } from '../types';
import { Skeleton } from '../components/Skeleton';

const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Producto[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  // Layout & Filter State (Matching Orders)
  const [orderMode, setOrderMode] = useState<'PROVIDER' | 'CATEGORY'>('CATEGORY');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProvFilter, setSelectedProvFilter] = useState<string | null>(null);
  const [showHighRotation, setShowHighRotation] = useState(false);
  const [showMediumRotation, setShowMediumRotation] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { addToast } = useToast();

  const [newProduct, setNewProduct] = useState({
    sku: '',
    nombre: '',
    marca_id: '',
    subcategoria_id: '',
    stock_actual: 0,
    stock_minimo: 0,
    rotacion: 'media',
    preferred_supplier_id: '' // added for consistency
  });

  useEffect(() => {
    loadData();
  }, []);

  // Effect: Auto-expand parent category when a subcategory is selected
  useEffect(() => {
    if (selectedCategory && categorias.length > 0) {
      const cat = categorias.find(c => c.id === selectedCategory);
      if (cat && cat.parent_id) {
        setExpandedCategories(prev => {
          const next = new Set(prev);
          next.add(cat.parent_id);
          return next;
        });
      }
    }
  }, [selectedCategory, categorias]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, brands, cats, provs] = await Promise.all([
        repository.getProductos(),
        repository.getMarcas(),
        repository.getCategorias(),
        repository.getProveedores()
      ]);
      setProducts(prods);
      setMarcas(brands);
      setCategorias(cats);
      setProveedores(provs.map(p => ({ ...p, is_active: p.is_active ?? true })));
    } catch (error) {
      console.error("Error loading inventory:", error);
      addToast("Error al cargar inventario", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // 1. Structure Data
    const headers = ['REFERENCIA', 'PRODUCTO', 'MARCA', 'CATEGORÍA', 'SUBCATEGORÍA', 'STOCK ACTUAL', 'STOCK MÍNIMO', 'ROTACIÓN'];
    const title = "INVENTARIO MAESTRO";

    const rows = products.map(p => {
      const subCat = categorias.find(c => c.id === p.subcategoria_id);
      const parentCat = subCat?.parent_id
        ? categorias.find(c => c.id === subCat.parent_id)
        : (subCat?.parent_id === null ? subCat : undefined);

      const categoryName = parentCat?.name || (subCat?.parent_id ? 'Desconocida' : subCat?.name);
      const subCategoryName = parentCat ? subCat?.name : '';

      return [
        p.sku,
        p.nombre,
        p.marca?.nombre,
        categoryName,
        subCategoryName,
        p.stock_actual,
        p.stock_minimo,
        p.rotacion ? p.rotacion.charAt(0).toUpperCase() + p.rotacion.slice(1) : 'Media'
      ];
    });

    // Calculate Totals
    const totalStock = products.reduce((sum, p) => sum + p.stock_actual, 0);
    const totalMinStock = products.reduce((sum, p) => sum + p.stock_minimo, 0);

    const ws_data = [
      [title],
      headers,
      ...rows,
      ['', '', '', '', 'TOTALES', totalStock, totalMinStock, ''] // Totals Row
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Merge Title
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }); // Merge 8 cols

    // Configure Freeze Panes (Freeze top 2 rows)
    const splitRow = 2; // Rows 0 and 1 are frozen
    ws['!freeze'] = { xSplit: 0, ySplit: splitRow, topLeftCell: `A${splitRow + 1}`, activePane: 'bottomLeft', state: 'frozen' };

    // Configure AutoFilter (Applies to headers and data)
    // Range starts at A2 (Row index 1) to H(lastRow)
    const range = XLSX.utils.decode_range(ws['!ref']!);
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: range.e.r - 1, c: 7 } }) }; // Exclude total row from filter if desired, or include. Usually exclude totals.

    // Styles
    const borderStyle = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    };

    const titleStyle = {
      font: { name: "Calibri", sz: 16, bold: true, color: { rgb: "4472C4" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "FFFFFF" } }
    };

    const headerStyle = {
      fill: { fgColor: { rgb: "F8CBAD" } }, // Salmon
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: borderStyle
    };

    const cellStyle = {
      font: { name: "Calibri", sz: 11 },
      alignment: { horizontal: "center", vertical: "center" },
      border: borderStyle
    };

    const totalLabelStyle = {
      font: { name: "Calibri", sz: 11, bold: true },
      alignment: { horizontal: "right", vertical: "center" },
      fill: { fgColor: { rgb: "E2EFDA" } }, // Light Green match? or just bold
      border: borderStyle
    };

    const totalValueStyle = {
      font: { name: "Calibri", sz: 11, bold: true },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "E2EFDA" } },
      border: borderStyle
    };

    // Apply Styles
    // const range = XLSX.utils.decode_range(ws['!ref']!); // Range already decoded above, but recalculate if ref changed (it didn't really, but be safe)
    const finalRange = XLSX.utils.decode_range(ws['!ref']!);

    for (let R = finalRange.s.r; R <= finalRange.e.r; ++R) {
      for (let C = finalRange.s.c; C <= finalRange.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cell_address]) continue;

        if (R === 0) ws[cell_address].s = titleStyle;
        else if (R === 1) ws[cell_address].s = headerStyle;
        else if (R === finalRange.e.r) {
          // Totals Row
          if (C === 4) ws[cell_address].s = totalLabelStyle;
          else if (C === 5 || C === 6) ws[cell_address].s = totalValueStyle;
          else ws[cell_address].s = totalValueStyle; // Apply generic total style to empty cells in total row too? Or just keep empty.
        }
        else {
          // Highlight Stock Actual (Index 5)
          if (C === 5) {
            ws[cell_address].s = {
              ...cellStyle,
              fill: { fgColor: { rgb: "BDD7EE" } },
              font: { name: "Calibri", sz: 11, bold: true }
            };
          } else {
            ws[cell_address].s = cellStyle;
          }
        }
      }
    }

    // Column Widths
    ws['!cols'] = [
      { wch: 15 }, // Ref
      { wch: 35 }, // Prod
      { wch: 15 }, // Marca
      { wch: 20 }, // Cat
      { wch: 20 }, // Sub
      { wch: 12 }, // Stock Actual
      { wch: 12 }, // Stock Min
      { wch: 10 }, // Rot
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "Inventario_Fluxo.xlsx");
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmation(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      await repository.deleteProducto(deleteConfirmation);
      await loadData();
      addToast("Producto eliminado correctamente", "success");
    } catch (error) {
      console.error(error);
      addToast("Error al eliminar producto", "error");
    } finally {
      setDeleteConfirmation(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newProduct,
        marca_id: newProduct.marca_id || marcas[0]?.id,
        // If subcategory is empty, try to use the selected parent category. Only default to [0] if absolutely nothing is selected.
        subcategoria_id: newProduct.subcategoria_id || selectedParentId || categorias[0]?.id
      };

      if (editingProduct) {
        await repository.updateProducto(editingProduct.id, payload);
      } else {
        await repository.addProducto(payload);
      }

      await loadData();
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      console.error(error);
      const msg = error.message || "";
      // Check for both old and new constraint names just in case
      if (msg.includes("duplicate key") || msg.includes("productos_sku_key") || msg.includes("productos_sku_marca_key")) {
        addToast("Error: La referencia ya existe para la marca seleccionada.", "error");
      } else {
        addToast("Error al guardar producto: " + msg, "error");
      }
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setSelectedParentId('');
    setNewProduct({
      sku: '',
      nombre: '',
      marca_id: '',
      subcategoria_id: '',
      stock_actual: 0,
      stock_minimo: 5,
      rotacion: 'media',
      preferred_supplier_id: ''
    });
  };

  const handleEdit = (p: Producto) => {
    setEditingProduct(p);
    // Find parent category
    const currentCat = categorias.find(c => c.id === p.subcategoria_id);
    if (currentCat && currentCat.parent_id) {
      setSelectedParentId(currentCat.parent_id);
    } else {
      // If it has no parent_id, it might be a top-level category itself
      setSelectedParentId(currentCat ? currentCat.id : '');
    }

    setNewProduct({
      sku: p.sku,
      nombre: p.nombre,
      marca_id: p.marca_id,
      subcategoria_id: p.subcategoria_id,
      stock_actual: p.stock_actual,
      stock_minimo: p.stock_minimo,
      rotacion: p.rotacion || 'media',
      preferred_supplier_id: p.preferred_supplier_id || ''
    });
    setShowAddModal(true);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  // Enhanced Filtering Logic
  const filtered = products.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());

    // If searching, ignore context
    if (searchTerm.trim() !== '') {
      return matchesSearch;
    }

    // High Rotation Filter (Global)
    if (showHighRotation) {
      if (p.rotacion !== 'alta') return false;
      return true;
    }

    // Medium Rotation Filter (Global)
    if (showMediumRotation) {
      if (p.rotacion !== 'media') return false;
      return true;
    }

    let matchesContext = false;
    if (orderMode === 'PROVIDER') {
      if (!selectedProvFilter) return true; // Show all if no provider selected? Or none? Let's show all or prompt
      matchesContext = p.preferred_supplier_id === selectedProvFilter;
    } else {
      if (!selectedCategory) return true; // Show all if no category
      const productCat = categorias.find(c => c.id === p.subcategoria_id);
      // Logic: Match exactly, OR match if parent is selected
      matchesContext = p.subcategoria_id === selectedCategory ||
        p.categoria_id === selectedCategory || // Fallback if regular cat
        productCat?.parent_id === selectedCategory;
    }

    return matchesContext;
  });


  // Derived State for Context Title
  const activeContextName = useMemo(() => {
    if (showHighRotation) return 'Alta Rotación (Global)';
    if (showMediumRotation) return 'Media Rotación (Global)';

    return orderMode === 'PROVIDER'
      ? (proveedores.find(p => p.id === selectedProvFilter)?.nombre || 'Todos los Proveedores')
      : (categorias.find(c => c.id === selectedCategory)?.name || 'Todas las Categorías');
  }, [orderMode, selectedProvFilter, selectedCategory, proveedores, categorias, showHighRotation, showMediumRotation]);

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)] space-y-4 p-4 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>

        <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
          {/* Sidebar Skeleton */}
          <div className="col-span-2 hidden lg:flex flex-col gap-4">
            <Skeleton className="h-8 w-24" />
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>

          {/* Grid Skeleton */}
          <div className="col-span-12 lg:col-span-10 flex flex-col gap-4">
            {/* Search Bar Skeleton */}
            <Skeleton className="h-20 w-full rounded-2xl" />

            {/* Product Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }



  return (
    <>
      <div className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Actions (Top Bar) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 shrink-0">
          <div>
            <h2 className="text-2xl font-bold dark:text-white">Inventario</h2>
            <p className="text-slate-400 text-sm">Gestión de catálogo y existencias</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-white/5 mr-2">
              <button
                onClick={() => setOrderMode('PROVIDER')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${orderMode === 'PROVIDER' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Por Proveedor
              </button>
              <button
                onClick={() => setOrderMode('CATEGORY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${orderMode === 'CATEGORY' ? 'bg-white dark:bg-violet-600 text-violet-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Por Categoría
              </button>
            </div>

            <button onClick={handleExport} className="flex items-center px-4 py-2 bg-white dark:bg-[#1e293b] rounded-xl text-xs font-bold hover:bg-emerald-50 dark:hover:bg-[#1e293b] text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200 dark:border-emerald-500/30">
              <Download size={14} className="mr-2" /> Excel
            </button>
            <button onClick={handleOpenAdd} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg text-white">
              <Plus size={14} className="mr-2" /> Nuevo Producto
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">

          {/* LEFT SIDEBAR - FILTERS */}
          <div className="col-span-2 hidden lg:flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pb-20 animate-in slide-in-from-left-6 duration-500">

            {/* List */}
            <div className="space-y-1">
              <h3 className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3 pl-2">
                {orderMode === 'PROVIDER' ? 'Proveedores' : 'Categorías'}
              </h3>

              {orderMode === 'PROVIDER' ? (
                proveedores
                  .filter(p => p.is_active !== false)
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProvFilter(p.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between group ${selectedProvFilter === p.id
                        ? 'bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-600/20'
                        : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                    >
                      <span className="truncate">{p.nombre}</span>
                      {selectedProvFilter === p.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                    </button>
                  ))
              ) : (
                // Categories Tree
                <div className="space-y-2">
                  {categorias.filter(c => !c.parent_id).map(cat => {
                    const isSelected = selectedCategory === cat.id;
                    const hasSubs = categorias.some(sub => sub.parent_id === cat.id);
                    const isExpanded = expandedCategories.has(cat.id);
                    const isParentOfSelected = categorias.find(c => c.id === selectedCategory)?.parent_id === cat.id;

                    const toggleExpand = (e: React.MouseEvent, catId: string) => {
                      e.stopPropagation();
                      setExpandedCategories(prev => {
                        const next = new Set(prev);
                        if (next.has(catId)) next.delete(catId);
                        else next.add(catId);
                        return next;
                      });
                    };

                    return (
                      <div key={cat.id}>
                        <div className={`flex items-center w-full rounded-lg transition-all group ${(isSelected || isParentOfSelected)
                          ? 'bg-violet-50 dark:bg-violet-600/10 border border-violet-200 dark:border-violet-600/20'
                          : 'hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'
                          }`}>
                          <button
                            onClick={(e) => {
                              setSelectedCategory(cat.id);
                              if (hasSubs) {
                                if (isExpanded || !isParentOfSelected) {
                                  toggleExpand(e, cat.id);
                                }
                              }
                            }}
                            className={`flex-1 text-left px-3 py-2.5 text-xs font-bold ${(isSelected || isParentOfSelected) ? 'text-violet-600 dark:text-violet-400' : 'text-slate-600 dark:text-slate-400'
                              }`}
                          >
                            {cat.name}
                          </button>

                          {hasSubs && (
                            <button
                              onClick={(e) => toggleExpand(e, cat.id)}
                              className={`p-2 mr-1 rounded-md transition-colors ${(isSelected || isParentOfSelected)
                                ? 'text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20'
                                : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                                }`}
                            >
                              {isExpanded || isParentOfSelected ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          )}
                        </div>

                        {isExpanded && hasSubs && (
                          <div className="ml-3 mt-1 pl-3 border-l-2 border-slate-100 dark:border-slate-800 space-y-1 animate-in slide-in-from-top-1 duration-200">
                            {categorias.filter(s => s.parent_id === cat.id).map(sub => (
                              <button
                                key={sub.id}
                                onClick={() => setSelectedCategory(sub.id)}
                                className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors ${selectedCategory === sub.id
                                  ? 'text-violet-600 bg-violet-50 dark:bg-violet-500/10'
                                  : 'text-slate-400 hover:text-slate-600'
                                  }`}
                              >
                                {sub.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* MAIN CONTENT (Grid) */}
          <div className="col-span-12 lg:col-span-10 flex flex-col min-h-0 animate-in fade-in zoom-in-95 duration-500 delay-100">

            {/* Header / Search */}
            <div className="mb-4 bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative group w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Buscar en todo el inventario..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowHighRotation(!showHighRotation);
                      if (!showHighRotation) setShowMediumRotation(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showHighRotation
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                  >
                    <TrendingUp size={14} />
                    <span>Alta Rotación</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMediumRotation(!showMediumRotation);
                      if (!showMediumRotation) setShowHighRotation(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showMediumRotation
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                  >
                    <TrendingUp size={14} className={showMediumRotation ? "rotate-90" : ""} />
                    <span>Media Rotación</span>
                  </button>
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {activeContextName}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {filtered.length} productos encontrados
                  </p>
                </div>
              </div>
            </div>

            {/* Grid */}
            <div className="overflow-y-auto pr-2 custom-scrollbar pb-20 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {filtered.map(p => (
                  <div key={p.id} className="bg-white dark:bg-[#1e293b] rounded-2xl p-4 border border-slate-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all duration-300 group shadow-sm hover:shadow-md flex flex-col h-full relative overflow-hidden hover:-translate-y-1">

                    {/* Decorative Background Icon */}
                    <div className="absolute -right-4 -bottom-4 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-125 transition-transform duration-500 pointer-events-none">
                      <Package size={100} />
                    </div>

                    {/* Rotation Badge only if High or Low or Medium */}
                    {p.rotacion === 'alta' && (
                      <div className="absolute top-0 right-0">
                        <div className="w-0 h-0 border-t-[12px] border-r-[12px] border-l-[12px] border-b-[12px] border-t-rose-500 border-r-rose-500 border-l-transparent border-b-transparent rounded-bl-sm shadow-sm" title="Alta Rotación"></div>
                      </div>
                    )}
                    {p.rotacion === 'media' && (
                      <div className="absolute top-0 right-0">
                        <div className="w-0 h-0 border-t-[12px] border-r-[12px] border-l-[12px] border-b-[12px] border-t-amber-400 border-r-amber-400 border-l-transparent border-b-transparent rounded-bl-sm shadow-sm" title="Media Rotación"></div>
                      </div>
                    )}
                    {p.rotacion === 'baja' && (
                      <div className="absolute top-0 right-0">
                        <div className="w-0 h-0 border-t-[12px] border-r-[12px] border-l-[12px] border-b-[12px] border-t-slate-300 border-r-slate-300 border-l-transparent border-b-transparent rounded-bl-sm shadow-sm" title="Baja Rotación"></div>
                      </div>
                    )}

                    {/* Top Tags */}
                    <div className="flex flex-wrap gap-2 mb-3 items-center">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 capitalize">
                        {p.marca?.nombre?.toLowerCase() || 'genérico'}
                      </span>
                      {p.subcategoria_id && (
                        <span className="text-[10px] font-bold text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-100 dark:border-violet-500/20 capitalize">
                          {categorias.find(c => c.id === p.subcategoria_id)?.name?.toLowerCase()}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 mb-4">
                      <h4 className="font-bold text-base text-slate-800 dark:text-slate-100 leading-snug mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {p.nombre}
                      </h4>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-50 dark:bg-slate-900 px-1.5 rounded">
                          {p.sku}
                        </span>


                        <div className="flex items-center gap-1.5">
                          {/* Stock Removed */}
                        </div>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="mt-auto border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center gap-2 relative z-10">
                      <button
                        onClick={() => handleEdit(p)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit2 size={12} /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteClick(p.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {filtered.length === 0 && (
                  <div className="col-span-full py-20 text-center">
                    <Package size={48} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-400 text-sm">No se encontraron productos.</p>
                    {searchTerm && <p className="text-slate-400 text-xs mt-1">Intenta con otro término de búsqueda.</p>}
                  </div>
                )}
              </div>
            </div>
          </div>


        </div >
      </div >

      {/* Add Modal */}
      {
        showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <GlassCard hoverEffect={false} className="w-full max-w-5xl shadow-2xl shadow-blue-500/20 border-blue-100 dark:border-blue-900/30 bg-white dark:bg-[#1e293b] flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-start px-8 py-6 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 shrink-0 relative overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${editingProduct ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                    {editingProduct ? <Edit2 size={24} /> : <Package size={24} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                      {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {editingProduct ? 'Modifique los datos del inventario' : 'Complete la ficha técnica del ítem'}
                    </p>
                  </div>
                </div>

                {/* Decorative background circle */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

                <button
                  onClick={() => setShowAddModal(false)}
                  className="relative z-10 p-2 hover:bg-white/80 dark:hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:shadow-sm"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Form Body - Taller Layout */}
              <div className="p-10">
                <form onSubmit={handleSubmit} className="flex flex-col gap-10">

                  {/* Row 1: Basics & Classification */}
                  <div className="grid grid-cols-12 gap-6 items-end">
                    <div className="col-span-6 md:col-span-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">SKU</label>
                      <input required type="text" value={newProduct.sku} onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-lg px-3 h-11 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 dark:text-white" placeholder="7668" />
                    </div>
                    <div className="col-span-6 md:col-span-4">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Producto</label>
                      <input required type="text" value={newProduct.nombre} onChange={e => setNewProduct({ ...newProduct, nombre: e.target.value })} className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700 rounded-lg px-3 h-11 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 dark:text-white" placeholder="Nombre completo..." />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Marca</label>
                      <CustomSelect
                        value={newProduct.marca_id}
                        onChange={(val) => setNewProduct({ ...newProduct, marca_id: val })}
                        options={marcas.map(m => ({ value: m.id, label: m.nombre }))}
                        placeholder="Marca..."
                        className="text-sm h-11"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Proveedor</label>
                      <CustomSelect
                        value={newProduct.preferred_supplier_id}
                        onChange={(val) => setNewProduct({ ...newProduct, preferred_supplier_id: val })}
                        options={proveedores.filter(p => (p.is_active !== false) || (editingProduct && editingProduct.preferred_supplier_id === p.id)).map(p => ({ value: p.id, label: p.nombre }))}
                        placeholder="Proveedor..."
                        className="text-sm h-11"
                      />
                    </div>
                  </div>

                  {/* Row 2: Categories, Stock & Action */}
                  <div className="grid grid-cols-12 gap-6 items-end">
                    <div className="col-span-6 md:col-span-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Categoría</label>
                      <CustomSelect
                        value={selectedParentId}
                        onChange={(val) => {
                          setSelectedParentId(val);
                          setNewProduct({ ...newProduct, subcategoria_id: '' });
                        }}
                        options={categorias.filter(c => !c.parent_id).map(c => ({ value: c.id, label: c.name }))}
                        placeholder="Categoría..."
                        className="text-sm h-11"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Subcategoría</label>
                      <CustomSelect
                        value={newProduct.subcategoria_id}
                        onChange={(val) => setNewProduct({ ...newProduct, subcategoria_id: val })}
                        options={categorias.filter(c => c.parent_id === selectedParentId).map(c => ({ value: c.id, label: c.name }))}
                        placeholder="Sub..."
                        disabled={!selectedParentId}
                        className="text-sm h-11"
                      />
                    </div>
                    {/* Stock Inputs Removed */}

                    <div className="col-span-6 md:col-span-6 flex items-center gap-4 pl-4 border-l border-slate-100 dark:border-white/5 h-11">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Rotación</label>
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 h-11">
                          <button
                            type="button"
                            onClick={() => setNewProduct({ ...newProduct, rotacion: 'baja' })}
                            className={`flex-1 rounded-md text-xs font-bold transition-all ${newProduct.rotacion === 'baja' ? 'bg-white dark:bg-slate-700 text-slate-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            Baja
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewProduct({ ...newProduct, rotacion: 'media' })}
                            className={`flex-1 rounded-md text-xs font-bold transition-all ${(!newProduct.rotacion || newProduct.rotacion === 'media') ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            Media
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewProduct({ ...newProduct, rotacion: 'alta' })}
                            className={`flex-1 rounded-md text-xs font-bold transition-all ${newProduct.rotacion === 'alta' ? 'bg-white dark:bg-slate-700 text-rose-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            Alta
                          </button>
                        </div>
                      </div>
                      <button type="submit" className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center gap-2 self-end">
                        <Plus size={18} />
                        <span>{editingProduct ? 'Guardar' : 'Crear'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </GlassCard>
          </div>
        )
      }

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        title="Confirmar Eliminación"
        maxWidth="sm:max-w-md"
        footer={
          <>
            <button
              onClick={() => setDeleteConfirmation(null)}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-rose-600/20 transition-all"
            >
              Eliminar Producto
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center p-4">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
            <Trash2 size={24} className="text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 mb-2">
            ¿Estás seguro de que deseas eliminar este producto?
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Esta acción no se puede deshacer.
          </p>
        </div>
      </Modal>
    </>
  );
};

export default Inventory;
