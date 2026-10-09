import React, { useState } from 'react';
import { 
  Cpu, 
  HelpCircle, 
  CheckCircle2, 
  DollarSign
} from 'lucide-react';
import { BusinessSettings } from '../../types';

interface PrinterSimulatorProps {
  settings: BusinessSettings;
  onClose?: () => void;
}

interface SimulatedPrinterPreset {
  name: string;
  brand: string;
  priceCLP: number;
  accessoriesCLP: number;
  watts: number;
  usefulHours: number;
  monthlyTargetHours: number;
  maintenancePercent: number;
  repairReservePerHourCLP: number;
}

const PRESET_MODELS: SimulatedPrinterPreset[] = [
  {
    name: 'Bambu Lab A1 Combo (con AMS)',
    brand: 'Bambu Lab',
    priceCLP: 649990,
    accessoriesCLP: 70000,
    watts: 130,
    usefulHours: 4500,
    monthlyTargetHours: 160,
    maintenancePercent: 10,
    repairReservePerHourCLP: 250
  },
  {
    name: 'Creality K1C High-Speed',
    brand: 'Creality',
    priceCLP: 529990,
    accessoriesCLP: 40000,
    watts: 170,
    usefulHours: 4000,
    monthlyTargetHours: 140,
    maintenancePercent: 12,
    repairReservePerHourCLP: 300
  },
  {
    name: 'Bambu Lab P1S Enclosed',
    brand: 'Bambu Lab',
    priceCLP: 799990,
    accessoriesCLP: 80000,
    watts: 160,
    usefulHours: 5000,
    monthlyTargetHours: 180,
    maintenancePercent: 10,
    repairReservePerHourCLP: 280
  },
  {
    name: 'Voron 2.4 DIY 350mm CoreXY',
    brand: 'Voron Design',
    priceCLP: 1100000,
    accessoriesCLP: 150000,
    watts: 320,
    usefulHours: 6000,
    monthlyTargetHours: 200,
    maintenancePercent: 8,
    repairReservePerHourCLP: 350
  }
];

export const PrinterSimulator: React.FC<PrinterSimulatorProps> = ({
  settings,
  onClose
}) => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [customPrice, setCustomPrice] = useState<number>(PRESET_MODELS[0].priceCLP);
  const [customAccessories, setCustomAccessories] = useState<number>(PRESET_MODELS[0].accessoriesCLP);
  const [customWatts, setCustomWatts] = useState<number>(PRESET_MODELS[0].watts);
  const [customMonthlyHours, setCustomMonthlyHours] = useState<number>(PRESET_MODELS[0].monthlyTargetHours);
  const [recoveryTargetMonths, setRecoveryTargetMonths] = useState<number>(12);
  const [avgPiecePrintHours, setAvgPiecePrintHours] = useState<number>(5);
  const [avgPiecePriceNetCLP, setAvgPiecePriceNetCLP] = useState<number>(25000);

  const activePreset = PRESET_MODELS[selectedPresetIndex];

  const handleSelectPreset = (idx: number) => {
    setSelectedPresetIndex(idx);
    const p = PRESET_MODELS[idx];
    setCustomPrice(p.priceCLP);
    setCustomAccessories(p.accessoriesCLP);
    setCustomWatts(p.watts);
    setCustomMonthlyHours(p.monthlyTargetHours);
  };

  // Math Simulation
  const totalInvestmentCLP = customPrice + customAccessories;
  const monthlyAmortizationCLP = totalInvestmentCLP / Math.max(1, recoveryTargetMonths);
  const machineHourlyAmortizationCLP = monthlyAmortizationCLP / Math.max(1, customMonthlyHours);

  // Electricity
  const kwhRate = settings.kwhPriceCLP || 210;
  const electricityPerHourCLP = (customWatts / 1000) * kwhRate;

  // Maintenance & Repair
  const maintenancePerHourCLP = (totalInvestmentCLP * (activePreset.maintenancePercent / 100)) / (activePreset.usefulHours || 4000);
  const repairPerHourCLP = activePreset.repairReservePerHourCLP;

  // Total Machine Cost per Hour (Internal)
  const totalMachineCostPerHourCLP = Math.round(
    machineHourlyAmortizationCLP + electricityPerHourCLP + maintenancePerHourCLP + repairPerHourCLP
  );

  // Capacity simulation
  const monthlyMaxPiecesCapacity = Math.floor(customMonthlyHours / Math.max(0.5, avgPiecePrintHours));
  const machineCostPerPiece = Math.round(totalMachineCostPerHourCLP * avgPiecePrintHours);

  // Break-even pieces to amortize printer monthly
  const assumedNetMarginPerPieceCLP = avgPiecePriceNetCLP * 0.35; // assumed 35% margin contribution
  const piecesNeededToPayPrinterMonthly = Math.ceil(monthlyAmortizationCLP / Math.max(100, assumedNetMarginPerPieceCLP));

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Simulador de Impresoras & Expansión de Negocio
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Analiza el impacto financiero y la viabilidad de adquirir una nueva máquina para tu taller
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 border border-slate-200 rounded-lg cursor-pointer"
          >
            Volver al Panel
          </button>
        )}
      </div>

      {/* Preset Selection Buttons */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700">
          Selecciona un Modelo de Referencia o Simula uno Personalizado:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_MODELS.map((p, idx) => (
            <button
              key={p.name}
              onClick={() => handleSelectPreset(idx)}
              className={`p-3 text-left border rounded-xl transition-all cursor-pointer ${
                selectedPresetIndex === idx
                  ? 'border-slate-900 bg-slate-50 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="font-semibold text-xs text-slate-900 truncate">{p.name}</div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono font-medium">
                ${(p.priceCLP + p.accessoriesCLP).toLocaleString('es-CL')} CLP
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{p.watts}W consumo</div>
            </button>
          ))}
        </div>
      </div>

      {/* Simulator Inputs & Calculations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Interactive Variables (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Variables de la Inversión
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Precio de Compra Impresora ($ CLP)
            </label>
            <input
              type="number"
              step="5000"
              value={customPrice}
              onChange={(e) => setCustomPrice(parseInt(e.target.value, 10) || 0)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Accesorios Iniciales & Placas ($ CLP)
            </label>
            <input
              type="number"
              step="5000"
              value={customAccessories}
              onChange={(e) => setCustomAccessories(parseInt(e.target.value, 10) || 0)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono tabular-nums"
            />
            <span className="text-[10px] text-slate-400">AMS, boquillas endurecidas, placas texturadas</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Consumo Watts (W)
              </label>
              <input
                type="number"
                value={customWatts}
                onChange={(e) => setCustomWatts(parseInt(e.target.value, 10) || 100)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Horas Mensuales Objetivo
              </label>
              <input
                type="number"
                value={customMonthlyHours}
                onChange={(e) => setCustomMonthlyHours(parseInt(e.target.value, 10) || 120)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Meses Objetivo Payback
              </label>
              <input
                type="number"
                min="3"
                max="36"
                value={recoveryTargetMonths}
                onChange={(e) => setRecoveryTargetMonths(parseInt(e.target.value, 10) || 12)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono tabular-nums"
              />
              <span className="text-[10px] text-slate-400">Plazo para pagar la máquina</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Horas Impresión Promedio
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={avgPiecePrintHours}
                onChange={(e) => setAvgPiecePrintHours(parseFloat(e.target.value) || 4)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono tabular-nums"
              />
              <span className="text-[10px] text-slate-400">Por pieza o pedido típico</span>
            </div>
          </div>
        </div>

        {/* Right: Simulation Outcomes & Viability (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Resultado Financiero & Costo Máquina / Hora
            </h2>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Inversión Total: ${totalInvestmentCLP.toLocaleString('es-CL')} CLP
            </span>
          </div>

          {/* Machine Hourly Rate breakdown */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Cuota mensual de amortización ({recoveryTargetMonths} meses):</span>
              <span className="font-mono font-semibold text-slate-900">${Math.round(monthlyAmortizationCLP).toLocaleString('es-CL')} / mes</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Recuperación por hora de impresión:</span>
              <span className="font-mono text-slate-800">${Math.round(machineHourlyAmortizationCLP)} / hr</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Electricidad estimada ({customWatts}W a ${kwhRate}/kWh):</span>
              <span className="font-mono text-slate-800">${Math.round(electricityPerHourCLP)} / hr</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Mantenimiento preventivo & reserva de fallos:</span>
              <span className="font-mono text-slate-800">${Math.round(maintenancePerHourCLP + repairPerHourCLP)} / hr</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-950 text-sm">
              <span>Costo Total Máquina por Hora:</span>
              <span className="font-mono text-base text-slate-900 tabular-nums">
                ${totalMachineCostPerHourCLP.toLocaleString('es-CL')} CLP / hr
              </span>
            </div>
          </div>

          {/* Capacity and Sales Target */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Capacidad Mensual</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                ~{monthlyMaxPiecesCapacity} piezas
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                A {avgPiecePrintHours} hrs por pieza ({customMonthlyHours} hrs útiles)
              </div>
            </div>

            <div className="p-3 border border-slate-200 rounded-lg">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Meta Mínima para Pagar Máquina</span>
              <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
                {piecesNeededToPayPrinterMonthly} piezas / mes
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Solo {piecesNeededToPayPrinterMonthly} de {monthlyMaxPiecesCapacity} piezas pagan la cuota
              </div>
            </div>
          </div>

          {/* Strategic Decision Recommendation */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Conclusión de la Simulación</span>
            </div>
            <p className="text-[11px] text-blue-800">
              Para amortizar esta impresora en <strong>{recoveryTargetMonths} meses</strong>, el taller solo necesita comprometer <strong>{piecesNeededToPayPrinterMonthly * avgPiecePrintHours} horas</strong> mensuales de las {customMonthlyHours} disponibles. El <strong>{Math.round(((customMonthlyHours - (piecesNeededToPayPrinterMonthly * avgPiecePrintHours)) / customMonthlyHours) * 100)}% restante</strong> de la capacidad será margen de ganancia líquida.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
