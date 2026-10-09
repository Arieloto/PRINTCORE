import React from 'react';
import { 
  Calculator, 
  FileText, 
  Layers, 
  Users, 
  Package, 
  Cpu, 
  TrendingUp, 
  Sliders, 
  Plus
} from 'lucide-react';
import { LiveClock } from './LiveClock';
import { StorageMode } from '../../services/storage';

export type ActiveTab = 
  | 'checklist_quote'
  | 'quotes'
  | 'work_orders'
  | 'inventory'
  | 'printers'
  | 'customers'
  | 'analytics'
  | 'simulator'
  | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onNewQuoteClick: () => void;
  pendingQuotesCount: number;
  activeOrdersCount: number;
  /** Whether data is syncing to the SQLite server or staying local. */
  storageMode: StorageMode;
  /** Locale from the workshop settings, used to format the clock. */
  locale?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onNewQuoteClick,
  pendingQuotesCount,
  activeOrdersCount,
  storageMode,
  locale
}) => {
  return (
    <header className="app-navbar bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar Contract: 3 zones */}
        <div className="flex items-center justify-between h-16">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('analytics')}
              className="text-left group flex items-center gap-2.5 focus:outline-none"
            >
              <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <span className="text-emerald-400 font-bold text-[11px]">3D</span>
                <img
                  src={`${import.meta.env.BASE_URL}icon.png`}
                  alt=""
                  aria-hidden="true"
                  onError={(event) => event.currentTarget.remove()}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  PrintCore 3D
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Primary navigation links */}
          <nav className="hidden lg:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('checklist_quote')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'checklist_quote'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Costeo Inteligente</span>
            </button>

            <button
              onClick={() => setActiveTab('quotes')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'quotes'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Cotizaciones</span>
              {pendingQuotesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] rounded font-mono">
                  {pendingQuotesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('work_orders')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'work_orders'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Taller & OT</span>
              {activeOrdersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] rounded font-mono">
                  {activeOrdersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Materiales</span>
            </button>

            <button
              onClick={() => setActiveTab('printers')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'printers'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Flota Impresoras</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'customers'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Clientes</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Rentabilidad</span>
            </button>

          </nav>

          {/* Zone 3: Clock, sync status, Primary Action & Settings */}
          <div className="flex items-center gap-2">
            <LiveClock className="hidden lg:inline text-[11px] text-slate-400" locale={locale} />

            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold border ${
                storageMode === 'server'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
              title={
                storageMode === 'server'
                  ? 'Conectado al servidor: tus datos están centralizados y se ven en todos tus navegadores'
                  : 'Sin conexión al servidor: los datos se guardan solo en este navegador'
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  storageMode === 'server' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {storageMode === 'server' ? 'Servidor' : 'Local'}
            </span>

            <button
              onClick={() => setActiveTab('settings')}
              className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
                activeTab === 'settings' ? 'text-emerald-400 bg-slate-800' : ''
              }`}
              title="Configuración de Costos y Taller"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button
              onClick={onNewQuoteClick}
              className="px-3 py-2 text-xs font-medium text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Nueva Cotización</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile secondary navigation strip */}
      <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-2 py-1.5 overflow-x-auto flex gap-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('checklist_quote')}
          className={`px-2.5 py-1 text-xs rounded whitespace-nowrap ${
            activeTab === 'checklist_quote' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-slate-400'
          }`}
        >
          Costeo
        </button>
        <button
          onClick={() => setActiveTab('quotes')}
          className={`px-2.5 py-1 text-xs rounded whitespace-nowrap ${
            activeTab === 'quotes' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-slate-400'
          }`}
        >
          Cotizaciones ({pendingQuotesCount})
        </button>
        <button
          onClick={() => setActiveTab('work_orders')}
          className={`px-2.5 py-1 text-xs rounded whitespace-nowrap ${
            activeTab === 'work_orders' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-slate-400'
          }`}
        >
          Taller ({activeOrdersCount})
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-2.5 py-1 text-xs rounded whitespace-nowrap ${
            activeTab === 'inventory' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-slate-400'
          }`}
        >
          Materiales
        </button>
        <button
          onClick={() => setActiveTab('printers')}
          className={`px-2.5 py-1 text-xs rounded whitespace-nowrap ${
            activeTab === 'printers' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-slate-400'
          }`}
        >
          Impresoras
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-2.5 py-1 text-xs rounded whitespace-nowrap ${
            activeTab === 'customers' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-slate-400'
          }`}
        >
          Clientes
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-2.5 py-1 text-xs rounded whitespace-nowrap ${
            activeTab === 'analytics' ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'text-slate-400'
          }`}
        >
          Rentabilidad
        </button>
      </div>
    </header>
  );
};
