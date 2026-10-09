import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Cpu, 
  Package, 
  Target, 
  Layers
} from 'lucide-react';
import { Quote, Printer, Material, BusinessSettings } from '../../types';
import { formatMoney, formatRate, taxLabelOf } from '../../services/currency';

interface FinancialDashboardProps {
  quotes: Quote[];
  printers: Printer[];
  materials: Material[];
  settings: BusinessSettings;
  onNewQuoteClick: () => void;
  onOpenSimulator: () => void;
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  quotes,
  printers,
  materials,
  settings,
  onNewQuoteClick,
  onOpenSimulator
}) => {
  // Aggregate Metrics
  const totalSalesNetCLP = quotes.reduce((sum, q) => sum + q.subtotalNetCLP, 0);
  const totalCostsCLP = quotes.reduce((sum, q) => sum + q.costBreakdown.totalInternalCostCLP, 0);
  const totalProfitCLP = quotes.reduce((sum, q) => sum + q.costBreakdown.totalNetProfitCLP, 0);
  const totalIVACollectedCLP = quotes.reduce((sum, q) => sum + q.ivaCLP, 0);
  
  const totalMachineHours = quotes.reduce((sum, q) => sum + q.printHours * q.quantity, 0);
  const totalLaborHours = quotes.reduce((sum, q) => sum + q.costBreakdown.totalLaborHours, 0);
  const totalFilamentKg = (quotes.reduce((sum, q) => sum + q.costBreakdown.totalMaterialGrams * q.quantity, 0) / 1000).toFixed(2);

  // Fleet Investment & Recovery
  const totalFleetInvestmentCLP = printers.reduce((sum, p) => sum + p.totalInvestmentCLP, 0);
  const accumulatedRecoveryCLP = printers.reduce((sum, p) => sum + p.accumulatedRecoveryCLP, 0);
  const pendingInvestmentCLP = Math.max(0, totalFleetInvestmentCLP - accumulatedRecoveryCLP);
  const recoveryPercent = totalFleetInvestmentCLP > 0 
    ? Math.round((accumulatedRecoveryCLP / totalFleetInvestmentCLP) * 100) 
    : 0;

  // ROI: Profit / Investment
  const fleetROI = totalFleetInvestmentCLP > 0
    ? ((totalProfitCLP / totalFleetInvestmentCLP) * 100).toFixed(1)
    : '0';

  // Payback Estimation
  const monthlyProfitEstimate = Math.max(1, totalProfitCLP || 350000);
  const paybackMonthsRemaining = Math.max(0, Number((pendingInvestmentCLP / monthlyProfitEstimate).toFixed(1)));

  // Break-even Analysis (Punto de Equilibrio mensual)
  // Fixed costs = Monthly target salary ($1.000.000) + Fixed Overheads ($120.000) = $1.120.000
  const monthlyFixedCostsCLP = settings.monthlyTargetSalaryCLP + settings.monthlyOverheadCLP;
  // Average gross margin percent
  const avgMarginRatio = totalSalesNetCLP > 0 
    ? (totalProfitCLP / totalSalesNetCLP) 
    : 0.35;
  
  // Break-even revenue: Fixed Costs / Margin Ratio
  const breakEvenRevenueCLP = Math.round(monthlyFixedCostsCLP / Math.max(0.1, avgMarginRatio));
  
  // Average ticket
  const avgTicketCLP = quotes.length > 0 ? totalSalesNetCLP / quotes.length : 35000;
  const breakEvenOrdersCount = Math.ceil(breakEvenRevenueCLP / Math.max(1000, avgTicketCLP));

  // Value of Current Inventory
  const totalInventoryValueCLP = materials.reduce(
    (sum, m) => sum + (m.stockGrams * m.costPerGramCLP),
    0
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Panel de Rentabilidad & Negocio
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Retorno de inversión (ROI), período de recuperación (Payback), punto de equilibrio y horas de producción
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSimulator}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Simulador de Impresoras</span>
          </button>

          <button
            onClick={onNewQuoteClick}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            + Nueva Cotización
          </button>
        </div>
      </div>

      {/* Top 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Net Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Ventas Registradas</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 font-mono tabular-nums">
            {formatMoney(totalSalesNetCLP, settings)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {taxLabelOf(settings)} incluido estimado: {formatMoney(totalIVACollectedCLP, settings)}
          </div>
        </div>

        {/* Real Costs */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Costos Reales de Taller</span>
            <Layers className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 font-mono tabular-nums">
            {formatMoney(totalCostsCLP, settings)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Material, electricidad y depreciación
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Utilidad Neta Taller</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-700 font-mono tabular-nums">
            {formatMoney(totalProfitCLP, settings)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">
            Margen promedio: {(avgMarginRatio * 100).toFixed(0)}%
          </div>
        </div>

        {/* Machine Hours */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Horas Máquina Ocupadas</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 font-mono tabular-nums">
            {totalMachineHours} hrs
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Mano de obra: {totalLaborHours} hrs
          </div>
        </div>

      </div>

      {/* Break-Even & Payback Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Punto de Equilibrio (Break-Even Point) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Punto de Equilibrio Mensual (Break-Even)
              </h2>
            </div>
            <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
              Sueldo + Gastos
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Calculado con tu valor diario promedio de <strong>{formatMoney(Math.round(settings.monthlyTargetSalaryCLP / 30), settings)}/día</strong> (sueldo objetivo {formatMoney(settings.monthlyTargetSalaryCLP, settings)} / 30) y gastos fijos de taller de <strong>{formatMoney(settings.monthlyOverheadCLP, settings)}</strong>:
          </p>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Ventas Mínimas Necesarias</span>
              <div className="text-base font-bold font-mono text-slate-900 mt-1">
                {formatMoney(breakEvenRevenueCLP, settings)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Ingreso neto mensual mínimo</div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Pedidos Estimados al Mes</span>
              <div className="text-base font-bold font-mono text-slate-900 mt-1">
                ~{breakEvenOrdersCount} pedidos
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Ticket prom. {formatMoney(Math.round(avgTicketCLP), settings)}</div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-900">
            Al superar los <strong>{formatMoney(breakEvenRevenueCLP, settings)}</strong> mensuales, todo monto adicional es ganancia neta por sobre tu remuneración objetivo.
          </div>
        </div>

        {/* ROI & Payback Fleet Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Recuperación de Inversión (ROI & Payback)
              </h2>
            </div>
            <span className="text-xs font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">
              {recoveryPercent}% Recuperado
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Inversión Flota</span>
              <div className="font-bold font-mono text-slate-800 mt-1">
                {formatMoney(totalFleetInvestmentCLP, settings)}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Recuperado</span>
              <div className="font-bold font-mono text-emerald-700 mt-1">
                {formatMoney(accumulatedRecoveryCLP, settings)}
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Saldo Pendiente</span>
              <div className="font-bold font-mono text-slate-700 mt-1">
                {formatMoney(pendingInvestmentCLP, settings)}
              </div>
            </div>
          </div>

          {/* Recovery progress bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-purple-600 h-full transition-all duration-300" 
              style={{ width: `${recoveryPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <span>Recuperación estimada (Payback):</span>
            <span className="font-bold font-mono text-slate-900">
              {paybackMonthsRemaining > 0 ? `~${paybackMonthsRemaining} meses restantes` : 'Flota 100% amortizada'}
            </span>
          </div>
        </div>

      </div>

      {/* Fleet Profitability & Materials Footprint */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Printers Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Estado de Impresoras y Horas Acumuladas
          </h2>

          <div className="divide-y divide-slate-100 text-xs">
            {printers.map((p) => {
              const printerRecoveryPct = Math.min(100, Math.round((p.accumulatedRecoveryCLP / p.totalInvestmentCLP) * 100));
              return (
                <div key={p.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {p.totalHoursPrinted} hrs impresas · {p.averageWatts}W consumo
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-bold text-slate-800">{printerRecoveryPct}% amortizada</div>
                    <div className="text-[10px] text-slate-400">
                      {formatMoney(p.accumulatedRecoveryCLP, settings)} / {formatMoney(p.totalInvestmentCLP, settings)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Materials Consumed & Inventory Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Inventario & Huella de Filamento
            </h2>
            <span className="text-xs font-mono font-bold text-slate-800">
              Valor: {formatMoney(Math.round(totalInventoryValueCLP), settings)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Consumido</span>
              <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                {totalFilamentKg} kg
              </div>
              <div className="text-[10px] text-slate-500">Filamento procesado en cotizaciones</div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Stock en Taller</span>
              <div className="text-lg font-bold font-mono text-emerald-700 mt-0.5">
                {(materials.reduce((s, m) => s + m.stockGrams, 0) / 1000).toFixed(1)} kg
              </div>
              <div className="text-[10px] text-slate-500">{materials.length} bobinas activas</div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 pt-1">
            Cada orden de trabajo descuenta automáticamente los gramos reales consumidos (incluyendo soportes y purgas) del stock del taller.
          </p>
        </div>

      </div>

    </div>
  );
};
