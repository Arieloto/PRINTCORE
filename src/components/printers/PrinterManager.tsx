import React, { useState } from 'react';
import { 
  Plus, 
  Cpu, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  RotateCcw,
  BookOpen,
  Sparkles,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { Printer } from '../../types';
import { REFERENCE_PRINTER_PRESETS, ReferencePrinterPreset } from '../../data/printerPresets';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface PrinterManagerProps {
  printers: Printer[];
  onSavePrinters: (printers: Printer[]) => void;
}

export const PrinterManager: React.FC<PrinterManagerProps> = ({
  printers,
  onSavePrinters
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState<boolean>(false);
  const [discardConfirm, setDiscardConfirm] = useState<boolean>(false);
  // Snapshot del formulario al abrir el modal: si cambia, hay cambios sin guardar.
  const [formSnapshot, setFormSnapshot] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [purchasePriceCLP, setPurchasePriceCLP] = useState<number>(0);
  const [accessoriesCLP, setAccessoriesCLP] = useState<number>(0);
  const [averageWatts, setAverageWatts] = useState<number>(130);
  const [estimatedUsefulHours, setEstimatedUsefulHours] = useState<number>(4000);
  const [targetMonthlyHours, setTargetMonthlyHours] = useState<number>(160);
  const [maintenancePercent, setMaintenancePercent] = useState<number>(10);
  const [repairReservePerHourCLP, setRepairReservePerHourCLP] = useState<number>(250);
  const [location, setLocation] = useState('Mesa 1');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');

  const loadPresetIntoForm = (preset: ReferencePrinterPreset) => {
    setEditingPrinter(null);
    setName(preset.name);
    setBrand(preset.brand);
    setModel(preset.model);
    setPurchasePriceCLP(preset.purchasePriceCLP);
    setAccessoriesCLP(preset.accessoriesCLP);
    setAverageWatts(preset.averageWatts);
    setEstimatedUsefulHours(preset.estimatedUsefulHours);
    setTargetMonthlyHours(160);
    setMaintenancePercent(preset.maintenancePercent);
    setRepairReservePerHourCLP(preset.repairReservePerHourCLP);
    setLocation('Taller');
    setSerialNumber('');
    setNotes(preset.notes);
    setFormSnapshot([preset.name, preset.brand, preset.model, preset.purchasePriceCLP, preset.accessoriesCLP, preset.averageWatts, preset.estimatedUsefulHours, 160, preset.maintenancePercent, preset.repairReservePerHourCLP, 'Taller', '', preset.notes].join('|'));
    setShowPresetsModal(false);
    setShowModal(true);
  };

  const addPresetDirectly = (preset: ReferencePrinterPreset) => {
    const newP: Printer = {
      id: `prn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: preset.name,
      brand: preset.brand,
      model: preset.model,
      purchasePriceCLP: preset.purchasePriceCLP,
      accessoriesCLP: preset.accessoriesCLP,
      totalInvestmentCLP: preset.purchasePriceCLP + preset.accessoriesCLP,
      purchaseDate: new Date().toISOString().split('T')[0],
      estimatedUsefulHours: preset.estimatedUsefulHours,
      averageWatts: preset.averageWatts,
      minWatts: Math.round(preset.averageWatts * 0.35),
      maxWatts: Math.round(preset.averageWatts * 2.2),
      targetMonthlyHours: 160,
      maintenancePercent: preset.maintenancePercent,
      repairReservePerHourCLP: preset.repairReservePerHourCLP,
      status: 'available',
      location: 'Taller',
      notes: preset.notes,
      totalHoursPrinted: 0,
      accumulatedRecoveryCLP: 0
    };
    onSavePrinters([...printers, newP]);
    setShowPresetsModal(false);
  };

  const openCreateModal = () => {
    setEditingPrinter(null);
    setName('');
    setBrand('');
    setModel('');
    setPurchasePriceCLP(0);
    setAccessoriesCLP(0);
    setAverageWatts(130);
    setEstimatedUsefulHours(4000);
    setTargetMonthlyHours(160);
    setMaintenancePercent(10);
    setRepairReservePerHourCLP(250);
    setLocation('Taller');
    setSerialNumber('');
    setNotes('');
    setFormSnapshot('');
    setShowModal(true);
  };

  const isFormDirty = () =>
    [name, brand, model, purchasePriceCLP, accessoriesCLP, averageWatts, estimatedUsefulHours, targetMonthlyHours, maintenancePercent, repairReservePerHourCLP, location, serialNumber, notes].join('|') !== formSnapshot;

  /** Cierra el modal de edición; si hay cambios sin guardar pide confirmación. */
  const requestCloseModal = () => {
    if (isFormDirty()) setDiscardConfirm(true);
    else setShowModal(false);
  };

  const openEditModal = (p: Printer) => {
    setEditingPrinter(p);
    setName(p.name);
    setBrand(p.brand);
    setModel(p.model);
    setPurchasePriceCLP(p.purchasePriceCLP);
    setAccessoriesCLP(p.accessoriesCLP);
    setAverageWatts(p.averageWatts);
    setEstimatedUsefulHours(p.estimatedUsefulHours || 4000);
    setTargetMonthlyHours(p.targetMonthlyHours || 160);
    setMaintenancePercent(p.maintenancePercent || 10);
    setRepairReservePerHourCLP(p.repairReservePerHourCLP || 250);
    setLocation(p.location);
    setSerialNumber(p.serialNumber || '');
    setNotes(p.notes || '');
    setFormSnapshot([p.name, p.brand, p.model, p.purchasePriceCLP, p.accessoriesCLP, p.averageWatts, p.estimatedUsefulHours || 4000, p.targetMonthlyHours || 160, p.maintenancePercent || 10, p.repairReservePerHourCLP || 250, p.location, p.serialNumber || '', p.notes || ''].join('|'));
    setShowModal(true);
  };

  const handleDelete = (id: string, prnName: string) => {
    setDeleteConfirm({ id, name: prnName });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onSavePrinters(printers.filter(p => p.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    }
  };

  const handleClearAll = () => {
    setClearAllConfirm(true);
  };

  const confirmClearAll = () => {
    onSavePrinters([]);
    setClearAllConfirm(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const total = purchasePriceCLP + accessoriesCLP;

    if (editingPrinter) {
      // Update existing
      const updated = printers.map(p => {
        if (p.id === editingPrinter.id) {
          return {
            ...p,
            name,
            brand: brand || 'Genérica',
            model: model || name,
            purchasePriceCLP,
            accessoriesCLP,
            totalInvestmentCLP: total,
            averageWatts,
            minWatts: Math.round(averageWatts * 0.35),
            maxWatts: Math.round(averageWatts * 2.2),
            estimatedUsefulHours,
            targetMonthlyHours,
            maintenancePercent,
            repairReservePerHourCLP,
            location: location || 'Taller',
            serialNumber: serialNumber || p.serialNumber,
            notes
          };
        }
        return p;
      });
      onSavePrinters(updated);
    } else {
      // Create new
      const newPrn: Printer = {
        id: `prn_${Date.now()}`,
        name,
        brand: brand || 'Genérica',
        model: model || name,
        purchasePriceCLP,
        accessoriesCLP,
        totalInvestmentCLP: total,
        purchaseDate: new Date().toISOString().split('T')[0],
        estimatedUsefulHours,
        averageWatts,
        minWatts: Math.round(averageWatts * 0.35),
        maxWatts: Math.round(averageWatts * 2.2),
        targetMonthlyHours,
        maintenancePercent,
        repairReservePerHourCLP,
        status: 'available',
        location: location || 'Taller',
        serialNumber: serialNumber || `SN-${Math.floor(100000 + Math.random() * 900000)}`,
        totalHoursPrinted: 0,
        accumulatedRecoveryCLP: 0,
        notes
      };
      onSavePrinters([...printers, newPrn]);
    }

    setShowModal(false);
  };

  const handleStatusChange = (id: string, newStatus: Printer['status']) => {
    const updated = printers.map(p => {
      if (p.id === id) return { ...p, status: newStatus };
      return p;
    });
    onSavePrinters(updated);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Flota de Impresoras 3D
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configura tus impresoras, precio de compra, potencia en Watts, vida útil y cuota de recuperación
          </p>
        </div>

        <div className="flex items-center gap-2">
          {printers.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Borra la lista de ejemplo para ingresar únicamente tus máquinas"
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
            <span>+ Ingresar Mi Impresora</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {printers.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 space-y-3">
          <Cpu className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-800">No tienes impresoras registradas todavía</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Ingresa los datos de tu impresora (marca, precio de compra, watts de consumo) para que el sistema calcule automáticamente los costos de máquina y electricidad.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            + Ingresar Primera Impresora
          </button>
        </div>
      ) : (
        /* Printers Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {printers.map((p) => {
            const recoveryPercent = p.totalInvestmentCLP > 0 
              ? Math.min(100, Math.round((p.accumulatedRecoveryCLP / p.totalInvestmentCLP) * 100))
              : 0;
            const hourlyAmortization = p.estimatedUsefulHours > 0 
              ? Math.round(p.totalInvestmentCLP / p.estimatedUsefulHours) 
              : 0;

            return (
              <div 
                key={p.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{p.name}</h3>
                        <div className="text-[11px] text-slate-500">{p.brand} · {p.location}</div>
                      </div>
                    </div>

                    <select
                      value={p.status}
                      onChange={(e) => handleStatusChange(p.id, e.target.value as Printer['status'])}
                      className="text-xs px-2 py-1 border border-slate-200 rounded font-medium bg-white focus:outline-none"
                    >
                      <option value="available">Disponible</option>
                      <option value="printing">Imprimiendo</option>
                      <option value="maintenance">Mantenimiento</option>
                      <option value="offline">Inactiva</option>
                    </select>
                  </div>

                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 gap-2.5 my-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Inversión Total</span>
                      <div className="font-mono font-bold text-slate-900 mt-0.5">
                        ${p.totalInvestmentCLP.toLocaleString('es-CL')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ${p.purchasePriceCLP.toLocaleString('es-CL')} + ${p.accessoriesCLP.toLocaleString('es-CL')} acc.
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Consumo Eléctrico</span>
                      <div className="font-mono font-bold text-slate-900 mt-0.5">
                        {p.averageWatts} Watts
                      </div>
                      <div className="text-[10px] text-slate-400">Promedio de cama y hotend</div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Vida Útil Estimada</span>
                      <div className="font-mono font-semibold text-slate-700 mt-0.5">
                        {p.estimatedUsefulHours} hrs
                      </div>
                      <div className="text-[10px] text-slate-400">{p.totalHoursPrinted} hrs impresas</div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Amortización Horaria</span>
                      <div className="font-mono font-bold text-emerald-700 mt-0.5">
                        ${hourlyAmortization}/hr
                      </div>
                      <div className="text-[10px] text-slate-400">+ mant. y reserva</div>
                    </div>
                  </div>

                  {/* Investment Recovery Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Amortización Recuperada:</span>
                      <span className="font-mono font-bold text-purple-700">{recoveryPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-purple-600 h-full transition-all duration-300"
                        style={{ width: `${recoveryPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Recuperado: ${p.accumulatedRecoveryCLP.toLocaleString('es-CL')}</span>
                      <span>Pendiente: ${(Math.max(0, p.totalInvestmentCLP - p.accumulatedRecoveryCLP)).toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions: Edit and Delete */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {p.serialNumber || 'S/N'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(p)}
                      className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="Editar todos los costos y parámetros de esta impresora"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Eliminar impresora"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Printer */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900">
                {editingPrinter ? `Editar Impresora: ${editingPrinter.name}` : 'Ingresar Nueva Impresora'}
              </h2>
              <button 
                onClick={requestCloseModal}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre Identificador</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Bambu Lab A1, Creality K1, Voron 2.4, etc."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Marca / Fabricante</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Bambu Lab, Creality, Prusa, etc."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Modelo / Versión</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="A1 Combo, MK4, etc."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Precio de Compra ($ CLP)</label>
                  <input
                    type="number"
                    step="1000"
                    value={purchasePriceCLP}
                    onChange={(e) => setPurchasePriceCLP(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono tabular-nums font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Valor real pagado por la máquina</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Accesorios Iniciales ($ CLP)</label>
                  <input
                    type="number"
                    step="1000"
                    value={accessoriesCLP}
                    onChange={(e) => setAccessoriesCLP(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono tabular-nums"
                  />
                  <span className="text-[10px] text-slate-400">Boquillas, placas extra, AMS</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 flex justify-between font-mono">
                <span>Inversión Total Registrada:</span>
                <span className="font-bold text-slate-900">${(purchasePriceCLP + accessoriesCLP).toLocaleString('es-CL')} CLP</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Consumo (Watts)</label>
                  <input
                    type="number"
                    value={averageWatts}
                    onChange={(e) => setAverageWatts(parseInt(e.target.value, 10) || 100)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Potencia eléctrica real</span>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Vida Útil (Horas)</label>
                  <input
                    type="number"
                    step="500"
                    value={estimatedUsefulHours}
                    onChange={(e) => setEstimatedUsefulHours(parseInt(e.target.value, 10) || 4000)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Típico: 4.000 - 5.000 hrs</span>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Horas Objetivo / Mes</label>
                  <input
                    type="number"
                    value={targetMonthlyHours}
                    onChange={(e) => setTargetMonthlyHours(parseInt(e.target.value, 10) || 160)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Horas de uso al mes</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">% Mantenimiento Anual</label>
                  <input
                    type="number"
                    value={maintenancePercent}
                    onChange={(e) => setMaintenancePercent(parseFloat(e.target.value) || 10)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                  <span className="text-[10px] text-slate-400">% de inversión para lubricación y correas</span>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Reserva Fallas ($ CLP/hr)</label>
                  <input
                    type="number"
                    step="50"
                    value={repairReservePerHourCLP}
                    onChange={(e) => setRepairReservePerHourCLP(parseInt(e.target.value, 10) || 250)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Fondo por hora para hotend y piezas</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Ubicación en Taller</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Mesa 1, Gabinete 2, etc."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">N° de Serie (Opcional)</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="SN-123456"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notas / Modificaciones</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Boquilla endurecida de 0.4mm, placa texturada, etc."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
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
                  {editingPrinter ? 'Guardar Cambios' : 'Guardar Impresora'}
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
        title="¿Eliminar impresora?"
        description={<>¿Estás seguro de eliminar <strong>"{deleteConfirm?.name}"</strong>? Esta acción no se puede deshacer.</>}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* In-app Clear All Confirmation Modal */}
      <ConfirmDialog
        open={clearAllConfirm}
        variant="danger"
        title="¿Vaciar catálogo de impresoras?"
        description="Se eliminarán TODAS las impresoras del taller para ingresar las tuyas propias desde cero. Esta acción no se puede deshacer."
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
        description="Modificaste datos de esta impresora pero no los guardaste. Si cierras ahora, se perderán los cambios."
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
