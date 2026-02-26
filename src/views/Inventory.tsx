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
  List,
  Clock,
  Upload,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import { repository } from '../services/repository';
import CustomSelect from '../components/CustomSelect';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import XLSX from 'xlsx-js-style';
import * as XLSXReader from 'xlsx'; // For reading
import { Producto, Marca, Categoria } from '../types';
import { Skeleton } from '../components/Skeleton';

import { useSearchParams } from 'react-router-dom';

const Inventory: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importLogs, setImportLogs] = useState<string[]>([]);

  // History State
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [productHistory, setProductHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handlePrintLabel = (p: Producto) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Etiqueta - ${p.sku}</title>
          <style>
            @page { size: 50mm 25mm; margin: 0; }
            body { 
              font-family: 'Inter', sans-serif; 
              display: flex; 
              flex-direction: column; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0;
              text-align: center;
              padding: 5mm;
            }
            .sku { font-size: 24px; font-weight: 900; margin-bottom: 2px; letter-spacing: -0.5px; }
            .brand { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .name { font-size: 12px; font-weight: 500; color: #1e293b; max-width: 40mm; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="brand">${p.marca?.nombre || 'FLUJO'}</div>
          <div class="sku">${p.sku}</div>
          <div class="name">${p.nombre}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const [newProduct, setNewProduct] = useState({
    sku: '',
    nombre: '',
    marca_id: '',
    subcategoria_id: '',
    preferred_supplier_id: '',
    rotacion: 'media' as 'alta' | 'media' | 'baja'
  });

  useEffect(() => {
    // Reset all filter states initially
    setShowHighRotation(false);
    setShowMediumRotation(false);
    setSearchTerm('');

    // Check for rotation search param
    const rotationParam = searchParams.get('rotation');
    if (rotationParam === 'alta') setShowHighRotation(true);
    if (rotationParam === 'media') setShowMediumRotation(true);

    // Check for search term param
    const search = searchParams.get('searchTerm');
    if (search) {
      setSearchTerm(search);
    }
  }, [searchParams]);

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
    // Column A is empty. Data starts at Column B.
    const headers = ['', 'REFERENCIA', 'PRODUCTO', 'MARCA', 'CATEGORÍA', 'SUBCATEGORÍA', 'ROTACIÓN'];
    const title = ['', "INVENTARIO MAESTRO"]; // Title starts at B1

    const rows = products.map(p => {
      const subCat = categorias.find(c => c.id === p.subcategoria_id);
      const parentCat = subCat?.parent_id
        ? categorias.find(c => c.id === subCat.parent_id)
        : (subCat?.parent_id === null ? subCat : undefined);

      const categoryName = parentCat?.name || (subCat?.parent_id ? 'Desconocida' : subCat?.name);
      const subCategoryName = parentCat ? subCat?.name : '';

      return [
        '', // Column A empty
        p.sku,
        p.nombre,
        p.marca?.nombre,
        categoryName,
        subCategoryName,
        p.rotacion ? p.rotacion.charAt(0).toUpperCase() + p.rotacion.slice(1) : 'Media'
      ];
    });

    const ws_data = [
      title,
      [], // Empty row for spacing
      headers,
      ...rows
      // No Totals Row
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Merge Title (B1:G1) - 6 columns of data starting at index 1
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 1 }, e: { r: 0, c: 6 } });

    // Configure Freeze Panes
    // Rows 0 (Title), 1 (Space), 2 (Header) are frozen. Split at row 3.
    const splitRow = 3;
    ws['!freeze'] = { xSplit: 0, ySplit: splitRow, topLeftCell: `B${splitRow + 1}`, activePane: 'bottomLeft', state: 'frozen' };

    // Configure AutoFilter (Applies to headers and data)
    // Headers are at Row Index 2. Data starts at Row Index 3.
    // Range starts at B3 (Row index 2, Col index 1) to G(lastRow)
    const range = XLSX.utils.decode_range(ws['!ref']!);
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 2, c: 1 }, e: { r: range.e.r, c: 6 } }) };

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

    // Apply Styles
    const finalRange = XLSX.utils.decode_range(ws['!ref']!);

    for (let R = finalRange.s.r; R <= finalRange.e.r; ++R) {
      for (let C = finalRange.s.c; C <= finalRange.e.c; ++C) {
        // Skip Column A (Index 0)
        if (C === 0) continue;

        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cell_address]) continue;

        if (R === 0) ws[cell_address].s = titleStyle;
        else if (R === 2) ws[cell_address].s = headerStyle; // Header is now at Row 2
        else if (R > 2) { // Data Rows
          ws[cell_address].s = cellStyle;
        }
      }
    }

    // Column Widths
    ws['!cols'] = [
      { wch: 4 },  // A: Empty spacer
      { wch: 15 }, // B: Ref
      { wch: 35 }, // C: Prod
      { wch: 15 }, // D: Marca
      { wch: 20 }, // E: Cat
      { wch: 20 }, // F: Sub
      { wch: 10 }, // G: Rot (Moved from I)
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    console.log("Exportando Inventario v2");
    XLSX.writeFile(wb, "Inventario_Fluxo_v2.xlsx");
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmation(id);
  };

  const handleTemplateDownload = () => {
    // 1. Structure Data
    const title = ['', "PLANTILLA DE IMPORTACIÓN DE INVENTARIO"];
    const headers = ['', 'REFERENCIA', 'PRODUCTO', 'MARCA', 'CATEGORÍA', 'SUBCATEGORÍA', 'PROVEEDOR', 'ROTACIÓN'];

    const ws_data = [
      title,
      [], // Spacer
      headers
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // 2. Styling Configurations
    // Merge Title (B1:H1)
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 1 }, e: { r: 0, c: 7 } });

    // Column Widths
    ws['!cols'] = [
      { wch: 4 },  // Spacer A
      { wch: 15 }, // B: REF
      { wch: 35 }, // C: PRODUCTO
      { wch: 15 }, // D: MARCA
      { wch: 20 }, // E: CAT
      { wch: 20 }, // F: SUBCAT
      { wch: 25 }, // G: PROV
      { wch: 10 }, // H: ROT
    ];

    // Styles
    const borderStyle = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    };

    const titleStyle = {
      font: { name: "Calibri", sz: 16, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "4472C4" } }, // Blue Background
      border: borderStyle
    };

    const headerStyle = {
      fill: { fgColor: { rgb: "4472C4" } }, // Blue Header
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: borderStyle
    };

    const cellStyle = {
      font: { name: "Calibri", sz: 11, color: { rgb: "333333" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: borderStyle
    };

    const centerStyle = {
      ...cellStyle,
      alignment: { horizontal: "center", vertical: "center" }
    };

    // Apply Styles Loop
    const range = XLSX.utils.decode_range(ws['!ref']!);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        if (C === 0) continue; // Skip spacer col
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cell_address]) continue;

        if (R === 0) ws[cell_address].s = titleStyle;
        else if (R === 2) ws[cell_address].s = headerStyle;
        else if (R > 2) {
          // Data Rows (Examples)
          // Center align REF (1) and ROTATION (7)
          if (C === 1 || C === 7) ws[cell_address].s = centerStyle;
          else ws[cell_address].s = cellStyle;
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Importación");
    XLSX.writeFile(wb, "Plantilla_Inventario_Fluxo.xlsx");
  };

  const exportCatalogToExcel = () => {
    // 1. Prepare Data based on filtered list
    const ws_data = [
      ["", `CATÁLOGO DE PRODUCTOS - ${new Date().toLocaleDateString()}`],
      [""],
      ["", "REF / SKU", "PRODUCTO", "MARCA", "CATEGORÍA", "SUBCATEGORÍA", "PROVEEDOR PREF.", "ROTACIÓN", "STOCK"]
    ];

    filtered.forEach(p => {
      ws_data.push([
        "",
        p.sku,
        p.nombre,
        p.marca?.nombre || "-",
        p.subcategoria?.parent?.name || "-",
        p.subcategoria?.name || "-",
        p.preferred_supplier?.nombre || "-",
        p.rotacion.toUpperCase(),
        p.stock_actual?.toString() || "0"
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Styling (Same as template but for all data rows)
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 1 }, e: { r: 0, c: 8 } });

    ws['!cols'] = [
      { wch: 4 }, { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 10 }
    ];

    const borderStyle = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    };

    const titleStyle = {
      font: { name: "Calibri", sz: 16, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      fill: { fgColor: { rgb: "4472C4" } },
      border: borderStyle
    };

    const headerStyle = {
      fill: { fgColor: { rgb: "4472C4" } },
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: borderStyle
    };

    const cellStyle = {
      font: { name: "Calibri", sz: 11, color: { rgb: "333333" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: borderStyle
    };

    const range = XLSX.utils.decode_range(ws['!ref']!);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        if (C === 0) continue;
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cell_address]) continue;

        if (R === 0) ws[cell_address].s = titleStyle;
        else if (R === 2) ws[cell_address].s = headerStyle;
        else if (R > 2) ws[cell_address].s = cellStyle;
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catálogo");
    XLSX.writeFile(wb, `Fluxo_Catalogo_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const processImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportLogs([]);
    const addLog = (msg: string) => setImportLogs(prev => [...prev, msg]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSXReader.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      // Helper for normalization (Case insensitive, accent insensitive, trimmed)
      const normalizeStr = (str: string) => {
        if (!str) return "";
        return str
          .toString()
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      };

      // Get all rows as arrays to find the header
      const allRows = XLSXReader.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      let headerRowIndex = -1;
      const possibleHeaders = ['referencia', 'sku', 'producto', 'marca', 'categoria', 'proveedor'];

      // Search in the first 20 rows for a header
      for (let i = 0; i < Math.min(allRows.length, 20); i++) {
        const row = allRows[i];
        if (row && Array.isArray(row)) {
          const matchCount = row.filter(cell => {
            const val = normalizeStr(String(cell || ''));
            return possibleHeaders.some(ph => val.includes(ph));
          }).length;

          if (matchCount >= 2) {
            headerRowIndex = i;
            break;
          }
        }
      }

      if (headerRowIndex === -1) {
        addLog("ADVERTENCIA: No se encontró una fila de cabecera clara. Usando fila 1.");
        headerRowIndex = 0;
      } else {
        addLog(`Cabeceras detectadas en la fila ${headerRowIndex + 1}.`);
      }

      const jsonData = XLSXReader.utils.sheet_to_json(sheet, { range: headerRowIndex }) as any[];

      addLog(`Archivo leído: ${jsonData.length} filas de datos.`);
      addLog("Procesando...");

      // 1. Refresh Cache to ensure we don't duplicate
      const [currentMarcas, currentCats, currentProds, currentProvs] = await Promise.all([
        repository.getMarcas(),
        repository.getCategorias(),
        repository.getProductos(),
        repository.getProveedores()
      ]);

      // Maps for quick lookup
      const marcaMap = new Map(currentMarcas.map(m => [normalizeStr(m.nombre), m.id]));
      const catMap = new Map(currentCats.map(c => [normalizeStr(c.name), c]));
      const skuMap = new Map(currentProds.map(p => {
        const key = `${normalizeStr(p.sku)}|${p.marca_id}|${p.subcategoria_id || ''}`;
        return [key, p.id];
      }));
      const provMap = new Map(currentProvs.map(p => [normalizeStr(p.nombre), p.id]));

      let createdCount = 0;
      let updatedCount = 0;

      for (const [index, rawRow] of jsonData.entries()) {
        const rowNum = index + headerRowIndex + 2;

        // Normalize keys of the row object to handle any case variation
        const row: any = {};
        Object.keys(rawRow).forEach(key => {
          row[normalizeStr(key)] = rawRow[key];
        });

        const sku = (row['referencia'] || row['sku'])?.toString().trim();
        const nombre = (row['producto'] || row['nombre'])?.toString().trim();
        const marcaName = row['marca']?.toString().trim();
        const catName = (row['categoria'] || row['categoria'])?.toString().trim();
        const subCatName = (row['subcategoria'] || row['subcategoria'])?.toString().trim();
        const provName = (row['proveedor'] || row['provider'])?.toString().trim();
        const rotacionRaw = row['rotacion']?.toString().trim().toLowerCase();

        if (!sku || !nombre) {
          addLog(`Fila ${rowNum}: Saltada (Falta SKU o Nombre).`);
          continue;
        }

        // --- 1. Handle Marca ---
        let marcaId = '';
        if (marcaName) {
          const key = normalizeStr(marcaName);
          if (marcaMap.has(key)) {
            marcaId = marcaMap.get(key)!;
          } else {
            addLog(`Creando nueva marca: ${marcaName}`);
            const newMarca = await repository.addMarca({ nombre: marcaName });
            if (newMarca) {
              marcaId = newMarca.id;
              marcaMap.set(key, marcaId);
            }
          }
        } else {
          // Default logic...
          if (currentMarcas.length > 0) marcaId = currentMarcas[0].id; // Fallback
          const genKey = normalizeStr("General");
          if (marcaMap.has(genKey)) marcaId = marcaMap.get(genKey)!;
          else {
            const newM = await repository.addMarca({ nombre: "General" });
            marcaId = newM.id;
            marcaMap.set(genKey, marcaId);
          }
        }

        // --- 2. Handle Category / Subcategory ---
        let subcategoriaId = '';
        let parentId = '';

        if (catName) {
          const catKey = normalizeStr(catName);
          if (catMap.has(catKey)) {
            parentId = catMap.get(catKey)!.id;
          } else {
            addLog(`Creando categoría: ${catName}`);
            const newCat = await repository.addCategoria({ name: catName });
            if (newCat) {
              parentId = newCat.id;
              catMap.set(catKey, newCat);
            }
          }
        }

        if (subCatName && parentId) {
          const subKey = normalizeStr(subCatName);
          const foundSub = Array.from(catMap.values()).find(c =>
            normalizeStr(c.name) === subKey && c.parent_id === parentId
          );

          if (foundSub) {
            subcategoriaId = foundSub.id;
          } else {
            addLog(`Creando subcategoría: ${subCatName} en ${catName}`);
            const newSub = await repository.addCategoria({ name: subCatName, parent_id: parentId });
            if (newSub) {
              subcategoriaId = newSub.id;
              catMap.set(normalizeStr(newSub.name) + "_" + parentId, newSub);
              catMap.set(`SUB_${subKey}_${parentId}`, newSub);
            }
          }
        } else if (parentId) {
          subcategoriaId = parentId;
        }

        // --- 3. Handle Provider ---
        let supplierId: string | undefined = undefined;
        if (provName) {
          const provKey = normalizeStr(provName);
          if (provMap.has(provKey)) {
            supplierId = provMap.get(provKey)!;
          } else {
            addLog(`Creando proveedor: ${provName}`);
            const newProv = await repository.addProveedor({ nombre: provName });
            if (newProv) {
              supplierId = newProv.id;
              provMap.set(provKey, supplierId);
            }
          }
        }

        // --- 4. Handle Product ---
        const rotacion = (rotacionRaw === 'alta' || rotacionRaw === 'media' || rotacionRaw === 'baja') ? rotacionRaw : 'media';

        const productPayload = {
          sku,
          nombre,
          marca_id: marcaId,
          subcategoria_id: subcategoriaId,
          preferred_supplier_id: supplierId,
          rotacion: rotacion as 'alta' | 'media' | 'baja',
          stock_actual: 0,
          stock_minimo: 5
        };

        const compositeKey = `${normalizeStr(sku)}|${marcaId}|${subcategoriaId || ''}`;
        if (skuMap.has(compositeKey)) {
          const id = skuMap.get(compositeKey)!;
          await repository.updateProducto(id, productPayload);
          updatedCount++;
          addLog(`Actualizado: ${sku}`);
        } else {
          const newProduct = await repository.addProducto(productPayload);
          if (newProduct) {
            createdCount++;
            skuMap.set(compositeKey, newProduct.id); // ACTUALIZACIÓN EN TIEMPO REAL
            addLog(`Creado: ${sku}`);
          }
        }
      }

      // Slight delay to breathe?
      // await new Promise(r => setTimeout(r, 10));


      addLog('--- Fin del proceso ---');
      addLog(`Resumen: ${createdCount} creados, ${updatedCount} actualizados.`);
      addToast(`Importación completada: ${createdCount} nuevos, ${updatedCount} actualizados`, 'success');

      await loadData();
      // Don't close modal immediately so user can read logs
      setIsImporting(false);

    } catch (error: any) {
      console.error(error);
      addLog(`ERROR CRÍTICO: ${error.message}`);
      addToast('Error en la importación', 'error');
      setIsImporting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    try {
      await repository.deleteProducto(deleteConfirmation);
      await loadData();
      addToast("Producto eliminado correctamente", "success");
    } catch (error: any) {
      console.error(error);
      const isForeignKeyError = error?.code === '23503' ||
        error?.message?.toLowerCase().includes('foreign key') ||
        error?.message?.toLowerCase().includes('violates foreign key constraint');

      if (isForeignKeyError) {
        addToast("No se puede eliminar: este producto tiene pedidos o historial asociado. Prueba cambiándolo a rotación 'Baja'.", "error");
      } else {
        addToast("Error al eliminar producto", "error");
      }
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
      if (msg.includes("duplicate key") || msg.includes("productos_sku_marca_key") || msg.includes("productos_sku_marca_subcat_key")) {
        addToast("Error: Ya existe un producto con esta referencia para la marca y subcategoría seleccionada.", "error");
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
      preferred_supplier_id: '',
      rotacion: 'media' as 'alta' | 'media' | 'baja'
    });
  };

  const loadHistory = async (productId: string) => {
    setLoadingHistory(true);
    try {
      // @ts-ignore
      const history = await repository.getProductHistory(productId);
      setProductHistory(history || []);
    } catch (error) {
      console.error("Error loading history", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEdit = (product: Producto) => {
    setEditingProduct(product);
    setNewProduct({
      sku: product.sku,
      nombre: product.nombre,
      marca_id: product.marca_id,
      subcategoria_id: product.subcategoria_id || '',
      preferred_supplier_id: product.preferred_supplier_id || '',
      rotacion: product.rotacion || 'media'
    });
    // Set parent category based on subcategory
    if (product.subcategoria_id) {
      const sub = categorias.find(c => c.id === product.subcategoria_id);
      if (sub && sub.parent_id) {
        setSelectedParentId(sub.parent_id);
      }
    }

    setActiveTab('details');
    loadHistory(product.id);
    setShowAddModal(true);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  // Enhanced Filtering Logic
  const filtered = products.filter(p => {
    // 1. Search filter
    const matchesSearch = searchTerm.trim() === '' ||
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // If searching, keep combining for exact drill-down
    if (searchTerm.trim() !== '') return true;

    // 2. Rotation filter
    let matchesRotation = true;
    if (showHighRotation && p.rotacion !== 'alta') matchesRotation = false;
    if (showMediumRotation && p.rotacion !== 'media') matchesRotation = false;

    if (!matchesRotation) return false;

    // 3. Context filter (Provider or Category)
    let matchesContext = true;
    if (orderMode === 'PROVIDER') {
      if (selectedProvFilter) {
        matchesContext = p.preferred_supplier_id === selectedProvFilter;
      }
    } else {
      if (selectedCategory) {
        const productCat = categorias.find(c => c.id === p.subcategoria_id);
        matchesContext = p.subcategoria_id === selectedCategory ||
          p.categoria_id === selectedCategory ||
          productCat?.parent_id === selectedCategory;
      }
    }

    // 4. Removed stock filter logic
    return matchesContext;
  });


  // Derived State for Context Title
  const activeContextName = useMemo(() => {
    let base = orderMode === 'PROVIDER'
      ? (proveedores.find(p => p.id === selectedProvFilter)?.nombre || 'Todos los Proveedores')
      : (categorias.find(c => c.id === selectedCategory)?.name || 'Todas las Categorías');

    const filters = [];
    if (showHighRotation) filters.push('Alta Rotación');
    if (showMediumRotation) filters.push('Media Rotación');

    if (filters.length > 0) return `${base} (${filters.join(', ')})`;
    return base;
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
            <h2 className="text-2xl font-bold dark:text-white">Catálogo de Productos</h2>
            <p className="text-slate-400 text-sm">Organización de referencias y marcas</p>
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

            <button onClick={exportCatalogToExcel} className="flex items-center px-4 py-2 bg-emerald-50 content-center dark:bg-emerald-500/10 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200 dark:border-emerald-500/30">
              <Download size={14} className="mr-2" /> Exportar
            </button>
            <button onClick={handleTemplateDownload} className="flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-600/10 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-600/30">
              <FileSpreadsheet size={14} className="mr-2" /> Plantilla
            </button>
            <button onClick={() => setShowImportModal(true)} className="flex items-center px-4 py-2 bg-violet-50 dark:bg-violet-600/10 rounded-xl text-xs font-bold hover:bg-violet-100 dark:hover:bg-violet-600/20 text-violet-600 dark:text-violet-400 shadow-sm border border-violet-200 dark:border-violet-600/30">
              <Upload size={14} className="mr-2" /> Importar
            </button>
            <button onClick={handleOpenAdd} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg text-white">
              <Plus size={14} className="mr-2" /> Nuevo
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

                    {/* Top Tags */}
                    <div className="flex flex-wrap gap-2 mb-3 items-center">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                        {p.marca?.nombre || 'genérico'}
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
                        <span className="text-[10px] text-slate-950 dark:text-white font-black font-mono bg-slate-50 dark:bg-slate-900/50 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {p.sku}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center gap-2 relative z-10">
                      <button
                        onClick={() => handleEdit(p)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit2 size={12} /> Editar
                      </button>
                      <button
                        onClick={() => handlePrintLabel(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Imprimir Etiqueta"
                      >
                        <Printer size={14} />
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

              {/* Tabs (Only if editing) */}
              {editingProduct && (
                <div className="flex px-10 border-b border-slate-100 dark:border-white/5">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                  >
                    Detalles
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                  >
                    Historial de Movimientos
                  </button>
                </div>
              )}

              {/* Form Body - Taller Layout */}
              <div className="p-10 overflow-y-auto flex-1 custom-scrollbar">
                {activeTab === 'details' ? (
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
                      <div className="col-span-6 md:col-span-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Rotación</label>
                        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800 h-11">
                          {(['alta', 'media', 'baja'] as const).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setNewProduct({ ...newProduct, rotacion: r })}
                              className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-200 ${newProduct.rotacion === r
                                ? r === 'alta' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' :
                                  r === 'media' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' :
                                    'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
                                }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="col-span-6 md:col-span-2 flex items-center justify-end h-11">
                        <button type="submit" className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center gap-2">
                          <Plus size={18} />
                          <span>{editingProduct ? 'Guardar' : 'Crear'}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {loadingHistory ? (
                      <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : productHistory.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase text-xs font-bold">
                            <tr>
                              <th className="px-4 py-3 text-left">Fecha</th>
                              <th className="px-4 py-3 text-left">Pedido</th>
                              <th className="px-4 py-3 text-left">Proveedor</th>
                              <th className="px-4 py-3 text-center">Cant. Solicitada</th>
                              <th className="px-4 py-3 text-center">Cant. Recibida</th>
                              <th className="px-4 py-3 text-center">Estado Item</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {productHistory.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                  {item.pedido?.fecha_creacion ? new Date(item.pedido.fecha_creacion).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                  {item.pedido_id.slice(0, 8)}...
                                </td>
                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                  {item.pedido?.proveedor?.nombre || '-'}
                                </td>
                                <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                                  {item.cantidad_solicitada}
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-white">
                                  {item.cantidad_recibida}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold ${item.estado_item === 'Aceptado' ? 'bg-emerald-100 text-emerald-600' :
                                    item.estado_item === 'Rechazado' ? 'bg-rose-100 text-rose-600' :
                                      item.estado_item === 'Modificado' ? 'bg-amber-100 text-amber-600' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                    {item.estado_item || 'Pendiente'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-slate-500">
                        <Clock size={40} className="mx-auto mb-3 opacity-50" />
                        <p>No hay historial de movimientos para este producto.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )
      }

      {/* Import Modal */}
      {
        showImportModal && (
          <Modal
            isOpen={showImportModal}
            onClose={() => !isImporting && setShowImportModal(false)}
            title="Importar Inventario desde Excel"
            maxWidth="max-w-xl"
            footer={
              <button
                onClick={() => setShowImportModal(false)}
                disabled={isImporting}
                className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-bold transition-colors"
              >
                Cerrar
              </button>
            }
          >
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <h4 className="font-bold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <Download size={16} /> Plantilla Requerida
                </h4>
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                  Para asegurar una importación correcta, utiliza nuestra plantilla oficial.
                  Las columnas deben ser exactas.
                </p>
                <button
                  onClick={handleTemplateDownload}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95"
                >
                  Descargar Plantilla Excel
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Subir Archivo (.xlsx)</label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-500 transition-colors bg-slate-50 dark:bg-slate-800/50 cursor-pointer relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={processImportFile}
                    disabled={isImporting}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  {isImporting ? (
                    <Loader2 size={32} className="animate-spin text-blue-500 mb-2" />
                  ) : (
                    <Upload size={32} className="text-slate-400 mb-2" />
                  )}
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {isImporting ? 'Procesando archivo...' : 'Arrastra tu archivo o haz clic para seleccionar'}
                  </p>
                </div>
              </div>

              {/* Logs Console */}
              {importLogs.length > 0 && (
                <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xs font-mono h-48 overflow-y-auto custom-scrollbar border border-slate-800">
                  {importLogs.map((log, i) => (
                    <div key={i} className="mb-1 border-b border-white/5 pb-0.5 last:border-0">
                      {log.startsWith('ERROR') ? <span className="text-rose-400">{log}</span> :
                        log.startsWith('Creado') ? <span className="text-emerald-400">{log}</span> :
                          log.startsWith('Actualizado') ? <span className="text-blue-400">{log}</span> :
                            log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Modal>
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
