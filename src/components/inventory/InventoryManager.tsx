import React, { useState } from 'react';
import { 
  Plus, 
  AlertTriangle, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Package
} from 'lucide-react';
import { Material, MaterialType } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface InventoryManagerProps {
  materials: Material[];
  onSaveMaterials: (materials: Material[]) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  materials,
  onSaveMaterials
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState<boolean>(false);
  const [discardConfirm, setDiscardConfirm] = useState<boolean>(false);
  // Snapshot del formulario al abrir el modal: si cambia, hay cambios sin guardar.
  const [formSnapshot, setFormSnapshot] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<MaterialType>('PLA');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [spoolWeightGrams, setSpoolWeightGrams] = useState<number>(1000);
  const [spoolPriceCLP, setSpoolPriceCLP] = useState<number>(0);
  const [stockGrams, setStockGrams] = useState<number>(1000);
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('Estante A');
  const [lotNumber, setLotNumber] = useState('');

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingMaterial(null);
    setName('');
    setType('PLA');
    setBrand('');
    setColor('');
    setSpoolWeightGrams(1000);
    setSpoolPriceCLP(0);
    setStockGrams(1000);
    setSupplier('');
    setLocation('Estante A');
    setLotNumber('');
    setFormSnapshot('');
    setShowModal(true);
  };

  const isFormDirty = () =>
    [name, type, brand, color, spoolWeightGrams, spoolPriceCLP, stockGrams, supplier, location, lotNumber].join('|') !== formSnapshot;

  /** Cierra el modal de edición; si hay cambios sin guardar pide confirmación. */
  const requestCloseModal = () => {
    if (isFormDirty()) setDiscardConfirm(true);
    else setShowModal(false);
  };

  const openEditModal = (m: Material) => {
    setEditingMaterial(m);
    setName(m.name);
    setType(m.type);
    setBrand(m.brand);
    setColor(m.color);
    setSpoolWeightGrams(m.spoolWeightGrams);
    setSpoolPriceCLP(m.spoolPriceCLP);
    setStockGrams(m.stockGrams);
    setSupplier(m.supplier || '');
    setLocation(m.location || 'Estante A');
    setLotNumber(m.lotNumber || '');
    setFormSnapshot([m.name, m.type, m.brand, m.color, m.spoolWeightGrams, m.spoolPriceCLP, m.stockGrams, m.supplier || '', m.location || 'Estante A', m.lotNumber || ''].join('|'));
    setShowModal(true);
  };

  const handleDelete = (id: string, matName: string) => {
    setDeleteConfirm({ id, name: matName });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onSaveMaterials(materials.filter(m => m.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    }
  };

  const handleClearAll = () => {
    setClearAllConfirm(true);
  };

  const confirmClearAll = () => {
    onSaveMaterials([]);
    setClearAllConfirm(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const costPerGram = spoolWeightGrams > 0 ? spoolPriceCLP / spoolWeightGrams : 0;

    if (editingMaterial) {
      // Update
      const updated = materials.map(m => {
        if (m.id === editingMaterial.id) {
          return {
            ...m,
            name,
            type,
            brand: brand || 'Genérica',
            color: color || 'Estándar',
            spoolWeightGrams,
            spoolPriceCLP,
            costPerGramCLP: Number(costPerGram.toFixed(2)),
            stockGrams,
            supplier: supplier || m.supplier,
            location: location || m.location,
            lotNumber: lotNumber || m.lotNumber
          };
        }
        return m;
      });
      onSaveMaterials(updated);
    } else {
      // Create
      const newMat: Material = {
        id: `mat_${Date.now()}`,
        name,
        type,
        brand: brand || 'Genérica',
        color: color || 'Estándar',
        spoolWeightGrams,
        spoolPriceCLP,
        costPerGramCLP: Number(costPerGram.toFixed(2)),
        stockGrams,
        supplier: supplier || 'Proveedor Nacional',
        location: location || 'Taller',
        lotNumber: lotNumber || `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
      };
      onSaveMaterials([newMat, ...materials]);
    }

    setShowModal(false);
  };

  const handleStockUpdate = (id: string, deltaGrams: number) => {
    const updated = materials.map(m => {
      if (m.id === id) {
        return { ...m, stockGrams: Math.max(0, m.stockGrams + deltaGrams) };
      }
      return m;
    });
    onSaveMaterials(updated);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Catálogo de Materiales & Inventario
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingresa tus bobinas, peso exacto, precio pagado y costo real por gramo calculado
          </p>
        </div>

        <div className="flex items-center gap-2">
          {materials.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Borra la lista para ingresar únicamente tus materiales"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />
              <span>Limpiar catálogo</span>
            </button>
          )}

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Ingresar Mi Filamento</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por material, color o marca..."
            className="w-full text-xs pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="text-xs text-slate-500">
          Total: <span className="font-bold text-slate-900 font-mono">{materials.length} bobinas</span>
        </div>
      </div>

      {/* Materials Table or Empty */}
      {materials.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 space-y-3">
          <Package className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-800">No hay materiales en inventario</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Ingresa tus bobinas de PLA, PETG, ABS o resina con su precio y peso para que el motor de costos calcule el valor real de cada pieza.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            + Ingresar Primera Bobina
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Material & Marca</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Color</th>
                  <th className="py-3 px-4 text-right">Precio Bobina</th>
                  <th className="py-3 px-4 text-right">Costo / Gramo</th>
                  <th className="py-3 px-4 text-center">Stock Actual</th>
                  <th className="py-3 px-4 text-right">Ubicación & Lote</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map((mat) => {
                  const isLowStock = mat.stockGrams < 300;
                  return (
                    <tr key={mat.id} className="hover:bg-slate-50/70 transition-colors">
                      
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{mat.name}</div>
                        <div className="text-[11px] text-slate-400">{mat.brand}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-medium text-slate-700">
                          {mat.type}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full border border-slate-300 bg-slate-400 shrink-0" />
                          <span className="text-slate-700">{mat.color}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 tabular-nums">
                        ${mat.spoolPriceCLP.toLocaleString('es-CL')}
                        <div className="text-[10px] text-slate-400">{mat.spoolWeightGrams}g</div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                        ${mat.costPerGramCLP.toFixed(2)}/g
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 font-mono font-semibold tabular-nums">
                          {isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          <span className={isLowStock ? 'text-amber-700' : 'text-slate-900'}>
                            {mat.stockGrams}g
                          </span>
                        </div>
                        {isLowStock && (
                          <div className="text-[9px] text-amber-600 font-medium">Bajo stock</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-500">
                        <div>{mat.location || 'Estante'}</div>
                        <div className="text-[10px] font-mono text-slate-400">{mat.lotNumber || 'S/L'}</div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Adjust stock */}
                          <button
                            onClick={() => handleStockUpdate(mat.id, -100)}
                            className="px-1.5 py-0.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 cursor-pointer font-mono text-[10px]"
                            title="Descontar 100g de merma o prueba"
                          >
                            -100g
                          </button>
                          <button
                            onClick={() => handleStockUpdate(mat.id, 1000)}
                            className="px-1.5 py-0.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 cursor-pointer font-mono text-[10px]"
                            title="Sumar 1 bobina (1000g)"
                          >
                            +1kg
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(mat)}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Editar todos los datos de esta bobina"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(mat.id, mat.name)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Eliminar bobina"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Material */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900">
                {editingMaterial ? `Editar Material: ${editingMaterial.name}` : 'Ingresar Nueva Bobina de Filamento'}
              </h2>
              <button onClick={requestCloseModal} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre Comercial del Material</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: PLA+ Negro Pro, PETG Transparente, etc."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tipo de Polímero</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as MaterialType)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="PLA">PLA Estándar</option>
                    <option value="PLA+">PLA+</option>
                    <option value="PETG">PETG</option>
                    <option value="ABS">ABS</option>
                    <option value="ASA">ASA</option>
                    <option value="TPU">TPU / Flexible</option>
                    <option value="Resina">Resina UV</option>
                    <option value="Nylon">Nylon / PA</option>
                    <option value="Otro">Otro polímero</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Marca / Fabricante</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="eSun, Bambu, Polymaker, etc."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Color / Tonalidad</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Ej: Negro, Blanco, Rojo, etc."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Peso Neto Bobina (g)</label>
                  <input
                    type="number"
                    value={spoolWeightGrams}
                    onChange={(e) => setSpoolWeightGrams(parseInt(e.target.value, 10) || 1000)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono tabular-nums font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Normalmente 1000g (1 kg) o 750g</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Precio Pagado ($ CLP)</label>
                  <input
                    type="number"
                    step="500"
                    value={spoolPriceCLP}
                    onChange={(e) => setSpoolPriceCLP(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono tabular-nums font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Valor real de compra</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Disponible (g)</label>
                  <input
                    type="number"
                    value={stockGrams}
                    onChange={(e) => setStockGrams(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono tabular-nums"
                  />
                  <span className="text-[10px] text-slate-400">Gramos que tienes actualmente</span>
                </div>
              </div>

              {/* Calculated Real Cost per Gram Preview */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center font-mono">
                <span className="text-slate-600">Costo real resultante por gramo:</span>
                <span className="text-sm font-bold text-emerald-700">
                  ${(spoolWeightGrams > 0 ? spoolPriceCLP / spoolWeightGrams : 0).toFixed(2)} / gramo
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Ubicación / Estante</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Estante A, Fila 2"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Proveedor (Opcional)</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Tienda o distribuidor"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Número de Lote (Opcional)</label>
                <input
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="Ej: LOT-2024-08"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={requestCloseModal}
                  className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  {editingMaterial ? 'Guardar Cambios' : 'Guardar Material'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* In-app Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteConfirm}
        variant="danger"
        title="¿Eliminar material?"
        description={<>¿Estás seguro de eliminar el material <strong>"{deleteConfirm?.name}"</strong>? Esta acción no se puede deshacer.</>}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* In-app Clear All Confirmation Modal */}
      <ConfirmDialog
        open={clearAllConfirm}
        variant="danger"
        title="¿Vaciar catálogo de materiales?"
        description="Se eliminarán TODOS los materiales (bobinas) del inventario para ingresar los tuyos propios desde cero. Esta acción no se puede deshacer."
        confirmLabel="Sí, vaciar catálogo"
        requireText="ELIMINAR"
        onConfirm={confirmClearAll}
        onCancel={() => setClearAllConfirm(false)}
      />

      {/* Unsaved Changes Guard */}
      <ConfirmDialog
        open={discardConfirm}
        variant="warning"
        title="¿Descartar cambios sin guardar?"
        description="Modificaste datos de este material pero no los guardaste. Si cierras ahora, se perderán los cambios."
        confirmLabel="Descartar cambios"
        cancelLabel="Seguir editando"
        onConfirm={() => {
          setDiscardConfirm(false);
          setShowModal(false);
        }}
        onCancel={() => setDiscardConfirm(false)}
      />

    </div>
  );
};
